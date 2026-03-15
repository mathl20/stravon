export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/mailer';
import { formatDate } from '@/lib/utils';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

    // Verify intervention belongs to company
    const intervention = await prisma.intervention.findFirst({ where: { id, companyId: user.companyId } });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    // Verify user belongs to same company
    const member = await prisma.user.findFirst({ where: { id: userId, companyId: user.companyId } });
    if (!member) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });

    const assignment = await prisma.interventionAssignment.create({
      data: { interventionId: id, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });

    // Create planning entry for the assigned employee
    try {
      const intDate = new Date(intervention.date);
      const heureDebut = new Date(intDate);
      heureDebut.setUTCHours(8, 0, 0, 0);
      const heureFin = new Date(intDate);
      const heures = (intervention as any).heuresEstimees ? Number((intervention as any).heuresEstimees) : 2;
      heureFin.setUTCHours(8 + Math.min(heures, 10), 0, 0, 0);

      await prisma.planning.create({
        data: {
          date: intDate,
          heureDebut,
          heureFin,
          statut: 'PREVU',
          utilisateurId: userId,
          interventionId: id,
          entrepriseId: user.companyId,
        },
      });
    } catch { /* Non-blocking — planning entry might already exist */ }

    // Send notification to the assigned employee
    const client = await prisma.client.findUnique({ where: { id: intervention.clientId }, select: { firstName: true, lastName: true } });
    const dateStr = formatDate(intervention.date);
    const notifMsg = `📋 Nouvelle intervention assignée : ${intervention.title} chez ${client?.firstName || ''} ${client?.lastName || ''} le ${dateStr}`;

    await createNotification('PLANNING', notifMsg, `/interventions/${id}`, userId, user.companyId);

    // Send email to the assigned employee
    if (member.email) {
      const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { name: true, primaryColor: true } });
      const brandColor = (company as any)?.primaryColor || '#1b40f5';
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stravon.fr';

      await sendEmail({
        to: member.email,
        subject: `📋 Intervention assignée — ${intervention.title}`,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#18181b">
            <h1 style="font-size:20px;font-weight:700;color:${brandColor};margin:0 0 24px">${company?.name || 'STRAVON'}</h1>
            <p style="font-size:14px;line-height:1.6;margin-bottom:16px">
              Bonjour ${member.firstName},
            </p>
            <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
              Une intervention vous a été assignée :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
              <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px">Intervention</td><td style="font-size:14px;font-weight:600;text-align:right;padding-bottom:8px">${intervention.title}</td></tr>
              <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px">Client</td><td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:8px">${client?.firstName || ''} ${client?.lastName || ''}</td></tr>
              <tr><td style="font-size:13px;color:#71717a;padding-bottom:8px">Date</td><td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:8px">${dateStr}</td></tr>
              ${intervention.address ? `<tr><td style="font-size:13px;color:#71717a;padding-bottom:0">Adresse</td><td style="font-size:14px;font-weight:500;text-align:right;padding-bottom:0">${intervention.address}</td></tr>` : ''}
            </table>
            <div style="text-align:center;margin-bottom:32px">
              <a href="${baseUrl}/interventions/${id}" style="display:inline-block;padding:14px 40px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700">
                Voir l'intervention
              </a>
            </div>
            <p style="font-size:12px;color:#a1a1aa;text-align:center;border-top:1px solid #f4f4f5;padding-top:16px">
              Email envoyé via <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none">STRAVON</a>
            </p>
          </div>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Cet utilisateur est déjà assigné' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const { userId } = await request.json();

    const intervention = await prisma.intervention.findFirst({ where: { id, companyId: user.companyId } });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    await prisma.interventionAssignment.deleteMany({
      where: { interventionId: id, userId },
    });

    return NextResponse.json({ message: 'Désassigné' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}