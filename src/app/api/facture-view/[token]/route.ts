export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Ctx = { params: Promise<{ token: string }> };

// GET - Public: fetch facture data for view page
export async function GET(_: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

    const facture = await prisma.facture.findUnique({
      where: { viewToken: token },
      include: {
        client: { select: { firstName: true, lastName: true, address: true, city: true, postalCode: true, email: true, phone: true } },
        company: { select: { name: true, email: true, phone: true, address: true, city: true, postalCode: true, logoUrl: true, primaryColor: true, siret: true, tvaIntra: true, formeJuridique: true, capitalSocial: true, rcs: true } },
        items: { select: { description: true, quantity: true, unitPrice: true, total: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!facture) {
      return NextResponse.json({ error: 'Lien invalide ou expire' }, { status: 404 });
    }

    if ((facture as any).viewTokenExpiresAt && new Date((facture as any).viewTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 });
    }

    return NextResponse.json({
      data: {
        id: facture.id,
        numero: facture.numero,
        date: facture.date,
        dateEcheance: facture.dateEcheance,
        status: facture.status,
        amountHT: facture.amountHT,
        tvaRate: facture.tvaRate,
        amountTTC: facture.amountTTC,
        conditionsPaiement: facture.conditionsPaiement,
        mentionsLegales: facture.mentionsLegales,
        notes: facture.notes,
        client: facture.client,
        company: facture.company,
        createdBy: facture.createdBy,
        items: facture.items,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}