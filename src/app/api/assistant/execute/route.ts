export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { generateReference, generateDevisReference, calculateTTC } from '@/lib/utils';
import { createNotification } from '@/lib/notifications';

interface ActionResult {
  type: string;
  success: boolean;
  message: string;
  link?: string;
  createdId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const perms = getEffectivePermissions(user);
    const canUse = hasPermission(perms, PERMISSIONS.CLIENTS_MANAGE) ||
                   hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) ||
                   hasPermission(perms, PERMISSIONS.DEVIS_MANAGE);
    if (!canUse) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

    const { actions } = await request.json();
    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json({ error: 'Aucune action à exécuter' }, { status: 400 });
    }

    // Fetch company's hourly rate for labor lines
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { tauxHoraire: true },
    });
    const tauxHoraire = company?.tauxHoraire ?? 45;

    const results: ActionResult[] = [];
    // Track created IDs for cross-referencing (e.g., client created → used in intervention)
    const createdClients: Record<string, string> = {}; // clientName → clientId
    const createdInterventions: string[] = []; // by index

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_client': {
            if (!hasPermission(perms, PERMISSIONS.CLIENTS_MANAGE)) {
              results.push({ type: 'create_client', success: false, message: 'Permission refusée' });
              break;
            }
            const client = await prisma.client.create({
              data: {
                firstName: String(action.firstName || '').trim() || 'Client',
                lastName: String(action.lastName || '').trim() || 'Inconnu',
                email: action.email ? String(action.email) : null,
                phone: action.phone ? String(action.phone) : null,
                address: action.address ? String(action.address) : null,
                city: action.city ? String(action.city) : null,
                postalCode: action.postalCode ? String(action.postalCode) : null,
                companyId: user.companyId,
              },
            });
            const name = `${action.firstName || ''} ${action.lastName || ''}`.trim();
            createdClients[name.toLowerCase()] = client.id;
            results.push({ type: 'create_client', success: true, message: `Client ${client.firstName} ${client.lastName} créé`, link: `/clients/${client.id}`, createdId: client.id });
            break;
          }

          case 'create_intervention': {
            if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE)) {
              results.push({ type: 'create_intervention', success: false, message: 'Permission refusée' });
              createdInterventions.push('');
              break;
            }

            // Resolve client ID
            let clientId = action.clientId;
            if (!clientId && action.clientName) {
              const nameKey = String(action.clientName).toLowerCase();
              // Check if we just created this client
              if (createdClients[nameKey]) {
                clientId = createdClients[nameKey];
              } else {
                // Try to find by name
                const found = await prisma.client.findFirst({
                  where: {
                    companyId: user.companyId,
                    OR: [
                      { lastName: { contains: action.clientName, mode: 'insensitive' } },
                      { firstName: { contains: action.clientName, mode: 'insensitive' } },
                    ],
                  },
                });
                if (found) clientId = found.id;
              }
            }

            if (!clientId) {
              // Also check all created clients with partial match
              const searchName = String(action.clientName || '').toLowerCase();
              for (const [name, id] of Object.entries(createdClients)) {
                if (name.includes(searchName) || searchName.includes(name)) {
                  clientId = id;
                  break;
                }
              }
            }

            if (!clientId) {
              results.push({ type: 'create_intervention', success: false, message: `Client "${action.clientName}" non trouvé` });
              createdInterventions.push('');
              break;
            }

            let items = Array.isArray(action.items) && action.items.length > 0
              ? [...action.items]
              : [{ description: action.title || 'Prestation', quantity: 1, unitPrice: tauxHoraire }];

            // Apply company hourly rate to any labor item with unitPrice=0
            items = items.map((it: any) => {
              if (!it.unitPrice || Number(it.unitPrice) === 0) {
                return { ...it, unitPrice: tauxHoraire };
              }
              return it;
            });

            const amountHT = Math.round(items.reduce((s: number, it: any) => s + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0) * 100) / 100;
            const tvaRate = Number(action.tvaRate) || 20;
            const amountTTC = calculateTTC(amountHT, tvaRate);

            const intervention = await prisma.intervention.create({
              data: {
                reference: generateReference(),
                title: String(action.title || 'Intervention'),
                description: action.description ? String(action.description) : null,
                address: action.address ? String(action.address) : null,
                date: action.date ? new Date(String(action.date)) : new Date(),
                status: 'PENDING',
                amountHT,
                tvaRate,
                amountTTC,
                clientId,
                createdById: user.id,
                companyId: user.companyId,
                items: {
                  create: items.map((it: any) => ({
                    description: String(it.description || 'Prestation'),
                    quantity: Number(it.quantity) || 1,
                    unitPrice: Number(it.unitPrice) || 0,
                    total: Math.round((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) * 100) / 100,
                  })),
                },
              } as any,
            });

            createdInterventions.push(intervention.id);
            results.push({ type: 'create_intervention', success: true, message: `Intervention "${intervention.title}" créée`, link: `/interventions/${intervention.id}`, createdId: intervention.id });
            break;
          }

          case 'create_devis': {
            if (!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE)) {
              results.push({ type: 'create_devis', success: false, message: 'Permission refusée' });
              break;
            }

            let clientId = action.clientId;
            if (!clientId && action.clientName) {
              const nameKey = String(action.clientName).toLowerCase();
              if (createdClients[nameKey]) clientId = createdClients[nameKey];
              else {
                const found = await prisma.client.findFirst({
                  where: { companyId: user.companyId, OR: [{ lastName: { contains: action.clientName, mode: 'insensitive' } }, { firstName: { contains: action.clientName, mode: 'insensitive' } }] },
                });
                if (found) clientId = found.id;
              }
            }
            if (!clientId) {
              const searchName = String(action.clientName || '').toLowerCase();
              for (const [name, id] of Object.entries(createdClients)) {
                if (name.includes(searchName) || searchName.includes(name)) { clientId = id; break; }
              }
            }
            if (!clientId) {
              results.push({ type: 'create_devis', success: false, message: `Client "${action.clientName}" non trouvé` });
              break;
            }

            let items = Array.isArray(action.items) && action.items.length > 0 ? [...action.items] : [{ description: action.title || 'Prestation', quantity: 1, unitPrice: tauxHoraire }];

            // Apply company hourly rate to any item with unitPrice=0
            items = items.map((it: any) => {
              if (!it.unitPrice || Number(it.unitPrice) === 0) {
                return { ...it, unitPrice: tauxHoraire };
              }
              return it;
            });

            const amountHT = Math.round(items.reduce((s: number, it: any) => s + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0) * 100) / 100;
            const tvaRate = Number(action.tvaRate) || 20;

            const devis = await prisma.devis.create({
              data: {
                reference: generateDevisReference(),
                title: String(action.title || 'Devis'),
                description: action.description ? String(action.description) : null,
                date: action.date ? new Date(String(action.date)) : new Date(),
                status: 'BROUILLON',
                amountHT,
                tvaRate,
                amountTTC: calculateTTC(amountHT, tvaRate),
                clientId,
                createdById: user.id,
                companyId: user.companyId,
                items: {
                  create: items.map((it: any) => ({
                    description: String(it.description || 'Prestation'),
                    quantity: Number(it.quantity) || 1,
                    unitPrice: Number(it.unitPrice) || 0,
                    total: Math.round((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) * 100) / 100,
                  })),
                },
              },
            });

            results.push({ type: 'create_devis', success: true, message: `Devis "${devis.title}" créé`, link: `/devis/${devis.id}`, createdId: devis.id });
            break;
          }

          case 'create_facture': {
            if (!hasPermission(perms, PERMISSIONS.FACTURES_MANAGE)) {
              results.push({ type: 'create_facture', success: false, message: 'Permission refusée' });
              break;
            }

            let clientId = action.clientId;
            if (!clientId && action.clientName) {
              const nameKey = String(action.clientName).toLowerCase();
              if (createdClients[nameKey]) clientId = createdClients[nameKey];
              else {
                const found = await prisma.client.findFirst({
                  where: { companyId: user.companyId, OR: [{ lastName: { contains: action.clientName, mode: 'insensitive' } }, { firstName: { contains: action.clientName, mode: 'insensitive' } }] },
                });
                if (found) clientId = found.id;
              }
            }
            if (!clientId) {
              const searchName = String(action.clientName || '').toLowerCase();
              for (const [name, id] of Object.entries(createdClients)) {
                if (name.includes(searchName) || searchName.includes(name)) { clientId = id; break; }
              }
            }
            if (!clientId) {
              results.push({ type: 'create_facture', success: false, message: `Client "${action.clientName}" non trouvé` });
              break;
            }

            let items = Array.isArray(action.items) && action.items.length > 0 ? [...action.items] : [{ description: 'Prestation', quantity: 1, unitPrice: tauxHoraire }];

            // Apply company hourly rate to any item with unitPrice=0
            items = items.map((it: any) => {
              if (!it.unitPrice || Number(it.unitPrice) === 0) {
                return { ...it, unitPrice: tauxHoraire };
              }
              return it;
            });

            const amountHT = Math.round(items.reduce((s: number, it: any) => s + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0) * 100) / 100;
            const tvaRate = Number(action.tvaRate) || 20;

            // Generate facture number
            const year = new Date().getFullYear();
            const prefix = `FAC-${year}-`;
            const lastFacture = await prisma.facture.findFirst({
              where: { companyId: user.companyId, numero: { startsWith: prefix } },
              orderBy: { numero: 'desc' },
            });
            const lastNum = lastFacture ? parseInt(lastFacture.numero.split('-')[2]) : 0;
            const numero = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;

            // Link to intervention if one was just created
            let interventionId = action.interventionId || null;
            if (!interventionId && action.interventionIndex != null && createdInterventions[action.interventionIndex]) {
              interventionId = createdInterventions[action.interventionIndex];
            }

            const facture = await prisma.facture.create({
              data: {
                numero,
                date: action.date ? new Date(String(action.date)) : new Date(),
                amountHT,
                tvaRate,
                amountTTC: calculateTTC(amountHT, tvaRate),
                clientId,
                interventionId,
                companyId: user.companyId,
                createdById: user.id,
                items: {
                  create: items.map((it: any) => ({
                    description: String(it.description || 'Prestation'),
                    quantity: Number(it.quantity) || 1,
                    unitPrice: Number(it.unitPrice) || 0,
                    total: Math.round((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0) * 100) / 100,
                  })),
                },
              },
            });

            results.push({ type: 'create_facture', success: true, message: `Facture ${facture.numero} créée`, link: `/factures/${facture.id}`, createdId: facture.id });
            break;
          }

          case 'create_planning': {
            if (!hasPermission(perms, PERMISSIONS.PLANNING_MANAGE)) {
              results.push({ type: 'create_planning', success: false, message: 'Permission refusée' });
              break;
            }

            let employeeId = action.employeeId;
            if (!employeeId && action.employeeName) {
              const emp = await prisma.user.findFirst({
                where: { companyId: user.companyId, firstName: { contains: action.employeeName, mode: 'insensitive' } },
              });
              if (emp) employeeId = emp.id;
            }
            if (!employeeId) {
              results.push({ type: 'create_planning', success: false, message: `Employé "${action.employeeName}" non trouvé` });
              break;
            }

            const dateStr = String(action.date || new Date().toISOString().split('T')[0]);
            const heureDebut = String(action.heureDebut || '08:00');
            const heureFin = String(action.heureFin || '12:00');

            // Link to intervention if available
            let interventionId = action.interventionId || null;
            if (!interventionId && action.interventionIndex != null && createdInterventions[action.interventionIndex]) {
              interventionId = createdInterventions[action.interventionIndex];
            }

            const planning = await prisma.planning.create({
              data: {
                date: new Date(dateStr),
                heureDebut: new Date(`${dateStr}T${heureDebut}`),
                heureFin: new Date(`${dateStr}T${heureFin}`),
                statut: 'PREVU',
                utilisateurId: employeeId,
                interventionId,
                entrepriseId: user.companyId,
              },
            });

            if (employeeId !== user.id) {
              createNotification('PLANNING', `Nouveau créneau planifié le ${new Date(dateStr).toLocaleDateString('fr-FR')}`, '/planning', employeeId, user.companyId);
            }

            results.push({ type: 'create_planning', success: true, message: `Planning créé pour ${action.employeeName}`, link: '/planning', createdId: planning.id });
            break;
          }

          case 'assign_employee': {
            const interventionIndex = action.interventionIndex ?? 0;
            const interventionId = createdInterventions[interventionIndex];
            if (!interventionId) {
              results.push({ type: 'assign_employee', success: false, message: 'Intervention non trouvée pour l\'assignation' });
              break;
            }

            let employeeId = action.employeeId;
            if (!employeeId && action.employeeName) {
              const emp = await prisma.user.findFirst({
                where: { companyId: user.companyId, firstName: { contains: action.employeeName, mode: 'insensitive' } },
              });
              if (emp) employeeId = emp.id;
            }
            if (!employeeId) {
              results.push({ type: 'assign_employee', success: false, message: `Employé "${action.employeeName}" non trouvé` });
              break;
            }

            await prisma.interventionAssignment.create({
              data: { interventionId, userId: employeeId },
            });

            results.push({ type: 'assign_employee', success: true, message: `${action.employeeName} assigné à l'intervention` });
            break;
          }

          case 'relancer_devis': {
            if (!hasPermission(perms, PERMISSIONS.DEVIS_MANAGE)) {
              results.push({ type: 'relancer_devis', success: false, message: 'Permission refusée' });
              break;
            }

            const devisId = action.devisId;
            if (!devisId) {
              results.push({ type: 'relancer_devis', success: false, message: 'ID du devis requis' });
              break;
            }

            const devis = await prisma.devis.findFirst({
              where: { id: devisId, companyId: user.companyId, status: 'ENVOYE' },
              include: { client: true, relances: true } as any,
            });

            if (!devis) {
              results.push({ type: 'relancer_devis', success: false, message: 'Devis non trouvé ou pas en statut envoyé' });
              break;
            }

            const existingRelances = ((devis as any).relances || []) as any[];
            const nextNumero = existingRelances.length + 1;

            await (prisma as any).relanceDevis.create({
              data: {
                numero: nextNumero,
                message: action.message ? String(action.message) : null,
                devisId: devis.id,
                companyId: user.companyId,
              },
            });

            // Notify managers
            const managers = await prisma.user.findMany({
              where: { companyId: user.companyId, role: { in: ['PATRON', 'SECRETAIRE'] } },
            });
            const clientName = `${(devis as any).client.firstName} ${(devis as any).client.lastName}`;
            for (const manager of managers) {
              await createNotification(
                'RELANCE_DEVIS',
                `Relance n°${nextNumero} — Devis ${devis.reference} — ${clientName}`,
                `/devis/${devis.id}`,
                manager.id,
                user.companyId
              );
            }

            results.push({ type: 'relancer_devis', success: true, message: `Relance n°${nextNumero} créée pour le devis ${devis.reference}`, link: `/devis/${devis.id}` });
            break;
          }

          default:
            results.push({ type: action.type, success: false, message: `Action inconnue: ${action.type}` });
        }
      } catch (err: any) {
        console.error(`Action ${action.type} error:`, err);
        results.push({ type: action.type, success: false, message: err.message || 'Erreur' });
      }
    }

    return NextResponse.json({ data: { results } });
  } catch (error) {
    console.error('Assistant execute error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}