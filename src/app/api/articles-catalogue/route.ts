import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

// GET - List articles catalog
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const sp = new URL(request.url).searchParams;
    const search = sp.get('search');
    const categorie = sp.get('categorie');

    const where: Record<string, unknown> = { companyId: user.companyId };
    if (categorie) where.categorie = categorie;
    if (search) {
      (where as any).OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const articles = await prisma.articleCatalogue.findMany({
      where: where as any,
      orderBy: [{ categorie: 'asc' }, { nom: 'asc' }],
      take: 200,
    });

    return NextResponse.json({ data: articles });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create article
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { nom, description, reference, categorie, unite, prixAchat, margePercent } = body;

    if (!nom || typeof nom !== 'string' || !nom.trim()) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }

    const pa = Number(prixAchat) || 0;
    const marge = Number(margePercent) || 0;
    const prixVente = Math.round(pa * (1 + marge / 100) * 100) / 100;

    const article = await prisma.articleCatalogue.create({
      data: {
        nom: String(nom).trim(),
        description: description ? String(description).trim() : null,
        reference: reference ? String(reference).trim() : null,
        categorie: categorie ? String(categorie).trim() : 'Général',
        unite: unite || 'pièce',
        prixAchat: pa,
        margePercent: marge,
        prixVente,
        companyId: user.companyId,
      },
    });

    return NextResponse.json({ data: article }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
