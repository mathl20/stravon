export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

// GET — get ticket details (admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Admin get ticket error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH — update ticket status/priority (admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const data: any = {};
    if (body.status) data.status = body.status;
    if (body.priority) data.priority = body.priority;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data,
    });

    // Notify user of status change
    if (body.status) {
      const statusLabels: Record<string, string> = {
        open: 'ouvert',
        in_progress: 'en cours de traitement',
        resolved: 'resolu',
        closed: 'ferme',
      };
      await createNotification(
        'SUPPORT',
        `Votre ticket "${ticket.subject}" est maintenant ${statusLabels[body.status] || body.status}.`,
        `/support/${ticket.id}`,
        ticket.userId,
        ticket.companyId
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Admin update ticket error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — admin reply to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });

    const message = await prisma.supportMessage.create({
      data: {
        content: content.trim(),
        isAdmin: true,
        authorName: 'Support STRAVON',
        ticketId: id,
      },
    });

    // Move to in_progress if still open
    if (ticket.status === 'open') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'in_progress' },
      });
    }

    // Notify user
    await createNotification(
      'SUPPORT',
      `Nouvelle reponse sur votre ticket "${ticket.subject}".`,
      `/support/${ticket.id}`,
      ticket.userId,
      ticket.companyId
    );

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Admin reply error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
