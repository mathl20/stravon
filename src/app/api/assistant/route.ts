import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { formatPrestationsForPrompt, getDefaultPrestations } from '@/lib/prestations';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function buildSystemPrompt(
  clients: { id: string; firstName: string; lastName: string }[],
  employees: { id: string; firstName: string; lastName: string }[],
  tauxHoraire: number,
  metier: string,
  prestations: { label: string; category: string; hours: number }[],
  devisEnAttente: { id: string; reference: string; title: string; clientName: string; amountTTC: number; daysSent: number }[],
) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  const clientList = clients.map(c => `  - "${c.firstName} ${c.lastName}" (id: "${c.id}")`).join('\n');
  const employeeList = employees.map(e => `  - "${e.firstName} ${e.lastName}" (id: "${e.id}")`).join('\n');
  const catalogText = formatPrestationsForPrompt(prestations, tauxHoraire);

  return `Tu es l'assistant IA de Stravon, un logiciel de gestion pour artisans et PME du bâtiment.
Tu analyses des instructions en langage naturel et génères une liste d'actions à exécuter.
Tu es un EXPERT en estimation de travaux du bâtiment.

AUJOURD'HUI : ${todayStr} (${dayNames[today.getDay()]})
DEMAIN : ${tomorrowStr}

MÉTIER DE L'ENTREPRISE : ${metier}
TAUX HORAIRE MAIN D'ŒUVRE : ${tauxHoraire}€/h

CLIENTS EXISTANTS :
${clientList || '  (aucun)'}

EMPLOYÉS :
${employeeList || '  (aucun)'}

═══════════════════════════════════════
CATALOGUE DE PRESTATIONS (heures × taux horaire = prix) :
${catalogText}
═══════════════════════════════════════

Tu dois TOUJOURS répondre avec un JSON valide contenant un tableau "actions". Chaque action a un "type".

TYPES D'ACTIONS POSSIBLES :

1. "create_client" — Créer un nouveau client
   { "type": "create_client", "firstName": "...", "lastName": "...", "phone": "..." ou null, "email": "..." ou null, "address": "..." ou null, "city": "..." ou null }

2. "create_intervention" — Créer une intervention
   { "type": "create_intervention", "title": "...", "description": "..." ou null, "date": "YYYY-MM-DD", "clientName": "Nom du client", "clientId": "id si existant" ou null, "address": "..." ou null, "employeeName": "Prénom de l'employé" ou null, "employeeId": "id si trouvé" ou null, "items": [{"description": "...", "quantity": heures, "unitPrice": ${tauxHoraire}}] }

3. "create_devis" — Créer un devis
   { "type": "create_devis", "title": "...", "description": "..." ou null, "date": "YYYY-MM-DD", "clientName": "...", "clientId": "id si existant" ou null, "items": [{"description": "...", "quantity": heures, "unitPrice": ${tauxHoraire}}] }

4. "create_facture" — Créer une facture
   { "type": "create_facture", "clientName": "...", "clientId": "id si existant" ou null, "date": "YYYY-MM-DD", "items": [{"description": "...", "quantity": heures, "unitPrice": ${tauxHoraire}}] }

5. "create_planning" — Ajouter un créneau au planning
   { "type": "create_planning", "date": "YYYY-MM-DD", "heureDebut": "HH:MM", "heureFin": "HH:MM", "employeeName": "...", "employeeId": "id si trouvé" ou null }

6. "assign_employee" — Assigner un employé à une intervention (lié à une create_intervention du même batch)
   { "type": "assign_employee", "employeeName": "...", "employeeId": "id si trouvé" ou null, "interventionIndex": 0 }

7. "relancer_devis" — Relancer un client pour un devis en attente
   { "type": "relancer_devis", "devisId": "id du devis", "message": "Message personnalisé de relance" }

FORMAT DE RÉPONSE (JSON strict, rien d'autre) :
{
  "actions": [ ... ],
  "summary": "Résumé court en français de ce qui va être créé"
}

═══════════════════════════════════════
RÈGLES DE GÉNÉRATION DE DEVIS (TRÈS IMPORTANT) :
═══════════════════════════════════════

1. DÉCOMPOSER les travaux en LIGNES SÉPARÉES :
   - Chaque prestation identifiable = une ligne distincte dans items
   - NE PAS regrouper tout en une seule ligne "Main d'œuvre"
   - Utilise les prestations du catalogue ci-dessus comme référence

2. CHAQUE LIGNE représente une prestation :
   - description = nom de la prestation (ex: "Pose carrelage salle de bain")
   - quantity = nombre d'heures estimées pour cette prestation
   - unitPrice = ${tauxHoraire} (taux horaire de l'entreprise)

3. EXEMPLE — "Devis rénovation salle de bain avec douche et carrelage pour Dupont" :
   items devrait être :
   [
     {"description": "Dépose sanitaires existants", "quantity": 3, "unitPrice": ${tauxHoraire}},
     {"description": "Plomberie salle de bain", "quantity": 35, "unitPrice": ${tauxHoraire}},
     {"description": "Installation douche", "quantity": 4, "unitPrice": ${tauxHoraire}},
     {"description": "Pose carrelage salle de bain", "quantity": 20, "unitPrice": ${tauxHoraire}},
     {"description": "Évacuation gravats", "quantity": 2, "unitPrice": ${tauxHoraire}}
   ]

4. ADAPTER selon la description :
   - Si l'utilisateur mentionne "douche" → ajouter la ligne installation douche
   - Si "carrelage" → ajouter pose carrelage
   - Si "rénovation complète" → décomposer en toutes les sous-tâches nécessaires
   - Penser aux tâches complémentaires : dépose, évacuation, préparation, finitions

5. PRIX :
   - unitPrice = TOUJOURS ${tauxHoraire} (taux horaire). Pas 0, pas autre chose.
   - Si l'utilisateur précise un prix pour du matériel/fournitures, créer une ligne séparée pour les fournitures avec le prix indiqué et quantity=1
   - Si pas de prix mentionné pour les fournitures, ne PAS créer de ligne fournitures à 0€

6. NE JAMAIS mettre unitPrice à 0 pour une prestation de main d'œuvre.

═══════════════════════════════════════
DEVIS EN ATTENTE DE RÉPONSE :
═══════════════════════════════════════
${devisEnAttente.length > 0 ? devisEnAttente.map(d => `  - ${d.reference} "${d.title}" — ${d.clientName} — ${d.amountTTC}€ TTC — envoyé il y a ${d.daysSent} jour(s) (id: "${d.id}")`).join('\n') : '  (aucun devis en attente)'}

RÈGLES DE RELANCE :
- Si l'utilisateur demande de relancer un client ou un devis, utilise l'action "relancer_devis"
- Le message de relance doit être poli, professionnel et personnalisé (mentionner le nom du client, le titre du devis)
- Si l'utilisateur demande "quels devis sont en attente ?", liste-les dans le summary (sans action)
- Si un devis est en attente depuis plus de 7 jours, tu peux suggérer proactivement de relancer dans le summary

AUTRES RÈGLES :
- Si un client est mentionné et existe dans la liste, utilise son ID dans clientId. Sinon, mets clientId à null (on le créera).
- Si un employé est mentionné et existe dans la liste, utilise son ID. Sinon mets employeeId à null.
- "demain" = ${tomorrowStr}, "aujourd'hui" = ${todayStr}. Calcule les dates relatives (lundi prochain, etc.).
- Pour les heures de planning, déduis une durée raisonnable si heureFin n'est pas précisée (ex: 9h → 9h-12h).
- Quand une intervention ET un planning sont liés, crée les deux actions.
- Quand un employé est mentionné pour une intervention, ajoute à la fois assign_employee ET create_planning.
- Si un client n'existe pas, ajoute une action create_client AVANT les actions qui l'utilisent.
- Ne mets JAMAIS de texte avant ou après le JSON.`;
}

async function callClaude(systemPrompt: string, userMessage: string) {
  if (!ANTHROPIC_API_KEY) {
    return { actions: [], summary: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans .env.' };
  }

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
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Anthropic API error:', err);
    return { actions: [], summary: 'Erreur de communication avec l\'IA. Veuillez réessayer.' };
  }

  const result = await response.json();
  const text = result.content?.[0]?.text || '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { actions: [], summary: text || 'Réponse inattendue.' };
  }
}

// POST /api/assistant — Analyze prompt and return proposed actions
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const perms = getEffectivePermissions(user);
    const canUse = hasPermission(perms, PERMISSIONS.CLIENTS_MANAGE) ||
                   hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) ||
                   hasPermission(perms, PERMISSIONS.DEVIS_MANAGE);
    if (!canUse) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { prompt } = await request.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt requis' }, { status: 400 });
    }

    const [clients, employees, company, dbPrestations, devisEnvoyesRaw] = await Promise.all([
      prisma.client.findMany({
        where: { companyId: user.companyId },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { lastName: 'asc' },
        take: 200,
      }),
      prisma.user.findMany({
        where: { companyId: user.companyId },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { lastName: 'asc' },
      }),
      prisma.company.findUnique({
        where: { id: user.companyId },
        select: { tauxHoraire: true, metier: true },
      }),
      prisma.prestation.findMany({
        where: { companyId: user.companyId },
        select: { label: true, category: true, hours: true },
        orderBy: [{ category: 'asc' }, { label: 'asc' }],
      }),
      prisma.devis.findMany({
        where: { companyId: user.companyId, status: 'ENVOYE' },
        select: { id: true, reference: true, title: true, amountTTC: true, date: true, client: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'asc' },
        take: 20,
      }),
    ]);

    const tauxHoraire = company?.tauxHoraire ?? 45;
    const metier = company?.metier || 'multi-services';
    const prestations = dbPrestations.length > 0 ? dbPrestations : getDefaultPrestations(metier);
    const now = new Date();
    const devisEnAttente = devisEnvoyesRaw.map((d: any) => ({
      id: d.id,
      reference: d.reference,
      title: d.title,
      clientName: `${d.client.firstName} ${d.client.lastName}`,
      amountTTC: d.amountTTC,
      daysSent: Math.floor((now.getTime() - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24)),
    }));
    const systemPrompt = buildSystemPrompt(clients, employees, tauxHoraire, metier, prestations, devisEnAttente);
    const aiResponse = await callClaude(systemPrompt, prompt);

    return NextResponse.json({ data: aiResponse });
  } catch (error) {
    console.error('Assistant analyze error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
