export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const { id } = await params;

    const inv: any = await prisma.intervention.findFirst({
      where: { id, companyId: user.companyId },
      include: { items: true, client: true, company: true, createdBy: { select: { firstName: true, lastName: true } }, photos: { orderBy: { ordre: 'asc' } } } as any,
    });
    if (!inv) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 });

    const tva = inv.amountTTC - inv.amountHT;
    const statusLabel = { PENDING: 'En attente', INVOICED: 'Facturé', PAID: 'Payé' }[inv.status as string] || inv.status;
    const statusColor = { PENDING: '#d97706', INVOICED: '#0284c7', PAID: '#059669' }[inv.status as string] || '#71717a';

    // Branding (champs reconnus après `npx prisma db push`)
    const company = inv.company as any;
    const brandColor = company.primaryColor || '#1b40f5';
    const logoUrl = company.logoUrl || '';

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="" style="max-width:160px;max-height:56px;object-fit:contain;margin-bottom:8px;display:block" />`
      : '';

    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${inv.reference}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',system-ui,sans-serif;color:#18181b;font-size:13px;line-height:1.6;padding:48px;max-width:780px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid ${brandColor}20}
.company{font-size:20px;font-weight:700;color:${brandColor};margin-bottom:4px}
.meta{color:#71717a;font-size:12px;line-height:1.8}
.ref-label{font-size:10px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.ref-value{font-size:18px;font-weight:700;color:${brandColor}}
.status{display:inline-block;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;color:white;background:${statusColor}}
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
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #f4f4f5;text-align:center;color:#a1a1aa;font-size:11px}
.footer strong{color:${brandColor}}
@media print{body{padding:24px}}
</style></head><body>
<div class="header">
<div>${logoHtml}<div class="company">${inv.company.name}</div><div class="meta">
${inv.company.address ? inv.company.address + '<br>' : ''}${inv.company.postalCode || ''} ${inv.company.city || ''}<br>
${inv.company.phone ? 'Tél: ' + inv.company.phone + '<br>' : ''}${inv.company.email}
${inv.company.siret ? '<br>SIRET: ' + inv.company.siret : ''}</div></div>
<div style="text-align:right"><div class="ref-label">Fiche d'intervention</div><div class="ref-value">${inv.reference}</div>
<div class="meta" style="margin:4px 0 8px">${formatDate(inv.date)}</div><span class="status">${statusLabel}</span></div>
</div>
<div class="section"><div class="section-title">Client</div><div class="client-box">
<div class="client-name">${inv.client.firstName} ${inv.client.lastName}</div>
<div class="meta">${inv.client.address ? inv.client.address + '<br>' : ''}${inv.client.postalCode || ''} ${inv.client.city || ''}
${inv.client.phone ? '<br>Tél: ' + inv.client.phone : ''}${inv.client.email ? ' · ' + inv.client.email : ''}</div>
</div></div>
<div class="section"><div class="section-title">Intervention</div>
<div style="font-size:16px;font-weight:600;margin-bottom:4px">${inv.title}</div>
${inv.description ? '<div class="meta">' + inv.description + '</div>' : ''}
<div class="meta" style="margin-top:4px">Technicien: ${(inv as any).createdBy.firstName} ${(inv as any).createdBy.lastName}</div></div>
<div class="section"><div class="section-title">Détails</div><table><thead><tr><th>Description</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr></thead><tbody>
${inv.items.map((it: any) => `<tr><td>${it.description}</td><td>${it.quantity}</td><td>${formatCurrency(it.unitPrice)}</td><td>${formatCurrency(it.total)}</td></tr>`).join('')}
</tbody></table>
<div class="totals"><table><tr><td class="label">Total HT</td><td style="text-align:right;font-weight:500">${formatCurrency(inv.amountHT)}</td></tr>
<tr><td class="label">TVA (${inv.tvaRate}%)</td><td style="text-align:right;font-weight:500">${formatCurrency(tva)}</td></tr>
<tr class="grand"><td>Total TTC</td><td style="text-align:right">${formatCurrency(inv.amountTTC)}</td></tr></table></div></div>
${inv.notes ? '<div class="section" style="background:#fffbeb;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0"><div style="font-weight:600;font-size:12px;color:#92400e;margin-bottom:2px">Notes</div><div class="meta">' + inv.notes + '</div></div>' : ''}
${inv.photos && inv.photos.length > 0 ? '<div class="section"><div class="section-title">Photos</div><div style="display:flex;flex-wrap:wrap;gap:12px">' + inv.photos.map((p: any) => `<div style="width:calc(33.33% - 8px)"><img src="${p.data}" alt="${p.label || 'Photo'}" style="width:100%;height:140px;object-fit:cover;border-radius:8px;border:1px solid #e4e4e7" />${p.label ? '<div style="font-size:11px;color:#71717a;margin-top:4px;text-align:center">' + p.label + '</div>' : ''}</div>`).join('') + '</div></div>' : ''}
${inv.signatureClient ? '<div class="section"><div class="section-title">Signature client</div><div style="display:flex;align-items:flex-end;gap:24px"><img src="' + inv.signatureClient + '" alt="Signature" style="max-width:280px;border:1px solid #e4e4e7;border-radius:8px;padding:8px" /><div class="meta">Signé le ' + (inv.signedAt ? formatDate(inv.signedAt) : '—') + '</div></div></div>' : ''}
<div class="footer"><strong>${inv.company.name}</strong><br><span style="font-size:10px">Document généré avec <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none;font-weight:600">STRAVON</a> — Logiciel de gestion pour artisans</span></div>
</body></html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}