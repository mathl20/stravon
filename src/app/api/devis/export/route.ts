import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, formatCurrency, getDevisStatusLabel } from '@/lib/utils';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(_: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const where: Record<string, unknown> = {
      companyId: user.companyId,
      ...(!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE) && { createdById: user.id }),
    };

    const devisList = await prisma.devis.findMany({
      where: where as any,
      include: { client: true, createdBy: { select: { firstName: true, lastName: true } } } as any,
      orderBy: { date: 'desc' },
    });

    const header = 'Référence;Titre;Client;Date;Expiration;Statut;Montant HT;TVA;Montant TTC;Créé par;Notes';
    const rows = devisList.map((d: any) => [
      d.reference,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${d.client.firstName} ${d.client.lastName}"`,
      formatDate(d.date),
      d.dateExpiration ? formatDate(d.dateExpiration) : '',
      getDevisStatusLabel(d.status),
      formatCurrency(d.amountHT),
      `${d.tvaRate}%`,
      formatCurrency(d.amountTTC),
      `"${d.createdBy.firstName} ${d.createdBy.lastName}"`,
      `"${(d.notes || '').replace(/"/g, '""')}"`,
    ].join(';'));

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="devis_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
