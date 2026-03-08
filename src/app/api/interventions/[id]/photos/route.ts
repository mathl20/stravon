import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { interventionPhotoSchema } from '@/lib/validations';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await ctx.params;
    const intervention = await prisma.intervention.findFirst({
      where: { id, companyId: user.companyId },
      include: { _count: { select: { photos: true } } },
    });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    if (user.role === 'EMPLOYE' && intervention.createdById !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (intervention._count.photos >= 5) {
      return NextResponse.json({ error: 'Maximum 5 photos par intervention' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = interventionPhotoSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    // Validate MIME type (must be a valid image)
    const dataUri = parsed.data.data;
    if (!dataUri.match(/^data:image\/(png|jpe?g|webp);base64,/)) {
      return NextResponse.json({ error: 'Format de fichier invalide. Formats acceptés : PNG, JPEG, WebP' }, { status: 400 });
    }

    // Check size (~500KB base64 ≈ ~680000 chars)
    if (dataUri.length > 700000) {
      return NextResponse.json({ error: 'Photo trop volumineuse (500Ko max)' }, { status: 400 });
    }

    const photo = await prisma.interventionPhoto.create({
      data: {
        data: parsed.data.data,
        label: parsed.data.label || null,
        ordre: intervention._count.photos,
        interventionId: id,
      },
    });

    return NextResponse.json({ data: { id: photo.id, label: photo.label, ordre: photo.ordre, createdAt: photo.createdAt } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
