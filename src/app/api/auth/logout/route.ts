export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { removeAuthCookie, revokeAllRefreshTokens, getCurrentUser } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await revokeAllRefreshTokens(user.id);
  }
  await removeAuthCookie();
  return NextResponse.json({ message: 'Déconnexion réussie' });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (user) {
    await revokeAllRefreshTokens(user.id);
  }
  await removeAuthCookie();
  return NextResponse.redirect(new URL('/login', request.url));
}
