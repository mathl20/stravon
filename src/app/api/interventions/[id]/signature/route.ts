import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { signatureSchema } from '@/lib/validations';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await ctx.params;
    const intervention = await prisma.intervention.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    const body = await request.json();
    const parsed = signatureSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const updated = await prisma.intervention.update({
      where: { id },
      data: {
        signatureClient: parsed.data.signatureClient,
        signedAt: new Date(),
      },
    });

    return NextResponse.json({ data: { signatureClient: updated.signatureClient, signedAt: updated.signedAt } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
