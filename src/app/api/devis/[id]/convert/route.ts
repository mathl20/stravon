import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canConvertDevis, getEffectivePermissions } from '@/lib/permissions';
import { generateReference } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    if (!canConvertDevis(perms)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const devis = await prisma.devis.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true },
    });
    if (!devis) return NextResponse.json({ error: 'Devis non trouve' }, { status: 404 });

    if (devis.status !== 'ACCEPTE') {
      return NextResponse.json({ error: 'Seul un devis accepte peut etre converti' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const intervention = await tx.intervention.create({
        data: {
          reference: generateReference(),
          title: devis.title,
          description: devis.description,
          date: devis.date,
          status: 'PENDING',
          amountHT: devis.amountHT,
          tvaRate: devis.tvaRate,
          amountTTC: devis.amountTTC,
          notes: devis.notes,
          clientId: devis.clientId,
          createdById: user.id,
          companyId: user.companyId,
          devisId: devis.id,
          items: {
            create: devis.items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.total,
            })),
          },
        },
      });

      await tx.devis.update({ where: { id }, data: { status: 'FACTURE' } });
      return intervention;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la conversion' }, { status: 500 });
  }
}
