export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';
import { resetPasswordTemplate } from '@/lib/email-templates';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfterMs } = await rateLimit(`forgot-pwd:${ip}`, 3, 15 * 60 * 1000); // 3 per 15 min
    if (!allowed) {
      return NextResponse.json(
        { error: `Trop de demandes. Réessayez dans ${Math.ceil(retryAfterMs / 60000)} minutes.` },
        { status: 429 }
      );
    }

    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
    }

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const emailContent = resetPasswordTemplate(rawToken, user.firstName);
    await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html });

    return NextResponse.json({ message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}