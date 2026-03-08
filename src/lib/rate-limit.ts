import { NextRequest } from 'next/server';
import prisma from './prisma';

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Database-backed rate limiter — persists across serverless invocations.
 * @param key - Unique key (e.g. "login:192.168.1.1")
 * @param maxAttempts - Maximum attempts allowed within the window
 * @param windowMs - Time window in milliseconds
 */
export async function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const now = new Date();

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    if (!existing || existing.expiresAt < now) {
      // Expired or doesn't exist — create/reset
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, expiresAt: new Date(Date.now() + windowMs) },
        update: { count: 1, expiresAt: new Date(Date.now() + windowMs) },
      });
      return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
    }

    // Increment count
    const updated = await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    if (updated.count > maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: existing.expiresAt.getTime() - Date.now(),
      };
    }

    return {
      allowed: true,
      remaining: maxAttempts - updated.count,
      retryAfterMs: 0,
    };
  } catch (error) {
    // If DB is down, allow the request (fail open) but log
    console.error('Rate limit DB error:', error);
    return { allowed: true, remaining: maxAttempts, retryAfterMs: 0 };
  }
}
