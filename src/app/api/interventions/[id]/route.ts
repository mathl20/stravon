import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { interventionSchema } from '@/lib/validations';
import { calculateTTC } from '@/lib/utils';
import { canEditIntervention, canDeleteIntervention, getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    const { id } = await params;

    const intervention = await prisma.intervention.findFirst({
      where: { id, companyId: user.companyId, ...(!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) && { createdById: user.id }) } as any,
      include: {
        items: true,
        client: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        company: true,
        photos: { orderBy: { ordre: 'asc' } },
        materiels: { orderBy: { createdAt: 'desc' } },
        assignedUsers: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }, orderBy: { assignedAt: 'asc' } },
        devis: { include: { items: true } },
        factures: { include: { items: true }, orderBy: { date: 'desc' } },
        feuillesHeures: { include: { utilisateur: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { date: 'desc' } },
      } as any,
    });
    if (!intervention) return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 });

    // Calculate profitability with real hours from feuilles d'heures
    const coutMateriaux = ((intervention as any).materiels || []).reduce(
      (s: number, m: any) => s + m.quantite * (m.prixUnitaire || 0), 0
    );
    const tauxHoraire = (intervention as any).company?.tauxHoraire || 45;
    const totalHeures = ((intervention as any).feuillesHeures || []).reduce(
      (s: number, fh: any) => s + (fh.heuresTravaillees || 0), 0
    );
    const coutMO = (intervention as any).coutMainOeuvre ?? (totalHeures > 0 ? totalHeures * tauxHoraire : ((intervention as any).heuresEstimees ? (intervention as any).heuresEstimees * tauxHoraire : 0));
    const marge = intervention.amountHT - coutMateriaux - coutMO;
    const tauxMarge = intervention.amountHT > 0 ? Math.round((marge / intervention.amountHT) * 100) : 0;
    const rentabilite = { coutMateriaux, coutMO, marge, tauxMarge, tauxHoraire, totalHeures };

    return NextResponse.json({ data: { ...intervention, rentabilite } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.intervention.findFirst({ where: { id, companyId: user.companyId } as any });
    if (!existing) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 });

    // Vérifier les permissions
    const isOwner = (existing as any).createdById === user.id;
    if (!canEditIntervention(perms, isOwner)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Quick status update
    if (body.status && Object.keys(body).length === 1) {
      await prisma.intervention.updateMany({ where: { id, companyId: user.companyId }, data: { status: body.status } });
      return NextResponse.json({ message: 'Statut mis à jour' });
    }

    const parsed = interventionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const { title, description, date, clientId, status, tvaRate = 20, notes, items } = parsed.data;
    const amountHT = Math.round(items.reduce((s, it) => s + it.quantity * it.unitPrice, 0) * 100) / 100;
    const amountTTC = calculateTTC(amountHT, tvaRate);

    const heuresEstimees = body.heuresEstimees != null ? Number(body.heuresEstimees) || null : undefined;
    const coutMainOeuvre = body.coutMainOeuvre != null ? Number(body.coutMainOeuvre) || null : undefined;
    const address = body.address !== undefined ? (body.address || null) : undefined;

    await prisma.interventionItem.deleteMany({ where: { interventionId: id } });

    const intervention = await prisma.intervention.update({
      where: { id },
      data: {
        title, description: description || null, date: new Date(date), status: status || existing.status,
        amountHT, tvaRate, amountTTC, notes: notes || null, clientId,
        ...(heuresEstimees !== undefined && { heuresEstimees }),
        ...(coutMainOeuvre !== undefined && { coutMainOeuvre }),
        ...(address !== undefined && { address }),
        items: { create: items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, total: Math.round(it.quantity * it.unitPrice * 100) / 100 })) },
      },
      include: { items: true, client: true, createdBy: { select: { id: true, firstName: true, lastName: true } } } as any,
    });

    return NextResponse.json({ data: intervention });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    const { id } = await params;

    const existing = await prisma.intervention.findFirst({ where: { id, companyId: user.companyId } as any });
    if (!existing) return NextResponse.json({ error: 'Non trouvée' }, { status: 404 });

    const isOwner = (existing as any).createdById === user.id;
    if (!canDeleteIntervention(perms, isOwner)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await prisma.intervention.delete({ where: { id } });
    return NextResponse.json({ message: 'Supprimée' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
