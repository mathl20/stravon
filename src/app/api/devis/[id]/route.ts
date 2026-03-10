export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { devisSchema } from '@/lib/validations';
import { calculateTTC } from '@/lib/utils';
import { canDeleteDevis, getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const { id } = await ctx.params;
    const devis = await prisma.devis.findFirst({
      where: { id, companyId: user.companyId, ...(!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE) && { createdById: user.id }) },
      include: {
        items: true,
        client: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        company: true,
        relances: { orderBy: { date: 'asc' } },
        facture: { select: { id: true, numero: true } },
      } as any,
    });
    if (!devis) return NextResponse.json({ error: 'Devis non trouve' }, { status: 404 });

    return NextResponse.json({ data: devis });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const { id } = await ctx.params;
    const existing = await prisma.devis.findFirst({ where: { id, companyId: user.companyId } });
    if (!existing) return NextResponse.json({ error: 'Devis non trouve' }, { status: 404 });

    if (!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE) && existing.createdById !== user.id) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const body = await request.json();

    // Quick status update
    if (body.status && Object.keys(body).length === 1) {
      const updated = await prisma.devis.update({ where: { id }, data: { status: body.status } });
      return NextResponse.json({ data: updated });
    }

    const parsed = devisSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { title, description, date, dateExpiration, clientId, status, tvaRate: tva, notes, conditionsParticulieres, adresseChantier, villeChantier, cpChantier, conditionsPaiement, acomptePercent, delaiTravaux, items } = parsed.data;
    const tvaRate = tva ?? 20;
    const amountHT = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const amountTTC = calculateTTC(amountHT, tvaRate);

    await prisma.devisItem.deleteMany({ where: { devisId: id } });

    const devis = await prisma.devis.update({
      where: { id },
      data: {
        title,
        description: description || null,
        date: new Date(date),
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        status: (status as any) || existing.status,
        amountHT,
        tvaRate,
        amountTTC,
        notes: notes || null,
        conditionsParticulieres: conditionsParticulieres || null,
        adresseChantier: adresseChantier || null,
        villeChantier: villeChantier || null,
        cpChantier: cpChantier || null,
        conditionsPaiement: conditionsPaiement || null,
        acomptePercent: acomptePercent ?? null,
        delaiTravaux: delaiTravaux || null,
        clientId,
        items: {
          create: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: Math.round(i.quantity * i.unitPrice * 100) / 100,
            type: i.type || 'prestation',
            ...(i.prixAchat != null ? { prixAchat: i.prixAchat } : {}),
            ...(i.coefMarge != null ? { coefMarge: i.coefMarge } : {}),
          })),
        },
      },
      include: { items: true, client: { select: { id: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json({ data: devis });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);

    const { id } = await ctx.params;
    const devis = await prisma.devis.findFirst({ where: { id, companyId: user.companyId } });
    if (!devis) return NextResponse.json({ error: 'Devis non trouve' }, { status: 404 });

    if (!canDeleteDevis(perms, devis.createdById === user.id)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    await prisma.devis.delete({ where: { id } });
    return NextResponse.json({ message: 'Devis supprime' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}