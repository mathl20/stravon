export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

// PUT - Update article
export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.articleCatalogue.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });

    const body = await request.json();
    const pa = body.prixAchat != null ? Number(body.prixAchat) : existing.prixAchat;
    const marge = body.margePercent != null ? Number(body.margePercent) : existing.margePercent;
    const prixVente = Math.round(pa * (1 + marge / 100) * 100) / 100;

    const article = await prisma.articleCatalogue.update({
      where: { id },
      data: {
        ...(body.nom != null && { nom: String(body.nom).trim() }),
        ...(body.description !== undefined && { description: body.description ? String(body.description).trim() : null }),
        ...(body.reference !== undefined && { reference: body.reference ? String(body.reference).trim() : null }),
        ...(body.categorie != null && { categorie: String(body.categorie).trim() }),
        ...(body.unite != null && { unite: body.unite }),
        prixAchat: pa,
        margePercent: marge,
        prixVente,
      },
    });

    return NextResponse.json({ data: article });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Delete article
export async function DELETE(_: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.articleCatalogue.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });

    await prisma.articleCatalogue.delete({ where: { id } });
    return NextResponse.json({ message: 'Article supprimé' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}