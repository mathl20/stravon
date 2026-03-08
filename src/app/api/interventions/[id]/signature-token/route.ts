import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

type Ctx = { params: Promise<{ id: string }> };

// POST - Generate a unique signature token for QR code
export async function POST(_: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { id } = await ctx.params;

    const intervention = await prisma.intervention.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    if (intervention.signatureClient) {
      return NextResponse.json({ error: 'Cette intervention est déjà signée' }, { status: 400 });
    }

    // Generate or reuse existing token (valid 7 days)
    let token = intervention.signatureToken;
    const existingExpiry = (intervention as any).signatureTokenExpiresAt;
    if (!token || (existingExpiry && new Date(existingExpiry) < new Date())) {
      token = crypto.randomBytes(32).toString('hex');
      const signatureTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.intervention.update({
        where: { id },
        data: { signatureToken: token, signatureTokenExpiresAt },
      });
    }

    return NextResponse.json({ data: { token } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
