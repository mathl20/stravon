export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { facturePaymentSchema } from '@/lib/validations';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';
import { formatCurrency } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const { id } = await ctx.params;
    const facture = await prisma.facture.findFirst({ where: { id, companyId: user.companyId } });
    if (!facture) return NextResponse.json({ error: 'Facture non trouvee' }, { status: 404 });

    const body = await request.json();
    const parsed = facturePaymentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const updated = await prisma.facture.update({
      where: { id },
      data: {
        status: 'PAYEE',
        modePaiement: parsed.data.modePaiement,
        datePaiement: new Date(parsed.data.datePaiement),
      },
    });

    // Also mark linked intervention as PAID
    if (facture.interventionId) {
      await prisma.intervention.update({
        where: { id: facture.interventionId },
        data: { status: 'PAID' },
      });
    }

    // Notify all PATRON users about payment
    const patrons = await prisma.user.findMany({
      where: { companyId: user.companyId, role: 'PATRON' },
    });
    for (const patron of patrons) {
      await createNotification(
        'FACTURE_PAYEE',
        `Facture ${facture.numero} marqu\u00e9e comme pay\u00e9e — ${formatCurrency(facture.amountTTC)}`,
        `/factures/${id}`,
        patron.id,
        user.companyId
      );
    }

    // Snapshot the PDF at payment time (legal archival requirement)
    if (!facture.pdfSnapshot) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const pdfRes = await fetch(`${baseUrl}/api/factures/${id}/pdf`, {
          headers: { cookie: request.headers.get('cookie') || '' },
        });
        if (pdfRes.ok) {
          const snapshot = await pdfRes.text();
          await prisma.facture.update({ where: { id }, data: { pdfSnapshot: snapshot } });
        }
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}