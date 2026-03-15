export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendEmail } from '@/lib/mailer';
import { formatCurrency, formatDate } from '@/lib/utils';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    const { id } = await params;

    const facture: any = await prisma.facture.findFirst({
      where: { id, companyId: user.companyId },
      include: { client: true, company: true },
    });
    if (!facture) return NextResponse.json({ error: 'Non trouvee' }, { status: 404 });

    const clientEmail = facture.client.email;
    if (!clientEmail) {
      return NextResponse.json({ error: 'Le client n\'a pas d\'adresse email' }, { status: 400 });
    }

    // Generate view token for public page (valid 7 days)
    const viewToken = crypto.randomBytes(32).toString('hex');
    const viewTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.facture.update({
      where: { id },
      data: { viewToken, viewTokenExpiresAt },
    });

    const company = facture.company;
    const brandColor = company.primaryColor || '#1b40f5';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon-weld.vercel.app';
    const viewUrl = `${baseUrl}/facture-view/${viewToken}`;
    const pdfUrl = `${baseUrl}/api/factures/${id}/pdf`;

    await sendEmail({
      to: clientEmail,
      subject: `Facture ${facture.numero} — ${company.name}`,
      replyTo: company.email,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#18181b">
          <div style="text-align:center;margin-bottom:32px">
            <h1 style="font-size:20px;font-weight:700;color:${brandColor};margin:0">${company.name}</h1>
            ${company.address ? `<p style="font-size:13px;color:#71717a;margin:4px 0 0">${company.address}, ${company.postalCode || ''} ${company.city || ''}</p>` : ''}
          </div>

          <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
            Bonjour ${facture.client.firstName} ${facture.client.lastName},
          </p>

          <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
            Veuillez trouver ci-dessous votre facture <strong>${facture.numero}</strong> du ${formatDate(facture.date)}.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
            <tr>
              <td style="font-size:13px;color:#71717a;padding-bottom:8px">Facture N&deg;</td>
              <td style="font-size:14px;font-weight:600;text-align:right;padding-bottom:8px">${facture.numero}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#71717a;padding-bottom:8px">Date</td>
              <td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:8px">${formatDate(facture.date)}</td>
            </tr>
            ${facture.dateEcheance ? `
            <tr>
              <td style="font-size:13px;color:#71717a;padding-bottom:8px">&Eacute;ch&eacute;ance</td>
              <td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:8px">${formatDate(facture.dateEcheance)}</td>
            </tr>` : ''}
            <tr>
              <td style="font-size:13px;color:#71717a;border-top:1px solid #e4e4e7;padding-top:12px">Total TTC</td>
              <td style="font-size:18px;font-weight:700;color:${brandColor};text-align:right;border-top:1px solid #e4e4e7;padding-top:12px">${formatCurrency(facture.amountTTC)}</td>
            </tr>
          </table>

          <div style="text-align:center;margin-bottom:12px">
            <a href="${viewUrl}" style="display:inline-block;padding:14px 40px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700">
              Voir la facture
            </a>
          </div>

          <div style="text-align:center;margin-bottom:12px">
            <a href="${viewUrl}" style="display:inline-block;padding:10px 28px;background:#059669;color:white;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600">
              ✅ J'ai pay&eacute;
            </a>
          </div>

          <div style="text-align:center;margin-bottom:32px">
            <a href="${pdfUrl}" style="display:inline-block;padding:10px 28px;background:#71717a;color:white;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600">
              T&eacute;l&eacute;charger le PDF
            </a>
          </div>

          <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:32px;border-top:1px solid #f4f4f5;padding-top:16px">
            ${company.name}${company.siret ? ' — SIRET: ' + company.siret : ''}${company.phone ? ' — ' + company.phone : ''}<br>
            En cas de retard de paiement, une p&eacute;nalit&eacute; de 3 fois le taux d'int&eacute;r&ecirc;t l&eacute;gal sera appliqu&eacute;e,
            ainsi qu'une indemnit&eacute; forfaitaire de 40&euro; pour frais de recouvrement.<br>
            Email envoy&eacute; via <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none">STRAVON</a>
          </p>
        </div>
      `,
    });

    // Mark as ENVOYEE if still EN_ATTENTE
    if (facture.status === 'EN_ATTENTE') {
      await prisma.facture.update({
        where: { id },
        data: { status: 'ENVOYEE' },
      });
    }

    return NextResponse.json({ message: 'Facture envoyee par email' });
  } catch (error) {
    console.error('Send facture error:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}