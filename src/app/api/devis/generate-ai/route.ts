import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { formatPrestationsForPrompt, getDefaultPrestations } from '@/lib/prestations';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// POST /api/devis/generate-ai — Generate devis lines from description
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { description } = await request.json();
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description requise' }, { status: 400 });
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

L'utilisateur décrit des travaux. Tu dois générer les lignes d'un devis détaillé.

RÈGLES :
1. Décompose en lignes séparées (une prestation par ligne)
2. Utilise le catalogue comme référence pour les heures et le matériel
3. Chaque ligne : { "description": "...", "quantity": nombre, "unitPrice": prix_unitaire }
4. Pour la main d'œuvre : quantity = heures estimées, unitPrice = ${tauxHoraire}
5. Pour le matériel/fournitures : quantity = 1, unitPrice = coût estimé du matériel
6. Sépare toujours la main d'œuvre et le matériel en lignes distinctes quand le matériel est significatif
7. Pense aux tâches complémentaires : dépose, préparation, évacuation, finitions
8. Sois réaliste et détaillé dans les descriptions
9. Suggère aussi un titre pour le devis et une description courte

RÉPONDS UNIQUEMENT avec un JSON valide :
{
  "title": "Titre suggéré du devis",
  "description": "Description courte des travaux",
  "items": [
    { "description": "...", "quantity": ..., "unitPrice": ... }
  ],
  "conditionsPaiement": "Conditions de paiement suggérées",
  "delaiTravaux": "Délai estimé"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: description }],
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

      // Validate structure
      if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
        throw new Error('No items');
      }

      const items = parsed.items.map((it: any) => ({
        description: String(it.description || ''),
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || tauxHoraire,
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
      return NextResponse.json({ error: 'L\'IA n\'a pas pu générer un devis valide. Réessayez.' }, { status: 422 });
    }
  } catch (error) {
    console.error('Generate AI devis error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
