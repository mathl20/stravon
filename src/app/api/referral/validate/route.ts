export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const code = new URL(request.url).searchParams.get('code');
    if (!code) return NextResponse.json({ valid: false });

    const user = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { firstName: true },
    });

    if (!user) return NextResponse.json({ valid: false });

    return NextResponse.json({ valid: true, referrerName: user.firstName });
  } catch {
    return NextResponse.json({ valid: false });
  }
}