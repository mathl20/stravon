export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { removeAmbassadorCookie } from '@/lib/ambassador-auth';

export async function POST() {
  await removeAmbassadorCookie();
  return NextResponse.json({ message: 'Déconnecté' });
}
