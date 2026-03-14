export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatCurrency, formatDate, getFactureStatusLabel, getModePaiementLabel } from '@/lib/utils';
import { canManageFactures, getEffectivePermissions } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!canManageFactures(perms)) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    const { id } = await params;

    const facture: any = await prisma.facture.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true, client: true, company: true, intervention: { select: { reference: true, title: true } }, devis: { select: { reference: true, date: true } } } as any,
    });
    if (!facture) return NextResponse.json({ error: 'Non trouvee' }, { status: 404 });

    // Serve frozen PDF snapshot for locked invoices (legal archival)
    if (facture.pdfSnapshot && ['PAYEE', 'ANNULEE'].includes(facture.status)) {
      return new NextResponse(facture.pdfSnapshot, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const tva = facture.amountTTC - facture.amountHT;
    const statusLabel = getFactureStatusLabel(facture.status);
    const statusColor: Record<string, string> = {
      EN_ATTENTE: '#d97706',
      PAYEE: '#059669',
      EN_RETARD: '#dc2626',
      ANNULEE: '#71717a',
    };
    const sColor = statusColor[facture.status] || '#71717a';

    const company = facture.company as any;
    const brandColor = company.primaryColor || '#1b40f5';
    const logoUrl = company.logoUrl || '';

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="" style="max-width:160px;max-height:56px;object-fit:contain;margin-bottom:8px;display:block" />`
      : '';

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${facture.numero}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',system-ui,sans-serif;color:#18181b;font-size:13px;line-height:1.6;padding:48px;max-width:780px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid ${brandColor}20}
.company{font-size:20px;font-weight:700;color:${brandColor};margin-bottom:4px}
.meta{color:#71717a;font-size:12px;line-height:1.8}
.ref-label{font-size:10px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.ref-value{font-size:18px;font-weight:700;color:${brandColor}}
.status{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;color:white;background:${sColor}}
.section{margin-bottom:28px}
.section-title{font-size:10px;font-weight:600;color:${brandColor};text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}
.client-box{background:#fafafa;border-radius:10px;padding:14px 18px}
.client-name{font-size:15px;font-weight:600;margin-bottom:2px}
table{width:100%;border-collapse:collapse}
th{background:#fafafa;padding:8px 14px;text-align:left;font-size:10px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid ${brandColor}30}
th:last-child,td:last-child{text-align:right}
td{padding:10px 14px;border-bottom:1px solid #f4f4f5;font-size:13px}
.totals{display:flex;justify-content:flex-end;margin-top:20px}
.totals table{width:240px}
.totals td{padding:4px 0;border:none;font-size:13px}
.totals .label{color:#71717a}
.totals .grand td{padding-top:10px;border-top:2px solid #18181b;font-size:15px;font-weight:700}
.conditions{background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:28px}
.conditions-title{font-size:11px;font-weight:600;color:#52525b;margin-bottom:4px}
.payment-box{background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:14px 18px;margin-bottom:28px}
.payment-title{font-size:11px;font-weight:600;color:#065f46;margin-bottom:4px}
.legal{background:#fafafa;border-radius:10px;padding:14px 18px;margin-bottom:28px;font-size:11px;color:#71717a}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #f4f4f5;text-align:center;color:#a1a1aa;font-size:11px}
.footer strong{color:${brandColor}}
@media print{body{padding:24px}}
</style></head><body>
<div class="header">
<div>${logoHtml}<div class="company">${facture.company.name}</div><div class="meta">
${facture.company.address ? facture.company.address + '<br>' : ''}${facture.company.postalCode || ''} ${facture.company.city || ''}<br>
${facture.company.phone ? 'Tel: ' + facture.company.phone + '<br>' : ''}${facture.company.email}
${facture.company.siret ? '<br>SIRET: ' + facture.company.siret : ''}${company.tvaIntra ? '<br>TVA: ' + company.tvaIntra : ''}
${company.formeJuridique ? '<br>' + company.formeJuridique + (company.capitalSocial ? ' au capital de ' + company.capitalSocial : '') : ''}
${company.rcs ? '<br>' + company.rcs : ''}${company.codeAPE ? ' — APE: ' + company.codeAPE : ''}</div></div>
<div style="text-align:right"><div class="ref-label">Facture</div><div class="ref-value">${facture.numero}</div>
<div class="meta" style="margin:4px 0 4px">Date: ${formatDate(facture.date)}</div>
${facture.dateEcheance ? '<div class="meta">&Eacute;ch&eacute;ance: ' + formatDate(facture.dateEcheance) + '</div>' : ''}
<div style="margin-top:8px"><span class="status">${statusLabel}</span></div></div>
</div>
<div class="section"><div class="section-title">Client</div><div class="client-box">
<div class="client-name">${facture.client.firstName} ${facture.client.lastName}</div>
<div class="meta">${facture.client.address ? facture.client.address + '<br>' : ''}${facture.client.postalCode || ''} ${facture.client.city || ''}
${facture.client.phone ? '<br>Tel: ' + facture.client.phone : ''}${facture.client.email ? ' &middot; ' + facture.client.email : ''}</div>
</div></div>
${facture.intervention ? '<div class="section"><div class="section-title">Intervention associee</div><div class="meta">Ref: ' + facture.intervention.reference + ' &mdash; ' + facture.intervention.title + '</div></div>' : ''}
${facture.devis ? '<div class="section"><div class="section-title">Devis d\'origine</div><div class="meta">Facture relative au devis n&deg; ' + facture.devis.reference + ' du ' + formatDate(facture.devis.date) + '</div></div>' : ''}
<div class="section"><div class="section-title">Details</div><table><thead><tr><th style="width:40px">Type</th><th>Description</th><th>Qte</th><th>Prix unit.</th><th>Total</th></tr></thead><tbody>
${facture.items.map((it: any) => {
  const typeLabels: Record<string, string> = { prestation: 'Prest.', fourniture: 'Fourn.' };
  const typeColors: Record<string, string> = { prestation: '#0284c7', fourniture: '#d97706' };
  const t = it.type || 'prestation';
  return `<tr><td><span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;color:white;background:${typeColors[t] || brandColor}">${typeLabels[t] || 'Prest.'}</span></td><td>${it.description}</td><td>${it.quantity}</td><td>${formatCurrency(it.unitPrice)}</td><td>${formatCurrency(it.total)}</td></tr>`;
}).join('')}
</tbody></table>
<div class="totals"><table><tr><td class="label">Total HT</td><td style="text-align:right;font-weight:500">${formatCurrency(facture.amountHT)}</td></tr>
${company.regimeTVA === 'franchise' ? '<tr><td class="label" colspan="2" style="text-align:right;font-size:11px;color:#71717a;font-style:italic">TVA non applicable, art. 293 B du CGI</td></tr>' : '<tr><td class="label">TVA (' + facture.tvaRate + '%)</td><td style="text-align:right;font-weight:500">' + formatCurrency(tva) + '</td></tr>'}
<tr class="grand"><td>Total TTC</td><td style="text-align:right">${formatCurrency(company.regimeTVA === 'franchise' ? facture.amountHT : facture.amountTTC)}</td></tr></table></div></div>
${facture.status === 'PAYEE' && facture.datePaiement ? '<div class="payment-box"><div class="payment-title">Paiement recu</div><div class="meta">Date: ' + formatDate(facture.datePaiement) + (facture.modePaiement ? '<br>Mode: ' + getModePaiementLabel(facture.modePaiement) : '') + '</div></div>' : ''}
${facture.conditionsPaiement ? '<div class="conditions"><div class="conditions-title">Conditions de reglement</div><div class="meta">' + facture.conditionsPaiement + '</div></div>' : ''}
${facture.notes ? '<div class="section" style="background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0"><div style="font-weight:600;font-size:12px;color:#92400e;margin-bottom:2px">Notes</div><div class="meta">' + facture.notes + '</div></div>' : ''}
${facture.mentionsLegales ? '<div class="legal">' + facture.mentionsLegales + '</div>' : ''}
${company.assuranceDecennaleNom ? '<div class="conditions"><div class="conditions-title">Assurance decennale</div><div class="meta">Assureur : ' + company.assuranceDecennaleNom + (company.assuranceDecennaleNumero ? ' — Contrat n&deg; ' + company.assuranceDecennaleNumero : '') + (company.assuranceDecennaleZone ? '<br>Zone de couverture : ' + company.assuranceDecennaleZone : '') + '</div></div>' : ''}
${company.iban ? '<div class="conditions"><div class="conditions-title">Coordonn&eacute;es bancaires</div><div class="meta">IBAN : ' + company.iban.replace(/(.{4})/g, '$1 ').trim() + (company.bic ? '<br>BIC : ' + company.bic : '') + (company.nomBanque ? '<br>Banque : ' + company.nomBanque : '') + '</div></div>' : ''}
<div class="legal" style="background:#fafafa;border-radius:10px;padding:14px 18px;margin-bottom:28px;font-size:11px;color:#71717a;line-height:1.7">
<strong>Mentions legales obligatoires</strong><br>
En cas de retard de paiement, une penalite de 3 fois le taux d&apos;interet legal sera appliquee,
ainsi qu&apos;une indemnite forfaitaire de 40&euro; pour frais de recouvrement (Art. L441-10 du Code de commerce).<br>
${company.regimeTVA === 'franchise' ? 'TVA non applicable, art. 293 B du CGI.<br>' : ''}
</div>
<div class="footer">
<strong>${facture.company.name}</strong>${facture.company.siret ? ' &middot; SIRET: ' + facture.company.siret : ''}${company.tvaIntra ? ' &middot; TVA: ' + company.tvaIntra : ''}<br>
<span style="font-size:10px">Document g&eacute;n&eacute;r&eacute; avec <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none;font-weight:600">STRAVON</a> — Logiciel de gestion pour artisans</span>
</div>
</body></html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}