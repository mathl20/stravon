export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Ctx = { params: Promise<{ token: string }> };

// GET - Public: fetch intervention data for signature page
export async function GET(_: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

    const intervention = await prisma.intervention.findUnique({
      where: { signatureToken: token },
      include: {
        client: { select: { firstName: true, lastName: true, address: true, city: true, postalCode: true } },
        company: { select: { name: true, email: true, phone: true, address: true, city: true, postalCode: true, logoUrl: true } },
        items: true,
        materiels: true,
      },
    });

    if (!intervention) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    if ((intervention as any).signatureTokenExpiresAt && new Date((intervention as any).signatureTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 });
    }

    if (intervention.signatureClient) {
      return NextResponse.json({ error: 'already_signed', signed: true, signedAt: intervention.signedAt }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        id: intervention.id,
        reference: intervention.reference,
        title: intervention.title,
        description: intervention.description,
        address: intervention.address,
        date: intervention.date,
        status: intervention.status,
        amountHT: intervention.amountHT,
        tvaRate: intervention.tvaRate,
        amountTTC: intervention.amountTTC,
        client: intervention.client,
        company: intervention.company,
        items: intervention.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
        materiels: (intervention.materiels || []).map((m: any) => ({ nom: m.nom, quantite: m.quantite })),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Public: submit signature
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

    const intervention = await prisma.intervention.findUnique({
      where: { signatureToken: token },
    });

    if (!intervention) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    if ((intervention as any).signatureTokenExpiresAt && new Date((intervention as any).signatureTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 });
    }

    if (intervention.signatureClient) {
      return NextResponse.json({ error: 'Cette intervention est déjà signée' }, { status: 400 });
    }

    const { signatureClient } = await request.json();
    if (!signatureClient || typeof signatureClient !== 'string' || !signatureClient.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
    }

    await prisma.intervention.update({
      where: { id: intervention.id },
      data: {
        signatureClient,
        signedAt: new Date(),
        signatureToken: null, // Invalidate token after signature
      },
    });

    return NextResponse.json({ message: 'Signature enregistrée avec succès' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}