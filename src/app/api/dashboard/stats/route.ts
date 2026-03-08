export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const sp = new URL(request.url).searchParams;
    const advanced = sp.get('advanced') === 'true';
    const fromParam = sp.get('from');
    const toParam = sp.get('to');

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const perms = getEffectivePermissions(user);
    const isEmploye = !hasPermission(perms, PERMISSIONS.DASHBOARD_REVENUE);
    const isPatron = hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE);

    // ── ADVANCED STATS (lazy loaded, PATRON only) ──
    if (advanced && isPatron) {
      const dateFilter = fromParam && toParam
        ? Prisma.sql`AND date >= ${new Date(fromParam)} AND date <= ${new Date(toParam)}`
        : Prisma.sql`AND date >= ${startOfYear}`;
      const heuresDateFilter = fromParam && toParam
        ? Prisma.sql`AND fh.date >= ${new Date(fromParam)} AND fh.date <= ${new Date(toParam)}`
        : Prisma.sql`AND fh.date >= ${startOfYear}`;

      const [topClients, caEmployes, statusDistrib, totalDevis, devisAcceptes, heuresParEmploye, facturesEnRetardRaw, profitabilityRaw, devisEnvoyesRaw, devisRelancesCount] = await Promise.all([
        prisma.$queryRaw(Prisma.sql`
          SELECT CONCAT(c."firstName", ' ', c."lastName") as name, COALESCE(SUM(i."amountTTC"), 0)::float as value
          FROM interventions i JOIN clients c ON i."clientId" = c.id
          WHERE i."companyId" = ${user.companyId} AND i.status = 'PAID' ${dateFilter}
          GROUP BY c.id, c."firstName", c."lastName" ORDER BY value DESC LIMIT 5
        `),
        prisma.$queryRaw(Prisma.sql`
          SELECT CONCAT(u."firstName", ' ', u."lastName") as name, COALESCE(SUM(i."amountTTC"), 0)::float as value
          FROM interventions i JOIN users u ON i."createdById" = u.id
          WHERE i."companyId" = ${user.companyId} AND i.status = 'PAID' ${dateFilter}
          GROUP BY u.id, u."firstName", u."lastName" ORDER BY value DESC
        `),
        prisma.$queryRaw(Prisma.sql`
          SELECT status, COUNT(*)::int as count FROM interventions
          WHERE "companyId" = ${user.companyId} GROUP BY status
        `),
        prisma.devis.count({ where: { companyId: user.companyId } as any }),
        prisma.devis.count({ where: { companyId: user.companyId, status: 'ACCEPTE' } as any }),
        prisma.$queryRaw(Prisma.sql`
          SELECT CONCAT(u."firstName", ' ', u."lastName") as name, COALESCE(SUM(fh."heuresTravaillees"), 0)::float as value
          FROM feuilles_heures fh JOIN users u ON fh."utilisateurId" = u.id
          WHERE fh."entrepriseId" = ${user.companyId} ${heuresDateFilter}
          GROUP BY u.id, u."firstName", u."lastName" ORDER BY value DESC
        `),
        prisma.facture.count({
          where: {
            companyId: user.companyId,
            status: 'EN_ATTENTE',
            dateEcheance: { lt: now },
          } as any,
        }),
        // Profitability: per-intervention CA, material costs, labor hours+costs
        prisma.$queryRaw(Prisma.sql`
          SELECT
            i.id,
            i.title,
            i."amountHT"::float as "amountHT",
            COALESCE(i."coutMainOeuvre", 0)::float as "coutMainOeuvre",
            COALESCE(i."heuresEstimees", 0)::float as "heuresEstimees",
            COALESCE(mat.cout_materiaux, 0)::float as "coutMateriaux",
            COALESCE(fh.total_heures, 0)::float as "totalHeures"
          FROM interventions i
          LEFT JOIN (
            SELECT "interventionId", SUM(quantite * "prixUnitaire")::float as cout_materiaux
            FROM materiels_utilises GROUP BY "interventionId"
          ) mat ON mat."interventionId" = i.id
          LEFT JOIN (
            SELECT "interventionId", SUM("heuresTravaillees")::float as total_heures
            FROM feuilles_heures GROUP BY "interventionId"
          ) fh ON fh."interventionId" = i.id
          WHERE i."companyId" = ${user.companyId} AND i.status = 'PAID' ${dateFilter}
        `),
        // Devis en attente (ENVOYE) with total amount
        prisma.$queryRaw(Prisma.sql`
          SELECT COUNT(*)::int as count, COALESCE(SUM("amountTTC"), 0)::float as total
          FROM devis WHERE "companyId" = ${user.companyId} AND status = 'ENVOYE'
        `),
        // Devis relancés count
        prisma.$queryRaw(Prisma.sql`
          SELECT COUNT(DISTINCT d.id)::int as count
          FROM devis d JOIN relances_devis rd ON rd."devisId" = d.id
          WHERE d."companyId" = ${user.companyId} AND d.status = 'ENVOYE'
        `),
      ]);

      // Calculate profitability metrics
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { tauxHoraire: true },
      });
      const tauxHoraire = (company as any)?.tauxHoraire || 45;

      const profItems = (profitabilityRaw as any[]).map((row) => {
        const coutMO = row.coutMainOeuvre > 0
          ? row.coutMainOeuvre
          : row.totalHeures > 0
            ? row.totalHeures * tauxHoraire
            : row.heuresEstimees * tauxHoraire;
        const totalCout = row.coutMateriaux + coutMO;
        const marge = row.amountHT - totalCout;
        const tauxMarge = row.amountHT > 0 ? Math.round((marge / row.amountHT) * 100) : 0;
        return {
          id: row.id,
          title: row.title,
          amountHT: row.amountHT,
          coutMateriaux: row.coutMateriaux,
          coutMO,
          totalHeures: row.totalHeures || row.heuresEstimees,
          marge,
          tauxMarge,
        };
      });

      const totalCA = profItems.reduce((s, p) => s + p.amountHT, 0);
      const totalMarge = profItems.reduce((s, p) => s + p.marge, 0);
      const totalHeuresAll = profItems.reduce((s, p) => s + (p.totalHeures || 0), 0);
      const avgMarge = profItems.length > 0 ? Math.round(totalMarge / totalCA * 100) || 0 : 0;
      const topProfitable = [...profItems].sort((a, b) => b.marge - a.marge).slice(0, 5);
      const leastProfitable = [...profItems].sort((a, b) => a.tauxMarge - b.tauxMarge).slice(0, 5);

      const advRes = NextResponse.json({
        advancedStats: {
          topClients,
          caEmployes,
          statusDistrib,
          conversionRate: totalDevis > 0 ? Math.round(((devisAcceptes as number) / (totalDevis as number)) * 100) : 0,
          totalDevis,
          devisAcceptes,
          heuresParEmploye,
          facturesEnRetard: facturesEnRetardRaw as number,
          profitability: {
            totalCA,
            totalMarge,
            avgMarge,
            totalHeures: totalHeuresAll,
            count: profItems.length,
            topProfitable,
            leastProfitable,
          },
          devisEnAttente: ((devisEnvoyesRaw as any[])[0])?.count || 0,
          montantDevisEnAttente: ((devisEnvoyesRaw as any[])[0])?.total || 0,
          devisRelances: ((devisRelancesCount as any[])[0])?.count || 0,
        },
      });
      advRes.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
      return advRes;
    }

    // ── BASIC STATS (fast, loaded first) ──
    const cf: Record<string, unknown> = { companyId: user.companyId };
    if (isEmploye) cf.createdById = user.id;

    const queries: Promise<any>[] = [
      prisma.intervention.aggregate({ where: { ...cf, status: 'PAID', date: { gte: startOfYear } } as any, _sum: { amountTTC: true } }),
      prisma.intervention.aggregate({ where: { ...cf, status: { in: ['PENDING', 'INVOICED'] } } as any, _sum: { amountTTC: true } }),
      prisma.client.count({ where: { companyId: user.companyId } }),
      prisma.intervention.count({ where: cf as any }),
      prisma.intervention.findMany({
        where: cf as any,
        include: { client: true, createdBy: { select: { id: true, firstName: true, lastName: true } } } as any,
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ];

    if (isPatron) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      queries.push(
        prisma.$queryRaw(Prisma.sql`
          SELECT date_trunc('month', date) as m, COALESCE(SUM("amountTTC"), 0)::float as revenue
          FROM interventions
          WHERE "companyId" = ${user.companyId} AND status = 'PAID' AND date >= ${startDate}
          GROUP BY date_trunc('month', date) ORDER BY m ASC
        `),
      );
    }

    const results = await Promise.all(queries);

    const yearly = results[0];
    const pending = results[1];
    const totalClients = results[2] as number;
    const totalInterventions = results[3] as number;
    const recent = results[4];

    let monthlyData: { month: string; revenue: number }[] = [];
    if (isPatron) {
      const rawMonthly = results[5] as { m: Date; revenue: number }[];
      for (let idx = 0; idx < 12; idx++) {
        const i = 11 - idx;
        const ms = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = ms.toLocaleDateString('fr-FR', { month: 'short' });
        const found = rawMonthly.find((r) => {
          const rd = new Date(r.m);
          return rd.getFullYear() === ms.getFullYear() && rd.getMonth() === ms.getMonth();
        });
        monthlyData.push({
          month: label.charAt(0).toUpperCase() + label.slice(1),
          revenue: found?.revenue || 0,
        });
      }
    }

    const monthlyRevenue = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].revenue : 0;

    const res = NextResponse.json({
      data: {
        monthlyRevenue: isEmploye ? 0 : monthlyRevenue,
        yearlyRevenue: isEmploye ? 0 : (yearly._sum.amountTTC || 0),
        pendingRevenue: isEmploye ? 0 : (pending._sum.amountTTC || 0),
        totalClients,
        totalInterventions,
        recentInterventions: recent,
        monthlyData: isEmploye ? [] : monthlyData,
        userRole: user.role,
        permissions: perms,
      },
    });
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}