export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET — get a single ticket with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { id } = await params;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Get ticket error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
