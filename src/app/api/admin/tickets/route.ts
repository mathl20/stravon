export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';

// GET — list all tickets (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        company: { select: { name: true } },
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' },
      ],
    });

    const counts = await prisma.supportTicket.groupBy({
      by: ['status'],
      _count: true,
    });

    return NextResponse.json({ tickets, counts });
  } catch (error) {
    console.error('Admin get tickets error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
