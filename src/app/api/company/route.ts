export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { companySchema } from '@/lib/validations';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const company = await prisma.company.findUnique({ where: { id: user.companyId } });
    if (!company) return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 });

    const res = NextResponse.json({ data: company });
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const body = await request.json();
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

    const data: Record<string, unknown> = {
      ...parsed.data,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      postalCode: parsed.data.postalCode || null,
      siret: parsed.data.siret || null,
      logoUrl: parsed.data.logoUrl || null,
      primaryColor: parsed.data.primaryColor || null,
    };

    // Handle extra fields not in companySchema
    if (body.tauxHoraire != null) data.tauxHoraire = Number(body.tauxHoraire) || 45;
    if (body.metier != null) data.metier = String(body.metier);
    if (body.relancesActive != null) data.relancesActive = Boolean(body.relancesActive);
    if (body.relancesJours != null && Array.isArray(body.relancesJours)) {
      data.relancesJours = body.relancesJours.map((j: any) => Number(j) || 7);
    }
    if (body.devisRelancesActive != null) data.devisRelancesActive = Boolean(body.devisRelancesActive);
    if (body.devisRelancesJours != null && Array.isArray(body.devisRelancesJours)) {
      data.devisRelancesJours = body.devisRelancesJours.map((j: any) => Number(j) || 3);
    }

    // Legal / fiscal fields
    if (body.tvaIntra != null) data.tvaIntra = String(body.tvaIntra) || null;
    if (body.formeJuridique != null) data.formeJuridique = String(body.formeJuridique) || null;
    if (body.capitalSocial != null) data.capitalSocial = String(body.capitalSocial) || null;
    if (body.codeAPE != null) data.codeAPE = String(body.codeAPE) || null;
    if (body.rcs != null) data.rcs = String(body.rcs) || null;

    // Assurance decennale
    if (body.assuranceDecennaleNom != null) data.assuranceDecennaleNom = String(body.assuranceDecennaleNom) || null;
    if (body.assuranceDecennaleNumero != null) data.assuranceDecennaleNumero = String(body.assuranceDecennaleNumero) || null;
    if (body.assuranceDecennaleZone != null) data.assuranceDecennaleZone = String(body.assuranceDecennaleZone) || null;

    // Default legal conditions
    if (body.conditionsGeneralesDevis != null) data.conditionsGeneralesDevis = String(body.conditionsGeneralesDevis) || null;
    if (body.delaiPaiementJours != null) data.delaiPaiementJours = Number(body.delaiPaiementJours) || 30;
    if (body.dureeValiditeDevis != null) data.dureeValiditeDevis = Number(body.dureeValiditeDevis) || 30;

    // TVA regime
    if (body.regimeTVA != null) data.regimeTVA = ['assujetti', 'franchise'].includes(body.regimeTVA) ? body.regimeTVA : 'assujetti';

    // Coordonnees bancaires
    if (body.iban != null) data.iban = String(body.iban).replace(/\s+/g, '').toUpperCase() || null;
    if (body.bic != null) data.bic = String(body.bic).replace(/\s+/g, '').toUpperCase() || null;
    if (body.nomBanque != null) data.nomBanque = String(body.nomBanque) || null;

    const company = await prisma.company.update({
      where: { id: user.companyId },
      data: data as any,
    });

    return NextResponse.json({ data: company });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}