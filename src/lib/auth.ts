import { cookies } from 'next/headers';
import prisma from './prisma';

// Re-export everything from auth-edge for backward compatibility
export { createToken, verifyToken, getTokenFromRequest, COOKIE_NAME } from './auth-edge';
export type { TokenPayload } from './auth-edge';

import { COOKIE_NAME } from './auth-edge';
import { verifyToken } from './auth-edge';

const COOKIE = COOKIE_NAME;

export async function setAuthCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function removeAuthCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getCurrentUser() {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { company: true },
    });

    return user;
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
}
