export const dynamic = 'force-dynamic';

import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAmbassadorToken, setAmbassadorCookie } from '@/lib/ambassador-auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const ambassador = await prisma.ambassador.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!ambassador) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, ambassador.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
    }

    const token = await createAmbassadorToken({
      ambassadorId: ambassador.id,
      email: ambassador.email,
    });
    await setAmbassadorCookie(token);

    return NextResponse.json({ message: 'Connexion réussie', redirect: '/ambassadeur/dashboard' });
  } catch (error) {
    console.error('Ambassador login error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
