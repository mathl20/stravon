export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: hashedToken },
    });

    if (!user) {
      return NextResponse.json({ error: 'Lien de vérification invalide ou déjà utilisé' }, { status: 400 });
    }

    if (user.emailVerifyTokenExpiresAt && new Date(user.emailVerifyTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré. Demandez un nouvel email de vérification.' }, { status: 410 });
    }

    // Mark email as verified and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiresAt: null,
      },
    });

    // Auto-login: create session
    const sessionToken = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
    await setAuthCookie(sessionToken);

    return NextResponse.json({ message: 'Email vérifié avec succès', verified: true });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Erreur de vérification' }, { status: 500 });
  }
}