import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateTTC } from '@/lib/utils';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const { id } = await params;
    const facture = await prisma.facture.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true },
    });
    if (!facture) return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });

    if (facture.status === 'ANNULEE') {
      return NextResponse.json({ error: 'Cette facture est deja annulee' }, { status: 400 });
    }

    // Create credit note (avoir) as a new facture with negative amounts
    const avoir = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const prefix = `AVO-${year}-`;
      const lastAvoir = await tx.facture.findFirst({
        where: { companyId: user.companyId, numero: { startsWith: prefix } },
        orderBy: { numero: 'desc' },
      });
      const lastNum = lastAvoir ? parseInt(lastAvoir.numero.split('-')[2]) : 0;
      const numero = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;

      const creditNote = await tx.facture.create({
        data: {
          numero,
          date: new Date(),
          amountHT: -facture.amountHT,
          tvaRate: facture.tvaRate,
          amountTTC: -facture.amountTTC,
          conditionsPaiement: facture.conditionsPaiement,
          mentionsLegales: `Avoir sur facture ${facture.numero}`,
          notes: `Avoir annulant la facture ${facture.numero}`,
          factureAvoirId: facture.id,
          clientId: facture.clientId,
          interventionId: facture.interventionId,
          companyId: user.companyId,
          createdById: user.id,
          status: 'PAYEE',
          items: {
            create: facture.items.map((i) => ({
              description: `[AVOIR] ${i.description}`,
              quantity: i.quantity,
              unitPrice: -i.unitPrice,
              total: -i.total,
            })),
          },
        },
        include: { items: true, client: { select: { id: true, firstName: true, lastName: true } } },
      });

      // Mark original invoice as cancelled
      await tx.facture.update({
        where: { id },
        data: { status: 'ANNULEE' },
      });

      return creditNote;
    });

    return NextResponse.json({ data: avoir }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la creation de l\'avoir' }, { status: 500 });
  }
}
