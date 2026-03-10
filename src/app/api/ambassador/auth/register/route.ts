export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAmbassadorToken, setAmbassadorCookie } from '@/lib/ambassador-auth';

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, phone, password } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs obligatoires sont requis' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 });
    }

    // Check if email already used
    const existing = await prisma.ambassador.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Un compte ambassadeur existe déjà avec cet email' }, { status: 409 });
    }

    // Generate unique affiliate code
    const generateCode = () => `AMB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    let affiliateCode = generateCode();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.ambassador.findFirst({ where: { affiliateCode } });
      if (!exists) break;
      affiliateCode = generateCode();
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const ambassador = await prisma.ambassador.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: phone || null,
        passwordHash,
        affiliateCode,
      },
    });

    const token = await createAmbassadorToken({
      ambassadorId: ambassador.id,
      email: ambassador.email,
    });
    await setAmbassadorCookie(token);

    return NextResponse.json({ message: 'Compte créé', redirect: '/ambassadeur/dashboard' }, { status: 201 });
  } catch (error) {
    console.error('Ambassador register error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
