import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

if (!process.env.JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not set. Authentication will not work.');
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
export const COOKIE_NAME = 'stravon-session';
export const REFRESH_COOKIE_NAME = 'stravon-refresh';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId: string;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

export function getRefreshTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(REFRESH_COOKIE_NAME)?.value ?? null;
}
