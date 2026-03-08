import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageClients, getEffectivePermissions } from '@/lib/permissions';

export async function GET(_: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageClients(perms)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const clients = await prisma.client.findMany({
      where: { companyId: user.companyId },
      include: { _count: { select: { interventions: true } } },
      orderBy: { lastName: 'asc' },
    });

    const header = 'Prénom;Nom;Email;Téléphone;Adresse;Code postal;Ville;Nb interventions;Notes';
    const rows = clients.map((c: any) => [
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      c.email || '',
      c.phone || '',
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.postalCode || '',
      c.city || '',
      c._count.interventions,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ].join(';'));

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clients_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
