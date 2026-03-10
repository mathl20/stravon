export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { registerSchema } from '@/lib/validations';
import { getDefaultPrestations } from '@/lib/prestations';
import { generateReferralCode } from '@/lib/referral';
import { sendEmail } from '@/lib/mailer';
import { verifyEmailTemplate } from '@/lib/email-templates';
import { createToken, setAuthCookie, createRefreshToken, setRefreshCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { firstName, lastName, email, password, companyName, metier, referralCode: refCode, affiliateCode: affCode, ambassadorCode: ambCode, siret, companyAddress, companyPostalCode, companyCity } = parsed.data;
    const selectedMetier = metier || 'multi-services';

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);

    // Generate a unique referral code for the new user
    let newReferralCode = generateReferralCode();
    for (let i = 0; i < 5; i++) {
      const codeExists = await prisma.user.findFirst({ where: { referralCode: newReferralCode } });
      if (!codeExists) break;
      newReferralCode = generateReferralCode();
    }

    // Generate email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Generate unique affiliate code for the new company
    const generateAffiliateCode = () => `AFF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    let newAffiliateCode = generateAffiliateCode();
    for (let i = 0; i < 5; i++) {
      const exists2 = await prisma.company.findFirst({ where: { affiliateCode: newAffiliateCode } });
      if (!exists2) break;
      newAffiliateCode = generateAffiliateCode();
    }

    // Resolve affiliate referrer
    let affiliateReferrerId: string | null = null;
    if (affCode) {
      const affiliateCompany = await prisma.company.findFirst({ where: { affiliateCode: affCode } });
      if (affiliateCompany) affiliateReferrerId = affiliateCompany.id;
    }

    // Resolve ambassador referrer
    let ambassadorReferrerId: string | null = null;
    if (ambCode) {
      const ambassador = await prisma.ambassador.findFirst({ where: { affiliateCode: ambCode } });
      if (ambassador) ambassadorReferrerId = ambassador.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: {
        name: companyName, email, metier: selectedMetier,
        affiliateCode: newAffiliateCode,
        ...(affiliateReferrerId ? { affiliateReferredById: affiliateReferrerId } : {}),
        ...(ambassadorReferrerId ? { ambassadorReferredById: ambassadorReferrerId } : {}),
        ...(siret ? { siret } : {}),
        ...(companyAddress ? { address: companyAddress } : {}),
        ...(companyPostalCode ? { postalCode: companyPostalCode } : {}),
        ...(companyCity ? { city: companyCity } : {}),
      } });
      const user = await tx.user.create({
        data: {
          firstName, lastName, email, passwordHash: hash, role: 'PATRON',
          companyId: company.id, referralCode: newReferralCode,
          emailVerified: false,
          emailVerifyToken: hashedToken,
          emailVerifyTokenExpiresAt: tokenExpiresAt,
        },
      });

      // Seed default prestations for the selected métier
      const defaults = getDefaultPrestations(selectedMetier);
      if (defaults.length > 0) {
        await tx.prestation.createMany({
          data: defaults.map((p) => ({
            label: p.label,
            category: p.category,
            hours: p.hours,
            metier: selectedMetier,
            companyId: company.id,
          })),
        });
      }

      // Handle referral: if a valid referral code was provided
      if (refCode) {
        const referrer = await tx.user.findFirst({ where: { referralCode: refCode } });
        if (referrer && referrer.id !== user.id && referrer.email !== email) {
          await tx.referral.create({
            data: { referrerUserId: referrer.id, referredUserId: user.id, status: 'PENDING' },
          });
        }
      }

      return { user, company };
    });

    // Send verification email (non-blocking — user can resend from dashboard)
    const emailContent = verifyEmailTemplate(rawToken, firstName);
    try {
      await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html });
    } catch (emailErr) {
      console.error('[REGISTER] Failed to send verification email to', email, emailErr);
    }

    // Auto-login: create session so user can proceed to plan selection
    const token = await createToken({ userId: result.user.id, email, role: 'PATRON', companyId: result.company.id });
    const refreshToken = await createRefreshToken(result.user.id);
    await setAuthCookie(token);
    await setRefreshCookie(refreshToken);

    return NextResponse.json({
      message: 'Compte créé.',
      redirect: '/choose-plan',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Register error:', error);
    const message = error?.code === 'P2002'
      ? 'Un compte avec ces informations existe déjà'
      : error?.message || 'Erreur lors de la création du compte';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}