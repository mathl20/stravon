export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, formatCurrency } from '@/lib/utils';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const where: Record<string, unknown> = {
      companyId: user.companyId,
      ...(!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) && { createdById: user.id }),
    };

    const interventions = await prisma.intervention.findMany({
      where: where as any,
      include: { client: true, createdBy: { select: { firstName: true, lastName: true } } } as any,
      orderBy: { date: 'desc' },
    });

    const header = 'Référence;Titre;Client;Date;Statut;Montant HT;TVA;Montant TTC;Technicien;Notes';
    const rows = interventions.map((inv: any) => {
      const statusLabel = { PENDING: 'En attente', INVOICED: 'Facturé', PAID: 'Payé' }[inv.status as string] || inv.status;
      return [
        inv.reference,
        `"${(inv.title || '').replace(/"/g, '""')}"`,
        `"${inv.client.firstName} ${inv.client.lastName}"`,
        formatDate(inv.date),
        statusLabel,
        formatCurrency(inv.amountHT),
        `${inv.tvaRate}%`,
        formatCurrency(inv.amountTTC),
        `"${inv.createdBy.firstName} ${inv.createdBy.lastName}"`,
        `"${(inv.notes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="interventions_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}