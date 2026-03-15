export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/mailer';
import { formatCurrency } from '@/lib/utils';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const company = await prisma.company.findUnique({ where: { id: user.companyId } });
    if (!company || !(company as any).relancesActive) {
      return NextResponse.json({ message: 'Relances désactivées', count: 0 });
    }

    const relancesJours = ((company as any).relancesJours as number[]) || [7, 14, 30];
    const now = new Date();

    // Get all overdue invoices (EN_ATTENTE with past dateEcheance)
    const facturesEnRetard = await prisma.facture.findMany({
      where: {
        companyId: user.companyId,
        status: 'EN_ATTENTE',
        dateEcheance: { lt: now },
      } as any,
      include: {
        client: true,
        relances: true,
      } as any,
    });

    let newRelances = 0;

    for (const facture of facturesEnRetard as any[]) {
      const echeance = new Date(facture.dateEcheance);
      const joursRetard = Math.floor((now.getTime() - echeance.getTime()) / (1000 * 60 * 60 * 24));
      const existingRelances = (facture.relances || []) as any[];

      // Check each reminder threshold
      for (let i = 0; i < relancesJours.length; i++) {
        const seuil = relancesJours[i];
        const numero = i + 1;

        if (joursRetard >= seuil && !existingRelances.some((r: any) => r.numero === numero)) {
          // Create the relance record
          await prisma.relance.create({
            data: {
              numero,
              factureId: facture.id,
              companyId: user.companyId,
            } as any,
          });

          // Create notification for all PATRON users
          const patrons = await prisma.user.findMany({
            where: { companyId: user.companyId, role: 'PATRON' },
          });

          const clientName = `${facture.client.firstName} ${facture.client.lastName}`;
          const message = `Relance n°${numero} — Facture ${facture.numero} en retard de ${joursRetard} jours — ${clientName} — ${formatCurrency(facture.amountTTC)}`;

          for (const patron of patrons) {
            await createNotification(
              'RELANCE',
              message,
              `/factures/${facture.id}`,
              patron.id,
              user.companyId
            );

            // Send email to patron about overdue invoice
            if (patron.email) {
              try {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';
                await sendEmail({
                  to: patron.email,
                  subject: `Facture ${facture.numero} en retard de ${joursRetard} jours`,
                  html: `
                    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#18181b">
                      <div style="text-align:center;margin-bottom:32px">
                        <div style="width:64px;height:64px;border-radius:50%;background:#fef2f2;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
                          <span style="font-size:28px;color:#dc2626">!</span>
                        </div>
                        <h1 style="font-size:20px;font-weight:700;color:#dc2626;margin:0">Facture en retard</h1>
                      </div>
                      <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
                        Bonjour ${patron.firstName},
                      </p>
                      <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
                        La facture <strong>${facture.numero}</strong> de <strong>${clientName}</strong> est en retard de <strong>${joursRetard} jours</strong>.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:12px;padding:20px;margin-bottom:24px">
                        <tr>
                          <td style="font-size:13px;color:#71717a;padding-bottom:8px">Facture</td>
                          <td style="font-size:14px;font-weight:600;text-align:right;padding-bottom:8px">${facture.numero}</td>
                        </tr>
                        <tr>
                          <td style="font-size:13px;color:#71717a;padding-bottom:8px">Client</td>
                          <td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:8px">${clientName}</td>
                        </tr>
                        <tr>
                          <td style="font-size:13px;color:#71717a;padding-bottom:8px">Relance n&deg;</td>
                          <td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:8px">${numero}</td>
                        </tr>
                        <tr>
                          <td style="font-size:13px;color:#71717a;border-top:1px solid #fecaca;padding-top:12px">Montant TTC</td>
                          <td style="font-size:18px;font-weight:700;color:#dc2626;text-align:right;border-top:1px solid #fecaca;padding-top:12px">${formatCurrency(facture.amountTTC)}</td>
                        </tr>
                      </table>
                      <div style="text-align:center;margin-bottom:32px">
                        <a href="${baseUrl}/factures/${facture.id}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">
                          Voir la facture
                        </a>
                      </div>
                      <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:32px;border-top:1px solid #f4f4f5;padding-top:16px">
                        Email envoy&eacute; via <a href="https://stravon.fr" style="color:#dc2626;text-decoration:none">STRAVON</a>
                      </p>
                    </div>
                  `,
                });
              } catch {
                // Non-blocking
              }
            }
          }

          newRelances++;
        }
      }
    }

    return NextResponse.json({
      message: newRelances > 0
        ? `${newRelances} relance${newRelances > 1 ? 's' : ''} envoyée${newRelances > 1 ? 's' : ''}`
        : 'Aucune nouvelle relance à envoyer',
      count: newRelances,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}