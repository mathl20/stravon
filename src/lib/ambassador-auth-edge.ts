import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
export const AMBASSADOR_COOKIE = 'stravon-ambassador';

export interface AmbassadorPayload {
  ambassadorId: string;
  email: string;
  type: 'ambassador';
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

export function getAmbassadorTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(AMBASSADOR_COOKIE)?.value ?? null;
}
