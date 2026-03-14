export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatCurrency, formatDate, getDevisStatusLabel, calculateTTC } from '@/lib/utils';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    const { id } = await params;

    const devis: any = await prisma.devis.findFirst({
      where: { id, companyId: user.companyId, ...(!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE) && { createdById: user.id }) },
      include: { items: true, client: true, company: true, createdBy: { select: { firstName: true, lastName: true } } } as any,
    });
    if (!devis) return NextResponse.json({ error: 'Non trouve' }, { status: 404 });

    const tva = devis.amountTTC - devis.amountHT;
    const statusLabel = getDevisStatusLabel(devis.status);
    const statusColor: Record<string, string> = {
      BROUILLON: '#71717a',
      ENVOYE: '#0284c7',
      ACCEPTE: '#059669',
      REFUSE: '#dc2626',
      FACTURE: '#7c3aed',
    };
    const sColor = statusColor[devis.status] || '#71717a';

    const company = devis.company as any;
    const brandColor = company.primaryColor || '#1b40f5';
    const logoUrl = company.logoUrl || '';

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="" style="max-width:160px;max-height:56px;object-fit:contain;margin-bottom:8px;display:block" />`
      : '';

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${devis.reference}</title>
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
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #f4f4f5;text-align:center;color:#a1a1aa;font-size:11px}
.footer strong{color:${brandColor}}
.signature-block{margin-top:40px;display:flex;justify-content:flex-end}
.signature-box{width:280px;border:2px solid #e4e4e7;border-radius:10px;padding:16px 20px}
.signature-label{font-size:10px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.signature-line{border-bottom:1px solid #d4d4d8;height:60px;margin:8px 0}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
.info-item{font-size:12px;color:#52525b}
.info-item strong{color:#18181b}
@media print{body{padding:24px}}
</style></head><body>
<div class="header">
<div>${logoHtml}<div class="company">${devis.company.name}</div><div class="meta">
${devis.company.address ? devis.company.address + '<br>' : ''}${devis.company.postalCode || ''} ${devis.company.city || ''}<br>
${devis.company.phone ? 'Tel: ' + devis.company.phone + '<br>' : ''}${devis.company.email}
${devis.company.siret ? '<br>SIRET: ' + devis.company.siret : ''}${company.tvaIntra ? '<br>TVA: ' + company.tvaIntra : ''}
${company.formeJuridique ? '<br>' + company.formeJuridique + (company.capitalSocial ? ' au capital de ' + company.capitalSocial : '') : ''}
${company.rcs ? '<br>' + company.rcs : ''}${company.codeAPE ? ' — APE: ' + company.codeAPE : ''}</div></div>
<div style="text-align:right"><div class="ref-label">Devis</div><div class="ref-value">${devis.reference}</div>
<div class="meta" style="margin:4px 0 4px">Date: ${formatDate(devis.date)}</div>
${devis.dateExpiration ? '<div class="meta">Validite: ' + formatDate(devis.dateExpiration) + '</div>' : ''}
<div style="margin-top:8px"><span class="status">${statusLabel}</span></div></div>
</div>
<div class="section"><div class="section-title">Client</div><div class="client-box">
<div class="client-name">${devis.client.firstName} ${devis.client.lastName}</div>
<div class="meta">${devis.client.address ? devis.client.address + '<br>' : ''}${devis.client.postalCode || ''} ${devis.client.city || ''}
${devis.client.phone ? '<br>Tel: ' + devis.client.phone : ''}${devis.client.email ? ' &middot; ' + devis.client.email : ''}</div>
</div></div>
${devis.adresseChantier ? '<div class="section"><div class="section-title">Lieu du chantier</div><div class="client-box"><div class="meta">' + devis.adresseChantier + (devis.cpChantier || devis.villeChantier ? '<br>' + (devis.cpChantier || '') + ' ' + (devis.villeChantier || '') : '') + '</div></div></div>' : ''}
${(() => {
  const moTotal = devis.items.filter((it: any) => !it.type || it.type === 'prestation').reduce((s: number, it: any) => s + it.total, 0);
  const fourTotal = devis.items.filter((it: any) => it.type === 'fourniture').reduce((s: number, it: any) => s + it.total, 0);
  return `
<div class="section">
<div class="section-title">Resume du devis</div>
<div style="background:${brandColor}08;border:1px solid ${brandColor}20;border-radius:12px;padding:20px 24px">
<div style="font-size:16px;font-weight:700;color:#18181b;margin-bottom:4px">${devis.title}</div>
${devis.description ? '<div style="font-size:13px;color:#52525b;margin-bottom:16px;line-height:1.6">' + devis.description + '</div>' : '<div style="margin-bottom:16px"></div>'}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
${moTotal > 0 ? '<div style="background:white;border-radius:8px;padding:10px 14px;border:1px solid #e4e4e7"><div style="font-size:10px;font-weight:600;color:#0284c7;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Main d\'oeuvre</div><div style="font-size:16px;font-weight:700;color:#18181b">' + formatCurrency(moTotal) + '</div></div>' : ''}
${fourTotal > 0 ? '<div style="background:white;border-radius:8px;padding:10px 14px;border:1px solid #e4e4e7"><div style="font-size:10px;font-weight:600;color:#d97706;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Fournitures</div><div style="font-size:16px;font-weight:700;color:#18181b">' + formatCurrency(fourTotal) + '</div></div>' : ''}
</div>
<div style="border-top:1px solid ${brandColor}20;padding-top:14px">
<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:#71717a">Total HT</span><span style="font-size:14px;font-weight:600">${formatCurrency(devis.amountHT)}</span></div>
<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:13px;color:#71717a">TVA (${devis.tvaRate}%)</span><span style="font-size:14px;font-weight:600">${formatCurrency(tva)}</span></div>
<div style="display:flex;justify-content:space-between;padding-top:10px;border-top:2px solid #18181b"><span style="font-size:15px;font-weight:700">Total TTC</span><span style="font-size:18px;font-weight:700;color:${brandColor}">${formatCurrency(devis.amountTTC)}</span></div>
${devis.acomptePercent ? '<div style="display:flex;justify-content:space-between;margin-top:8px"><span style="font-size:12px;color:#d97706;font-weight:500">Acompte (' + devis.acomptePercent + '%)</span><span style="font-size:13px;font-weight:600;color:#d97706">' + formatCurrency(Math.round(devis.amountTTC * devis.acomptePercent) / 100) + '</span></div><div style="display:flex;justify-content:space-between;margin-top:4px"><span style="font-size:12px;color:#71717a">Solde restant</span><span style="font-size:13px;font-weight:600">' + formatCurrency(devis.amountTTC - Math.round(devis.amountTTC * devis.acomptePercent) / 100) + '</span></div>' : ''}
</div>
</div>
<div class="meta" style="margin-top:8px">Rédigé par : ${devis.createdBy.firstName.charAt(0).toUpperCase() + devis.createdBy.firstName.slice(1).toLowerCase()} ${devis.createdBy.lastName.charAt(0).toUpperCase() + devis.createdBy.lastName.slice(1).toLowerCase()}</div>
</div>`;
})()}
<div class="section"><div class="section-title">Detail des prestations</div><table><thead><tr><th style="width:40px">Type</th><th>Description</th><th>Qte</th><th>Prix unit.</th><th>Total</th></tr></thead><tbody>
${devis.items.map((it: any) => {
  const typeLabels: Record<string, string> = { prestation: 'Prest.', fourniture: 'Fourn.' };
  const typeColors: Record<string, string> = { prestation: '#0284c7', fourniture: '#d97706' };
  const t = it.type || 'prestation';
  return `<tr><td><span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:600;color:white;background:${typeColors[t] || brandColor}">${typeLabels[t] || 'Prest.'}</span></td><td>${it.description}</td><td>${it.quantity}</td><td>${formatCurrency(it.unitPrice)}</td><td>${formatCurrency(it.total)}</td></tr>`;
}).join('')}
</tbody></table></div>
${devis.conditionsPaiement || devis.delaiTravaux ? '<div class="conditions"><div class="conditions-title">Conditions & delais</div><div class="info-grid">' + (devis.conditionsPaiement ? '<div class="info-item"><strong>Paiement :</strong> ' + devis.conditionsPaiement + '</div>' : '') + (devis.delaiTravaux ? '<div class="info-item"><strong>Delai des travaux :</strong> ' + devis.delaiTravaux + '</div>' : '') + '</div></div>' : ''}
${devis.conditionsParticulieres ? '<div class="conditions"><div class="conditions-title">Conditions particulieres</div><div class="meta">' + devis.conditionsParticulieres + '</div></div>' : ''}
${devis.notes ? '<div class="section" style="background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0"><div style="font-weight:600;font-size:12px;color:#92400e;margin-bottom:2px">Notes</div><div class="meta">' + devis.notes + '</div></div>' : ''}
${company.conditionsGeneralesDevis || devis.conditionsParticulieres ? '' : (() => { const duree = company.dureeValiditeDevis || 30; const dureeLabel = duree >= 30 ? (duree / 30) + ' mois' : duree + ' jours'; return '<div class="conditions"><div class="conditions-title">Conditions</div><div class="meta">Devis valable ' + dureeLabel + ' a compter de sa date d\'emission. Paiement a reception de facture.</div></div>'; })()}
${(() => { const moItems = devis.items.filter((it: any) => !it.type || it.type === 'prestation'); const moHours = moItems.reduce((s: number, it: any) => s + it.quantity, 0); return moHours > 0 && company.tauxHoraire ? '<div class="conditions"><div class="conditions-title">Taux horaire main d\'oeuvre</div><div class="meta">Taux horaire applique : ' + formatCurrency(company.tauxHoraire) + ' /h' + (moHours > 0 ? ' — ' + moHours + 'h de main d\'oeuvre' : '') + '</div></div>' : ''; })()}
${company.assuranceDecennaleNom ? '<div class="conditions"><div class="conditions-title">Assurance decennale</div><div class="meta">Assureur : ' + company.assuranceDecennaleNom + (company.assuranceDecennaleNumero ? ' — Contrat n&deg; ' + company.assuranceDecennaleNumero : '') + (company.assuranceDecennaleZone ? '<br>Zone de couverture : ' + company.assuranceDecennaleZone : '') + '</div></div>' : ''}
<div class="legal" style="background:#fafafa;border-radius:10px;padding:14px 18px;margin-bottom:28px;font-size:11px;color:#71717a;line-height:1.7">
<strong>Mentions legales obligatoires</strong><br>
En cas de retard de paiement, une penalite de 3 fois le taux d'interet legal sera appliquee,
ainsi qu'une indemnite forfaitaire de 40&euro; pour frais de recouvrement (Art. L441-10 du Code de commerce).<br>
Le client beneficie d'un delai de retractation de 14 jours a compter de l'acceptation du devis
pour les contrats conclus hors etablissement (Art. L221-18 du Code de la consommation).<br>
${company.formeJuridique === 'Auto-entrepreneur' ? 'TVA non applicable, art. 293 B du CGI.<br>' : ''}
${company.conditionsGeneralesDevis ? company.conditionsGeneralesDevis : ''}
</div>
<div style="text-align:center;margin-bottom:16px;font-size:11px;color:#52525b;font-style:italic">Devis re&ccedil;u avant l&rsquo;ex&eacute;cution des travaux. Le client reconnait avoir pris connaissance des conditions ci-dessus.</div>
<div class="signature-block"><div class="signature-box">
<div class="signature-label">Bon pour accord</div>
<div style="font-size:11px;color:#71717a;margin-bottom:8px">Le client (signature precedee de la mention &laquo; Bon pour accord &raquo;)</div>
<div style="font-size:13px;font-weight:600;color:#18181b;margin-bottom:4px">${devis.client.firstName} ${devis.client.lastName}</div>
<div style="font-size:11px;color:#71717a;margin-bottom:8px">Date : __ / __ / ____</div>
<div style="font-size:10px;color:#a1a1aa;margin-bottom:4px">Mention &laquo; Bon pour accord &raquo; :</div>
<div style="border:1px solid #e4e4e7;border-radius:6px;height:28px;margin-bottom:10px"></div>
<div style="font-size:10px;color:#a1a1aa;margin-bottom:4px">Signature :</div>
<div class="signature-line"></div>
</div></div>
<div class="footer">
<strong>${devis.company.name}</strong>${devis.company.siret ? ' &middot; SIRET: ' + devis.company.siret : ''}${company.tvaIntra ? ' &middot; TVA: ' + company.tvaIntra : ''}<br>
<span style="font-size:10px">Document généré avec <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none;font-weight:600">STRAVON</a> — Logiciel de gestion pour artisans</span></div>
</body></html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}