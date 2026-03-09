export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';
import { verifyEmailTemplate } from '@/lib/email-templates';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfterMs } = await rateLimit(`resend-verify:${ip}`, 3, 5 * 60 * 1000); // 3 per 5 min
    if (!allowed) {
      return NextResponse.json(
        { error: `Trop de demandes. Réessayez dans ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

    // Support both authenticated (from dashboard banner) and unauthenticated (from login page) requests
    let email: string | undefined;
    try {
      const body = await request.json();
      email = body.email;
    } catch {
      // empty body — try auth
    }

    if (!email) {
      const currentUser = await getCurrentUser();
      if (currentUser) email = currentUser.email;
    }

    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({ message: 'Si un compte existe avec cet email, un nouveau lien a été envoyé.' });
    }

    // Generate new token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: hashedToken,
        emailVerifyTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const emailContent = verifyEmailTemplate(rawToken, user.firstName);
    await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html });

    return NextResponse.json({ message: 'Si un compte existe avec cet email, un nouveau lien a été envoyé.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}