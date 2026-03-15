export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';
import { sendEmail } from '@/lib/mailer';
import { formatCurrency, formatDate } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { id } = await params;
    const facture = await prisma.facture.findFirst({
      where: { id, companyId: user.companyId },
      include: { client: true, company: true },
    });
    if (!facture) return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });

    if (facture.status !== 'PAIEMENT_DECLARE') {
      return NextResponse.json({ error: 'Seules les factures avec paiement déclaré peuvent être contestées' }, { status: 400 });
    }

    // Reset to ENVOYEE and clear declaration fields
    await prisma.facture.update({
      where: { id },
      data: {
        status: 'ENVOYEE',
        paymentDeclaredAt: null,
        paymentDeclaredMethod: null,
        paymentDeclaredReference: null,
      },
    });

    // Send email to client if they have an email
    const clientEmail = facture.client.email;
    if (clientEmail) {
      const company = facture.company as any;
      const brandColor = company.primaryColor || '#1b40f5';

      await sendEmail({
        to: clientEmail,
        subject: `Paiement non confirmé — Facture ${facture.numero}`,
        replyTo: company.email,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#18181b">
            <div style="text-align:center;margin-bottom:32px">
              <h1 style="font-size:20px;font-weight:700;color:${brandColor};margin:0">${company.name}</h1>
            </div>

            <p style="font-size:14px;line-height:1.6;margin-bottom:16px">
              Bonjour ${facture.client.firstName} ${facture.client.lastName},
            </p>

            <p style="font-size:14px;line-height:1.6;margin-bottom:16px">
              Votre déclaration de paiement pour la facture <strong>${facture.numero}</strong> d'un montant de <strong>${formatCurrency(facture.amountTTC)}</strong> n'a pas pu être confirmée par ${company.name}.
            </p>

            <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
              Si vous avez effectué le paiement, nous vous invitons à contacter directement ${company.name} pour clarifier la situation.
            </p>

            <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:32px;border-top:1px solid #f4f4f5;padding-top:16px">
              ${company.name}${company.phone ? ' — ' + company.phone : ''}${company.email ? ' — ' + company.email : ''}<br>
              Email envoyé via <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none">STRAVON</a>
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ message: 'Paiement contesté' });
  } catch (error) {
    console.error('Contest payment error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
