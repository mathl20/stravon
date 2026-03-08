export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, formatCurrency, getFactureStatusLabel, getModePaiementLabel } from '@/lib/utils';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';

export async function GET(_: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const factures = await prisma.facture.findMany({
      where: { companyId: user.companyId } as any,
      include: { client: true, intervention: { select: { reference: true } } } as any,
      orderBy: { date: 'desc' },
    });

    const header = 'Numéro;Client;Date;Échéance;Statut;Montant HT;TVA;Montant TTC;Mode paiement;Date paiement;Intervention;Notes';
    const rows = factures.map((f: any) => [
      f.numero,
      `"${f.client.firstName} ${f.client.lastName}"`,
      formatDate(f.date),
      f.dateEcheance ? formatDate(f.dateEcheance) : '',
      getFactureStatusLabel(f.status),
      formatCurrency(f.amountHT),
      `${f.tvaRate}%`,
      formatCurrency(f.amountTTC),
      f.modePaiement ? getModePaiementLabel(f.modePaiement) : '',
      f.datePaiement ? formatDate(f.datePaiement) : '',
      f.intervention?.reference || '',
      `"${(f.notes || '').replace(/"/g, '""')}"`,
    ].join(';'));

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="factures_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}