import crypto from 'crypto';
import { cookies } from 'next/headers';
import prisma from './prisma';

// Re-export everything from auth-edge for backward compatibility
export { createToken, verifyToken, getTokenFromRequest, COOKIE_NAME, REFRESH_COOKIE_NAME } from './auth-edge';
export type { TokenPayload } from './auth-edge';

import { COOKIE_NAME, REFRESH_COOKIE_NAME } from './auth-edge';
import { verifyToken, createToken } from './auth-edge';
import type { TokenPayload } from './auth-edge';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export async function setAuthCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes (matches JWT expiry)
    path: '/',
  });
}

export async function setRefreshCookie(refreshToken: string): Promise<void> {
  const jar = await cookies();
  jar.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRY_DAYS, // 30 days
    path: '/',
  });
}

export async function removeAuthCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  jar.delete(REFRESH_COOKIE_NAME);
}

/**
 * Generate a cryptographically secure refresh token, store it in DB.
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.refreshToken.create({
    data: {
      token: hashedToken,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return token;
}

/**
 * Validate refresh token and issue new access + refresh tokens (rotation).
 */
export async function rotateRefreshToken(rawToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const existing = await prisma.refreshToken.findUnique({
    where: { token: hashedToken },
    include: { user: { include: { company: true } } },
  });

  if (!existing || existing.revoked || existing.expiresAt < new Date()) {
    // If the token was already used (revoked), it might be a stolen token — revoke all for this user
    if (existing?.revoked) {
      await prisma.refreshToken.updateMany({
        where: { userId: existing.userId },
        data: { revoked: true },
      });
    }
    return null;
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revoked: true },
  });

  const user = existing.user;
  const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role, companyId: user.companyId };
  const accessToken = await createToken(payload);
  const newRefreshToken = await createRefreshToken(user.id);

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Revoke all refresh tokens for a user (logout everywhere).
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

export async function getCurrentUser() {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
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
