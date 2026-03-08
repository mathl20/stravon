import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createToken, setAuthCookie } from '@/lib/auth';
import { getDemoData, DEMO_METIERS } from '@/lib/demo-data';
import { generateReference, generateDevisReference, calculateTTC } from '@/lib/utils';
import bcrypt from 'bcryptjs';

const DEMO_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest) {
  try {
    const { metier } = await request.json();

    if (!metier || !DEMO_METIERS.find((m) => m.id === metier)) {
      return NextResponse.json({ error: 'Metier invalide' }, { status: 400 });
    }

    // Clean up expired demos first (non-blocking best-effort)
    prisma.company.deleteMany({
      where: { isDemo: true, demoExpiresAt: { lt: new Date() } },
    }).catch(() => {});

    const demoData = getDemoData(metier);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEMO_DURATION_MS);

    // Create demo company
    const company = await prisma.company.create({
      data: {
        name: demoData.companyName,
        email: `demo-${Date.now()}@stravon.demo`,
        metier,
        isDemo: true,
        demoExpiresAt: expiresAt,
        tauxHoraire: 45,
      },
    });

    // Create demo user
    const passwordHash = await bcrypt.hash('demo1234', 10);
    const user = await prisma.user.create({
      data: {
        email: `demo-${Date.now()}@stravon.demo`,
        passwordHash,
        firstName: 'Utilisateur',
        lastName: 'Demo',
        role: 'PATRON',
        permissions: [],
        companyId: company.id,
      },
    });

    // Create clients
    const clients = await Promise.all(
      demoData.clients.map((c) =>
        prisma.client.create({
          data: { ...c, companyId: company.id },
        })
      )
    );

    // Create interventions with items and materials
    const interventions = [];
    for (const intv of demoData.interventions) {
      const client = clients[intv.clientIndex];
      const amountTTC = calculateTTC(intv.data.amountHT, intv.data.tvaRate);
      const daysAgo = intv.data.status === 'PAID' ? 15 : intv.data.status === 'INVOICED' ? 5 : 0;

      const intervention = await prisma.intervention.create({
        data: {
          reference: generateReference(),
          title: intv.data.title,
          description: intv.data.description,
          address: intv.data.address,
          date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          status: intv.data.status,
          amountHT: intv.data.amountHT,
          tvaRate: intv.data.tvaRate,
          amountTTC,
          heuresEstimees: intv.data.heuresEstimees,
          clientId: client.id,
          createdById: user.id,
          companyId: company.id,
          items: {
            create: intv.data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          },
          ...(intv.data.materiels
            ? {
                materiels: {
                  create: intv.data.materiels.map((m) => ({
                    nom: m.nom,
                    quantite: m.quantite,
                    prixUnitaire: m.prixUnitaire,
                  })),
                },
              }
            : {}),
        },
      });
      interventions.push(intervention);
    }

    // Create devis with items
    for (const dv of demoData.devis) {
      const client = clients[dv.clientIndex];
      const amountTTC = calculateTTC(dv.data.amountHT, dv.data.tvaRate);
      const daysAgo = dv.data.status === 'ENVOYE' ? 10 : 0;

      await prisma.devis.create({
        data: {
          reference: generateDevisReference(),
          title: dv.data.title,
          description: dv.data.description,
          date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          status: dv.data.status as any,
          amountHT: dv.data.amountHT,
          tvaRate: dv.data.tvaRate,
          amountTTC,
          clientId: client.id,
          createdById: user.id,
          companyId: company.id,
          items: {
            create: dv.data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          },
        },
      });
    }

    // Create factures
    for (const fac of demoData.factures) {
      const client = clients[fac.clientIndex];
      const intervention = interventions[fac.interventionIndex];
      const amountTTC = calculateTTC(fac.data.amountHT, fac.data.tvaRate);
      const numero = `FAC-DEMO-${Date.now().toString(36).toUpperCase()}`;

      await prisma.facture.create({
        data: {
          numero,
          date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
          status: fac.data.status,
          amountHT: fac.data.amountHT,
          tvaRate: fac.data.tvaRate,
          amountTTC,
          datePaiement: fac.data.status === 'PAID' ? new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) : undefined,
          modePaiement: fac.data.status === 'PAID' ? 'virement' : undefined,
          interventionId: intervention?.id,
          clientId: client.id,
          companyId: company.id,
          createdById: user.id,
          items: {
            create: fac.data.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          },
        },
      });
    }

    // Create session token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: company.id,
    });

    // Set session cookie (no maxAge = session cookie, deleted when browser closes)
    const response = NextResponse.json({ success: true });
    response.cookies.set('stravon-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // No maxAge/expires → session cookie (cleared on browser close)
    });
    response.cookies.set('stravon-demo', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Demo start error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
