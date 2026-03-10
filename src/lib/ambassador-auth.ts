import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from './prisma';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
export const AMBASSADOR_COOKIE = 'stravon-ambassador';

export interface AmbassadorPayload {
  ambassadorId: string;
  email: string;
  type: 'ambassador';
}

export async function createAmbassadorToken(payload: Omit<AmbassadorPayload, 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'ambassador' } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyAmbassadorToken(token: string): Promise<AmbassadorPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if ((payload as any).type !== 'ambassador') return null;
    return payload as unknown as AmbassadorPayload;
  } catch {
    return null;
  }
}

export async function setAmbassadorCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(AMBASSADOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function removeAmbassadorCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(AMBASSADOR_COOKIE);
}

export async function getCurrentAmbassador() {
  try {
    const jar = await cookies();
    const token = jar.get(AMBASSADOR_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifyAmbassadorToken(token);
    if (!payload) return null;

    const ambassador = await prisma.ambassador.findUnique({
      where: { id: payload.ambassadorId },
    });

    return ambassador;
  } catch {
    return null;
  }
}

// Tier calculation
export type AmbassadorTier = 'bronze' | 'argent' | 'or' | 'diamant';

interface TierInfo {
  name: string;
  rate: number;
  min: number;
  max: number | null;
}

export const TIERS: Record<AmbassadorTier, TierInfo> = {
  bronze: { name: 'Bronze', rate: 0.15, min: 0, max: 9 },
  argent: { name: 'Argent', rate: 0.20, min: 10, max: 19 },
  or: { name: 'Or', rate: 0.25, min: 20, max: 49 },
  diamant: { name: 'Diamant', rate: 0.30, min: 50, max: null },
};

export function getTierFromActiveCount(count: number): AmbassadorTier {
  if (count >= 50) return 'diamant';
  if (count >= 20) return 'or';
  if (count >= 10) return 'argent';
  return 'bronze';
}

export function getCommissionRate(ambassador: { customCommissionRate: number | null; customTier: string | null }, activeReferrals: number): number {
  if (ambassador.customCommissionRate != null) return ambassador.customCommissionRate;
  const tier = (ambassador.customTier as AmbassadorTier) || getTierFromActiveCount(activeReferrals);
  return TIERS[tier]?.rate || 0.15;
}
