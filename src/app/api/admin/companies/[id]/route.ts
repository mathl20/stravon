export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import prisma from '@/lib/prisma';

// DELETE — delete a company and all its data (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || !isAdmin(admin.email)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent deleting own company
    if (id === admin.companyId) {
      return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre entreprise' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });
    }

    // Cascade delete handles all related data (users, clients, devis, factures, interventions, etc.)
    await prisma.company.delete({ where: { id } });

    console.log(`[ADMIN] Company deleted: ${company.name} (${company.id}) by ${admin.email}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin delete company error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
