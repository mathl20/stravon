export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET — list tickets for the current user's company
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const tickets = await prisma.supportTicket.findMany({
      where: { companyId: user.companyId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — create a new ticket
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const { subject, category, message } = await request.json();

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Sujet et message requis' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        subject: subject.trim(),
        category: category || 'general',
        userId: user.id,
        companyId: user.companyId,
        messages: {
          create: {
            content: message.trim(),
            isAdmin: false,
            authorName: `${user.firstName} ${user.lastName}`,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
