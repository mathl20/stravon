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

// Tier calculation — unified with parrainage system
export type AmbassadorTier = 'starter' | 'booster' | 'expert' | 'elite';

interface TierInfo {
  name: string;
  emoji: string;
  rate: number;
  min: number;
  max: number | null;
}

export const TIERS: Record<AmbassadorTier, TierInfo> = {
  starter: { name: 'Starter', emoji: '🌱', rate: 0.10, min: 0, max: 4 },
  booster: { name: 'Booster', emoji: '⚡', rate: 0.15, min: 5, max: 14 },
  expert: { name: 'Expert', emoji: '🔥', rate: 0.20, min: 15, max: 29 },
  elite: { name: 'Élite', emoji: '👑', rate: 0.25, min: 30, max: null },
};

export function getTierFromActiveCount(count: number): AmbassadorTier {
  if (count >= 30) return 'elite';
  if (count >= 15) return 'expert';
  if (count >= 5) return 'booster';
  return 'starter';
}

export function getCommissionRate(ambassador: { customCommissionRate: number | null; customTier: string | null }, activeReferrals: number): number {
  if (ambassador.customCommissionRate != null) return ambassador.customCommissionRate;
  const tier = (ambassador.customTier as AmbassadorTier) || getTierFromActiveCount(activeReferrals);
  return TIERS[tier]?.rate || 0.10;
}
