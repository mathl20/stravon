import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

  // Redirect to homepage with ref param — middleware will store in cookie and clean URL
  const redirectUrl = new URL('/', baseUrl);
  redirectUrl.searchParams.set('ref', code);

  return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
}
