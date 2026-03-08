export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { removeAuthCookie } from '@/lib/auth';

export async function POST() {
  await removeAuthCookie();
  return NextResponse.json({ message: 'Déconnexion réussie' });
}

export async function GET(request: NextRequest) {
  await removeAuthCookie();
  return NextResponse.redirect(new URL('/login', request.url));
}