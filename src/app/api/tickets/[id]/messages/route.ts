export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST — add a message to a ticket (user side)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { id } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    // Verify ticket belongs to user's company
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });

    // Can't reply to closed tickets
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ce ticket est ferme' }, { status: 400 });
    }

    const message = await prisma.supportMessage.create({
      data: {
        content: content.trim(),
        isAdmin: false,
        authorName: `${user.firstName} ${user.lastName}`,
        ticketId: id,
      },
    });

    // Reopen if resolved
    if (ticket.status === 'resolved') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'open' },
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Add message error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
