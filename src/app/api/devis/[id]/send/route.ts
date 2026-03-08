import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendEmail } from '@/lib/mailer';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    const { id } = await params;

    const devis: any = await prisma.devis.findFirst({
      where: { id, companyId: user.companyId, ...(!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE) && { createdById: user.id }) },
      include: { client: true, company: true },
    });
    if (!devis) return NextResponse.json({ error: 'Non trouve' }, { status: 404 });

    const clientEmail = devis.client.email;
    if (!clientEmail) {
      return NextResponse.json({ error: 'Le client n\'a pas d\'adresse email' }, { status: 400 });
    }

    // Generate accept token (valid 7 days)
    const acceptToken = crypto.randomBytes(32).toString('hex');
    const acceptTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.devis.update({
      where: { id },
      data: { acceptToken, acceptTokenExpiresAt },
    });

    const company = devis.company;
    const brandColor = company.primaryColor || '#1b40f5';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.stravon.fr';
    const pdfUrl = `${baseUrl}/api/devis/${id}/pdf`;
    const acceptUrl = `${baseUrl}/devis-accept/${acceptToken}`;

    await sendEmail({
      to: clientEmail,
      subject: `Devis ${devis.reference} — ${company.name}`,
      replyTo: company.email,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#18181b">
          <div style="text-align:center;margin-bottom:32px">
            <h1 style="font-size:20px;font-weight:700;color:${brandColor};margin:0">${company.name}</h1>
            ${company.address ? `<p style="font-size:13px;color:#71717a;margin:4px 0 0">${company.address}, ${company.postalCode || ''} ${company.city || ''}</p>` : ''}
          </div>

          <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
            Bonjour ${devis.client.firstName} ${devis.client.lastName},
          </p>

          <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
            Veuillez trouver ci-dessous votre devis <strong>${devis.reference}</strong> du ${formatDate(devis.date)}.
          </p>

          <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="font-size:16px;font-weight:600;margin:0 0 4px">${devis.title}</p>
            <p style="font-size:14px;color:#71717a;margin:0 0 12px">${devis.description || ''}</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#71717a;border-top:1px solid #e4e4e7;padding-top:12px">Total TTC</td>
                <td style="font-size:18px;font-weight:700;color:${brandColor};text-align:right;border-top:1px solid #e4e4e7;padding-top:12px">${formatCurrency(devis.amountTTC)}</td>
              </tr>
            </table>
          </div>

          <div style="text-align:center;margin-bottom:12px">
            <a href="${pdfUrl}" style="display:inline-block;padding:10px 28px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600">
              Voir le devis complet (PDF)
            </a>
          </div>

          <div style="text-align:center;margin-bottom:12px">
            <a href="${acceptUrl}" style="display:inline-block;padding:14px 40px;background:#059669;color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700">
              Accepter le devis
            </a>
          </div>

          <div style="text-align:center;margin-bottom:32px">
            <a href="${acceptUrl}?action=refuse" style="display:inline-block;padding:10px 28px;background:#dc2626;color:white;text-decoration:none;border-radius:10px;font-size:13px;font-weight:600">
              Refuser le devis
            </a>
          </div>

          <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:32px;border-top:1px solid #f4f4f5;padding-top:16px">
            ${company.name}${company.siret ? ' — SIRET: ' + company.siret : ''}${company.phone ? ' — ' + company.phone : ''}<br>
            Email envoy&eacute; via <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none">STRAVON</a>
          </p>
        </div>
      `,
    });

    // Mark as ENVOYE if still BROUILLON
    if (devis.status === 'BROUILLON') {
      await prisma.devis.update({
        where: { id },
        data: { status: 'ENVOYE' },
      });
    }

    return NextResponse.json({ message: 'Devis envoye par email' });
  } catch (error) {
    console.error('Send devis error:', error);
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
