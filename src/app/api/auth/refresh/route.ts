export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { rotateRefreshToken, setAuthCookie, setRefreshCookie, removeAuthCookie } from '@/lib/auth';
import { REFRESH_COOKIE_NAME } from '@/lib/auth-edge';

export async function POST(request: NextRequest) {
  const rawToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!rawToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    const result = await rotateRefreshToken(rawToken);

    if (!result) {
      // Invalid or stolen token — clear everything
      await removeAuthCookie();
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    await setAuthCookie(result.accessToken);
    await setRefreshCookie(result.refreshToken);

    return NextResponse.json({ message: 'Token refreshed' });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
