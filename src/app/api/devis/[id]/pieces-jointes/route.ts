import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

// GET - List attachments for a devis
export async function GET(_: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await ctx.params;
    const devis = await prisma.devis.findFirst({ where: { id, companyId: user.companyId } });
    if (!devis) return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });

    const pieces = await prisma.devisPieceJointe.findMany({
      where: { devisId: id },
      select: { id: true, nom: true, type: true, taille: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: pieces });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Add attachment to devis
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await ctx.params;
    const devis = await prisma.devis.findFirst({ where: { id, companyId: user.companyId } });
    if (!devis) return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });

    const body = await request.json();
    const { nom, type, data } = body;

    if (!nom || !type || !data) {
      return NextResponse.json({ error: 'Nom, type et données requis' }, { status: 400 });
    }

    // Validate file type
    const ALLOWED_TYPES = ['photo', 'plan', 'document'];
    if (!ALLOWED_TYPES.includes(String(type))) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 });
    }

    // Sanitize filename
    const sanitizedNom = String(nom).trim().replace(/[<>"'&]/g, '');

    // Limit: 2MB per file
    const sizeBytes = Math.round((data.length * 3) / 4);
    if (sizeBytes > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 2 Mo)' }, { status: 400 });
    }

    // Limit: 10 attachments per devis
    const count = await prisma.devisPieceJointe.count({ where: { devisId: id } });
    if (count >= 10) {
      return NextResponse.json({ error: 'Maximum 10 pièces jointes par devis' }, { status: 400 });
    }

    const piece = await prisma.devisPieceJointe.create({
      data: { nom: sanitizedNom, type: String(type), data, taille: sizeBytes, devisId: id },
      select: { id: true, nom: true, type: true, taille: true, createdAt: true },
    });

    return NextResponse.json({ data: piece }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Remove attachment
export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await ctx.params;
    const sp = new URL(request.url).searchParams;
    const pieceId = sp.get('pieceId');
    if (!pieceId) return NextResponse.json({ error: 'pieceId requis' }, { status: 400 });

    const devis = await prisma.devis.findFirst({ where: { id, companyId: user.companyId } });
    if (!devis) return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });

    const piece = await prisma.devisPieceJointe.findFirst({ where: { id: pieceId, devisId: id } });
    if (!piece) return NextResponse.json({ error: 'Pièce jointe non trouvée' }, { status: 404 });

    await prisma.devisPieceJointe.delete({ where: { id: pieceId } });

    return NextResponse.json({ message: 'Pièce jointe supprimée' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
