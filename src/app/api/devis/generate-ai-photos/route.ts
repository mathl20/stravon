import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { formatPrestationsForPrompt, getDefaultPrestations } from '@/lib/prestations';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// POST /api/devis/generate-ai-photos — Generate devis from photos + description
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { description, photos } = await request.json();

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: 'Au moins une photo est requise' }, { status: 400 });
    }

    if (photos.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 photos autorisées' }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Clé API IA non configurée' }, { status: 500 });
    }

    const [company, dbPrestations] = await Promise.all([
      prisma.company.findUnique({
        where: { id: user.companyId },
        select: { tauxHoraire: true, metier: true },
      }),
      prisma.prestation.findMany({
        where: { companyId: user.companyId },
        select: { label: true, category: true, hours: true, prixMateriel: true },
        orderBy: [{ category: 'asc' }, { label: 'asc' }],
      }),
    ]);

    const tauxHoraire = company?.tauxHoraire ?? 45;
    const metier = company?.metier || 'multi-services';
    const prestations = dbPrestations.length > 0 ? dbPrestations : getDefaultPrestations(metier);
    const catalogText = formatPrestationsForPrompt(prestations, tauxHoraire);

    const systemPrompt = `Tu es un expert en estimation de travaux du bâtiment pour une entreprise de ${metier}.
Taux horaire main d'œuvre : ${tauxHoraire}€/h.

CATALOGUE DE PRESTATIONS :
${catalogText}

L'utilisateur t'envoie des PHOTOS d'un chantier et éventuellement une description.
Tu dois analyser les photos pour identifier les travaux nécessaires et générer un devis détaillé.

RÈGLES :
1. Analyse attentivement chaque photo pour identifier : état des lieux, surface approximative, matériaux visibles, travaux à réaliser
2. Décompose en lignes séparées avec le TYPE correct pour chaque ligne :
   - "main_oeuvre" : heures de travail (quantity = heures, unitPrice = ${tauxHoraire})
   - "materiel" : fournitures et matériaux (quantity = nombre, unitPrice = coût unitaire estimé)
   - "prestation" : prestations forfaitaires
3. Utilise le catalogue comme référence pour les prix et les heures
4. Pense aux tâches complémentaires : dépose, préparation, nettoyage, évacuation
5. Sois réaliste dans les estimations de surface, quantités et durées
6. Suggère un titre clair et une description des travaux

RÉPONDS UNIQUEMENT avec un JSON valide :
{
  "title": "Titre suggéré du devis",
  "description": "Description détaillée des travaux identifiés sur les photos",
  "items": [
    { "description": "...", "quantity": ..., "unitPrice": ..., "type": "main_oeuvre|materiel|prestation" }
  ],
  "conditionsPaiement": "Conditions de paiement suggérées",
  "delaiTravaux": "Délai estimé"
}`;

    // Build multimodal content: photos + text
    const content: any[] = [];

    for (const photo of photos) {
      // photo is base64 string (with or without data URI prefix)
      let base64Data = photo;
      let mediaType = 'image/jpeg';

      if (photo.startsWith('data:')) {
        const match = photo.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          mediaType = match[1];
          base64Data = match[2];
        }
      }

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      });
    }

    content.push({
      type: 'text',
      text: description
        ? `Description du chantier par l'artisan : ${description}\n\nAnalyse les photos ci-dessus et génère un devis détaillé.`
        : `Analyse les photos ci-dessus et génère un devis détaillé pour les travaux identifiés.`,
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      console.error('Anthropic API error:', await response.text());
      return NextResponse.json({ error: 'Erreur de communication avec l\'IA' }, { status: 502 });
    }

    const result = await response.json();
    const text = result.content?.[0]?.text || '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
        throw new Error('No items');
      }

      const items = parsed.items.map((it: any) => ({
        description: String(it.description || ''),
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || tauxHoraire,
        type: ['main_oeuvre', 'materiel', 'prestation'].includes(it.type) ? it.type : 'prestation',
      }));

      return NextResponse.json({
        data: {
          title: parsed.title || '',
          description: parsed.description || '',
          items,
          conditionsPaiement: parsed.conditionsPaiement || '',
          delaiTravaux: parsed.delaiTravaux || '',
        },
      });
    } catch {
      return NextResponse.json({ error: 'L\'IA n\'a pas pu analyser les photos. Réessayez avec des photos plus claires.' }, { status: 422 });
    }
  } catch (error) {
    console.error('Generate AI photos devis error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
