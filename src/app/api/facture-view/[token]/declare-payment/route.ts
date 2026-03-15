export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';
import { createNotification } from '@/lib/notifications';
import { formatCurrency, formatDate } from '@/lib/utils';

type Ctx = { params: Promise<{ token: string }> };

const VALID_METHODS = ['virement', 'cheque', 'especes', 'autre'];

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

    const facture = await prisma.facture.findUnique({
      where: { viewToken: token },
      include: {
        client: true,
        company: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!facture) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    if ((facture as any).viewTokenExpiresAt && new Date((facture as any).viewTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 });
    }

    // Only allow declaration for EN_ATTENTE or ENVOYEE
    if (!['EN_ATTENTE', 'ENVOYEE', 'EN_RETARD'].includes(facture.status)) {
      return NextResponse.json({ error: 'Cette facture ne peut pas recevoir de déclaration de paiement.' }, { status: 400 });
    }

    // Already declared?
    if (facture.paymentDeclaredAt) {
      return NextResponse.json({ error: 'Un paiement a déjà été déclaré pour cette facture.' }, { status: 400 });
    }

    const body = await request.json();
    const method = body.method;
    const reference = body.reference || null;

    if (!method || !VALID_METHODS.includes(method)) {
      return NextResponse.json({ error: 'Mode de paiement invalide' }, { status: 400 });
    }

    // Update facture
    await prisma.facture.update({
      where: { id: facture.id },
      data: {
        status: 'PAIEMENT_DECLARE',
        paymentDeclaredAt: new Date(),
        paymentDeclaredMethod: method,
        paymentDeclaredReference: reference,
      },
    });

    const methodLabels: Record<string, string> = {
      virement: 'Virement bancaire',
      cheque: 'Chèque',
      especes: 'Espèces',
      autre: 'Autre',
    };

    // Notify all PATRON users + creator
    const patrons = await prisma.user.findMany({
      where: { companyId: facture.companyId, role: 'PATRON' },
    });
    const userIds = new Set(patrons.map((p) => p.id));
    userIds.add(facture.createdById);

    for (const userId of userIds) {
      await createNotification(
        'FACTURE_PAIEMENT_DECLARE',
        `💰 ${facture.client.firstName} ${facture.client.lastName} a déclaré le paiement de la facture ${facture.numero} (${formatCurrency(facture.amountTTC)}) par ${methodLabels[method] || method}`,
        `/factures/${facture.id}`,
        userId,
        facture.companyId
      );
    }

    // Send email to artisan (creator + company email)
    const company = facture.company as any;
    const brandColor = company.primaryColor || '#1b40f5';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';
    const factureUrl = `${baseUrl}/factures/${facture.id}`;

    const emailHtml = `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#18181b">
        <div style="text-align:center;margin-bottom:32px">
          <h1 style="font-size:20px;font-weight:700;color:${brandColor};margin:0">${company.name}</h1>
        </div>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center">
          <p style="font-size:24px;margin:0 0 8px">💰</p>
          <p style="font-size:16px;font-weight:700;color:#166534;margin:0">Paiement déclaré</p>
        </div>

        <p style="font-size:14px;line-height:1.6;margin-bottom:16px">
          <strong>${facture.client.firstName} ${facture.client.lastName}</strong> a déclaré avoir effectué le paiement de votre facture.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
          <tr>
            <td style="font-size:13px;color:#71717a;padding-bottom:8px">Facture</td>
            <td style="font-size:14px;font-weight:600;text-align:right;padding-bottom:8px">${facture.numero}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#71717a;padding-bottom:8px">Montant TTC</td>
            <td style="font-size:14px;font-weight:600;text-align:right;padding-bottom:8px">${formatCurrency(facture.amountTTC)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#71717a;padding-bottom:8px">Mode de paiement</td>
            <td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:8px">${methodLabels[method] || method}</td>
          </tr>
          ${reference ? `
          <tr>
            <td style="font-size:13px;color:#71717a;padding-bottom:8px">Référence</td>
            <td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:8px">${reference}</td>
          </tr>` : ''}
          <tr>
            <td style="font-size:13px;color:#71717a;padding-bottom:0">Date de déclaration</td>
            <td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:0">${formatDate(new Date())}</td>
          </tr>
        </table>

        <p style="font-size:13px;color:#71717a;line-height:1.6;margin-bottom:24px">
          Connectez-vous à votre espace STRAVON pour valider ou contester ce paiement.
        </p>

        <div style="text-align:center;margin-bottom:32px">
          <a href="${factureUrl}" style="display:inline-block;padding:14px 40px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700">
            Voir la facture
          </a>
        </div>

        <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:32px;border-top:1px solid #f4f4f5;padding-top:16px">
          Email envoyé via <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none">STRAVON</a>
        </p>
      </div>
    `;

    // Send to creator
    if (facture.createdBy.email) {
      await sendEmail({
        to: facture.createdBy.email,
        subject: `💰 Paiement déclaré — Facture ${facture.numero}`,
        html: emailHtml,
      });
    }

    // Also send to company email if different
    if (company.email && company.email !== facture.createdBy.email) {
      await sendEmail({
        to: company.email,
        subject: `💰 Paiement déclaré — Facture ${facture.numero}`,
        html: emailHtml,
      });
    }

    return NextResponse.json({ message: 'Paiement déclaré avec succès' });
  } catch (error) {
    console.error('Declare payment error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
