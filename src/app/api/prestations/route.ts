export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getDefaultPrestations } from '@/lib/prestations';

// GET - List company prestations
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const prestations = await prisma.prestation.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    });

    return NextResponse.json({ data: prestations });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create a new prestation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();

    // Handle "reset to defaults" action — deletes all and reimports
    if (body.action === 'reset') {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { metier: true },
      });
      const metier = body.metier || company?.metier || 'multi-services';
      const defaults = getDefaultPrestations(metier);

      await prisma.prestation.deleteMany({ where: { companyId: user.companyId } });
      if (defaults.length > 0) {
        await prisma.prestation.createMany({
          data: defaults.map((p) => ({
            label: p.label,
            description: p.description || null,
            category: p.category,
            hours: p.hours,
            prixMateriel: p.prixMateriel || 0,
            metier,
            companyId: user.companyId,
          })),
        });
      }

      const prestations = await prisma.prestation.findMany({
        where: { companyId: user.companyId },
        orderBy: [{ category: 'asc' }, { label: 'asc' }],
      });
      return NextResponse.json({ data: prestations });
    }

    // Handle "load-defaults" action — imports defaults without deleting existing
    if (body.action === 'load-defaults') {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { metier: true },
      });
      const metier = body.metier || company?.metier || 'multi-services';
      const defaults = getDefaultPrestations(metier);

      // Get existing labels to avoid duplicates
      const existing = await prisma.prestation.findMany({
        where: { companyId: user.companyId },
        select: { label: true },
      });
      const existingLabels = new Set(existing.map((p) => p.label));

      const toCreate = defaults.filter((p) => !existingLabels.has(p.label));
      if (toCreate.length > 0) {
        await prisma.prestation.createMany({
          data: toCreate.map((p) => ({
            label: p.label,
            description: p.description || null,
            category: p.category,
            hours: p.hours,
            prixMateriel: p.prixMateriel || 0,
            metier,
            companyId: user.companyId,
          })),
        });
      }

      const prestations = await prisma.prestation.findMany({
        where: { companyId: user.companyId },
        orderBy: [{ category: 'asc' }, { label: 'asc' }],
      });
      return NextResponse.json({ data: prestations, added: toCreate.length });
    }

    const { label, category, hours, description, prixMateriel } = body;
    if (!label || !category || hours == null) {
      return NextResponse.json({ error: 'Label, catégorie et heures requis' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { metier: true },
    });

    const prestation = await prisma.prestation.create({
      data: {
        label: String(label).trim(),
        description: description ? String(description).trim() : null,
        category: String(category).trim(),
        hours: Number(hours),
        prixMateriel: Number(prixMateriel) || 0,
        metier: company?.metier || 'multi-services',
        companyId: user.companyId,
      },
    });

    return NextResponse.json({ data: prestation }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}