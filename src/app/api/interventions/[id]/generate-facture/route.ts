export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const { id } = await ctx.params;
    const intervention = await prisma.intervention.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true },
    });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvee' }, { status: 404 });

    if (intervention.status === 'PAID') {
      return NextResponse.json({ error: 'Cette intervention est deja payee' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate sequential facture number inside transaction
      const year = new Date().getFullYear();
      const prefix = `FAC-${year}-`;
      const lastFacture = await tx.facture.findFirst({
        where: { companyId: user.companyId, numero: { startsWith: prefix } },
        orderBy: { numero: 'desc' },
      });
      const lastNum = lastFacture ? parseInt(lastFacture.numero.split('-')[2]) : 0;
      const numero = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;

      const facture = await tx.facture.create({
        data: {
          numero,
          date: new Date(),
          amountHT: intervention.amountHT,
          tvaRate: intervention.tvaRate,
          amountTTC: intervention.amountTTC,
          notes: intervention.notes,
          clientId: intervention.clientId,
          interventionId: intervention.id,
          companyId: user.companyId,
          createdById: user.id,
          items: {
            create: intervention.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.total,
            })),
          },
        },
        include: { items: true, client: { select: { id: true, firstName: true, lastName: true } } },
      });

      await tx.intervention.update({ where: { id }, data: { status: 'INVOICED' } });
      return facture;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la generation de la facture' }, { status: 500 });
  }
}