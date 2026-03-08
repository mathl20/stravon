export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createToken, setAuthCookie, createRefreshToken, setRefreshCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfterMs } = await rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);

    if (!allowed) {
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfterSec / 60)} minutes.` },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email }, include: { company: true } });
    if (!user) return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });

    // Block login if email is not verified (skip for demo accounts)
    if (!user.emailVerified && !user.company.isDemo) {
      return NextResponse.json({
        error: 'Veuillez vérifier votre adresse email avant de vous connecter. Consultez votre boîte mail.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      }, { status: 403 });
    }

    const token = await createToken({ userId: user.id, email: user.email, role: user.role, companyId: user.companyId });
    const refreshToken = await createRefreshToken(user.id);
    await setAuthCookie(token);
    await setRefreshCookie(refreshToken);

    return NextResponse.json({ message: 'Connexion réussie' });
  } catch (error: any) {
    console.error('Login error:', error);
    const message = error?.name === 'PrismaClientInitializationError'
      ? 'Base de données inaccessible. Vérifiez DATABASE_URL.'
      : error?.message || 'Erreur de connexion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}