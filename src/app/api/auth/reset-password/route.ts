import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: { passwordResetToken: hashedToken },
    });

    if (!user) {
      return NextResponse.json({ error: 'Lien de réinitialisation invalide ou déjà utilisé' }, { status: 400 });
    }

    if (user.passwordResetTokenExpiresAt && new Date(user.passwordResetTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré. Demandez un nouveau lien de réinitialisation.' }, { status: 410 });
    }

    const hash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
