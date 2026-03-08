export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';
import { formatCurrency } from '@/lib/utils';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const company = await prisma.company.findUnique({ where: { id: user.companyId } });
    if (!company || !(company as any).devisRelancesActive) {
      return NextResponse.json({ message: 'Relances devis désactivées', count: 0 });
    }

    const relancesJours = ((company as any).devisRelancesJours as number[]) || [3, 7, 14];
    const now = new Date();

    // Get all sent devis (ENVOYE status)
    const devisEnvoyes = await prisma.devis.findMany({
      where: {
        companyId: user.companyId,
        status: 'ENVOYE',
      },
      include: {
        client: true,
        relances: true,
      } as any,
    });

    let newRelances = 0;

    for (const devis of devisEnvoyes as any[]) {
      const dateEnvoi = new Date(devis.date);
      const joursDepuisEnvoi = Math.floor((now.getTime() - dateEnvoi.getTime()) / (1000 * 60 * 60 * 24));
      const existingRelances = (devis.relances || []) as any[];

      for (let i = 0; i < relancesJours.length; i++) {
        const seuil = relancesJours[i];
        const numero = i + 1;

        if (joursDepuisEnvoi >= seuil && !existingRelances.some((r: any) => r.numero === numero)) {
          await (prisma as any).relanceDevis.create({
            data: {
              numero,
              devisId: devis.id,
              companyId: user.companyId,
            },
          });

          // Notify PATRON and SECRETAIRE users
          const managers = await prisma.user.findMany({
            where: { companyId: user.companyId, role: { in: ['PATRON', 'SECRETAIRE'] } },
          });

          const clientName = `${devis.client.firstName} ${devis.client.lastName}`;
          const message = `Relance n°${numero} — Devis ${devis.reference} envoyé il y a ${joursDepuisEnvoi} jours — ${clientName} — ${formatCurrency(devis.amountTTC)}`;

          for (const manager of managers) {
            await createNotification(
              'RELANCE_DEVIS',
              message,
              `/devis/${devis.id}`,
              manager.id,
              user.companyId
            );
          }

          newRelances++;
        }
      }
    }

    return NextResponse.json({
      message: newRelances > 0
        ? `${newRelances} relance${newRelances > 1 ? 's' : ''} devis envoyée${newRelances > 1 ? 's' : ''}`
        : 'Aucune nouvelle relance devis à envoyer',
      count: newRelances,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}