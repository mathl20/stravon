export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const siret = request.nextUrl.searchParams.get('siret');

  if (!siret || !/^\d{14}$/.test(siret)) {
    return NextResponse.json({ error: 'SIRET invalide (14 chiffres requis)' }, { status: 400 });
  }

  try {
    // API officielle INSEE via api.insee.fr proxy (recherche-entreprises.api.gouv.fr)
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${siret}&mtm_campaign=stravon`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Impossible de verifier le SIRET' }, { status: 502 });
    }

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ error: 'Aucune entreprise trouvee pour ce SIRET' }, { status: 404 });
    }

    const entreprise = data.results[0];
    const siege = entreprise.siege;

    return NextResponse.json({
      nom: entreprise.nom_complet || entreprise.nom_raison_sociale || '',
      address: siege?.adresse || [siege?.numero_voie, siege?.type_voie, siege?.libelle_voie].filter(Boolean).join(' ') || '',
      postalCode: siege?.code_postal || '',
      city: siege?.libelle_commune || '',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la verification du SIRET' }, { status: 500 });
  }
}