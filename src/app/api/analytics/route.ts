import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { getEffectivePermissions, hasPermission, PERMISSIONS } from '@/lib/permissions';

interface Recommendation {
  type: 'price' | 'relance' | 'client' | 'warning' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });

    const perms = getEffectivePermissions(user);
    if (!hasPermission(perms, PERMISSIONS.SETTINGS_MANAGE)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const companyId = user.companyId;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    // Run all queries in parallel
    const [
      devisStats,
      devisStaleRaw,
      monthlyRevenueRaw,
      clientRevenueRaw,
      interventionTypesRaw,
      avgDelayRaw,
      unpaidInvoicesRaw,
      materialCostsRaw,
      hoursStatsRaw,
      totalInterventions,
      recentDevisRaw,
    ] = await Promise.all([
      // 1. Devis acceptance stats
      prisma.$queryRaw<{ status: string; count: number; total: number }[]>(Prisma.sql`
        SELECT status, COUNT(*)::int as count, COALESCE(SUM("amountHT"), 0)::float as total
        FROM devis WHERE "companyId" = ${companyId}
        GROUP BY status
      `),

      // 2. Stale devis (ENVOYE > 7 days, no relance in last 5 days)
      prisma.$queryRaw<{ id: string; reference: string; title: string; client_name: string; days_old: number; amount: number }[]>(Prisma.sql`
        SELECT d.id, d.reference, d.title,
          CONCAT(c."firstName", ' ', c."lastName") as client_name,
          EXTRACT(DAY FROM NOW() - d.date)::int as days_old,
          d."amountHT"::float as amount
        FROM devis d
        JOIN clients c ON d."clientId" = c.id
        WHERE d."companyId" = ${companyId}
          AND d.status = 'ENVOYE'
          AND d.date < NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM relances_devis rd
            WHERE rd."devisId" = d.id AND rd.date > NOW() - INTERVAL '5 days'
          )
        ORDER BY d.date ASC
        LIMIT 10
      `),

      // 3. Monthly revenue (last 12 months)
      prisma.$queryRaw<{ month: Date; revenue: number; count: number }[]>(Prisma.sql`
        SELECT date_trunc('month', date) as month,
          COALESCE(SUM("amountHT"), 0)::float as revenue,
          COUNT(*)::int as count
        FROM interventions
        WHERE "companyId" = ${companyId} AND status = 'PAID' AND date >= ${twelveMonthsAgo}
        GROUP BY date_trunc('month', date)
        ORDER BY month ASC
      `),

      // 4. Revenue per client (all time, paid)
      prisma.$queryRaw<{ client_id: string; name: string; revenue: number; count: number; last_intervention: Date }[]>(Prisma.sql`
        SELECT c.id as client_id,
          CONCAT(c."firstName", ' ', c."lastName") as name,
          COALESCE(SUM(i."amountHT"), 0)::float as revenue,
          COUNT(*)::int as count,
          MAX(i.date) as last_intervention
        FROM interventions i
        JOIN clients c ON i."clientId" = c.id
        WHERE i."companyId" = ${companyId} AND i.status = 'PAID'
        GROUP BY c.id, c."firstName", c."lastName"
        ORDER BY revenue DESC
      `),

      // 5. Profitability by intervention type/title pattern
      prisma.$queryRaw<{ category: string; revenue: number; cost: number; count: number; avg_margin: number }[]>(Prisma.sql`
        SELECT
          SPLIT_PART(i.title, ' ', 1) as category,
          COALESCE(SUM(i."amountHT"), 0)::float as revenue,
          COALESCE(SUM(
            COALESCE(mat.cout_mat, 0) +
            CASE
              WHEN i."coutMainOeuvre" > 0 THEN i."coutMainOeuvre"
              WHEN fh.total_h > 0 THEN fh.total_h * co."tauxHoraire"
              ELSE COALESCE(i."heuresEstimees", 0) * co."tauxHoraire"
            END
          ), 0)::float as cost,
          COUNT(*)::int as count,
          CASE WHEN SUM(i."amountHT") > 0
            THEN ROUND(((SUM(i."amountHT") - SUM(
              COALESCE(mat.cout_mat, 0) +
              CASE
                WHEN i."coutMainOeuvre" > 0 THEN i."coutMainOeuvre"
                WHEN fh.total_h > 0 THEN fh.total_h * co."tauxHoraire"
                ELSE COALESCE(i."heuresEstimees", 0) * co."tauxHoraire"
              END
            )) / SUM(i."amountHT") * 100))::int
            ELSE 0
          END as avg_margin
        FROM interventions i
        JOIN companies co ON co.id = i."companyId"
        LEFT JOIN (
          SELECT "interventionId", SUM(quantite * "prixUnitaire")::float as cout_mat
          FROM materiels_utilises GROUP BY "interventionId"
        ) mat ON mat."interventionId" = i.id
        LEFT JOIN (
          SELECT "interventionId", SUM("heuresTravaillees")::float as total_h
          FROM feuilles_heures GROUP BY "interventionId"
        ) fh ON fh."interventionId" = i.id
        WHERE i."companyId" = ${companyId} AND i.status = 'PAID'
        GROUP BY SPLIT_PART(i.title, ' ', 1), co."tauxHoraire"
        HAVING COUNT(*) >= 2
        ORDER BY avg_margin DESC
      `),

      // 6. Average delay between devis sent and accepted
      prisma.$queryRaw<{ avg_days: number }[]>(Prisma.sql`
        SELECT COALESCE(AVG(EXTRACT(DAY FROM NOW() - date)), 0)::float as avg_days
        FROM devis
        WHERE "companyId" = ${companyId} AND status = 'ENVOYE'
      `),

      // 7. Unpaid invoices total
      prisma.$queryRaw<{ count: number; total: number; overdue_count: number; overdue_total: number }[]>(Prisma.sql`
        SELECT
          COUNT(*)::int as count,
          COALESCE(SUM("amountTTC"), 0)::float as total,
          COUNT(*) FILTER (WHERE "dateEcheance" < NOW())::int as overdue_count,
          COALESCE(SUM("amountTTC") FILTER (WHERE "dateEcheance" < NOW()), 0)::float as overdue_total
        FROM factures
        WHERE "companyId" = ${companyId} AND status != 'PAID'
      `),

      // 8. Top material costs
      prisma.$queryRaw<{ nom: string; total_cost: number; total_qty: number; usage_count: number }[]>(Prisma.sql`
        SELECT m.nom,
          SUM(m.quantite * m."prixUnitaire")::float as total_cost,
          SUM(m.quantite)::float as total_qty,
          COUNT(*)::int as usage_count
        FROM materiels_utilises m
        JOIN interventions i ON i.id = m."interventionId"
        WHERE i."companyId" = ${companyId} AND i.date >= ${startOfYear}
        GROUP BY m.nom
        ORDER BY total_cost DESC
        LIMIT 10
      `),

      // 9. Hours stats
      prisma.$queryRaw<{ total_hours: number; avg_hours_per_day: number; days_worked: number }[]>(Prisma.sql`
        SELECT
          COALESCE(SUM("heuresTravaillees"), 0)::float as total_hours,
          CASE WHEN COUNT(DISTINCT date) > 0
            THEN (SUM("heuresTravaillees") / COUNT(DISTINCT date))::float
            ELSE 0
          END as avg_hours_per_day,
          COUNT(DISTINCT date)::int as days_worked
        FROM feuilles_heures
        WHERE "entrepriseId" = ${companyId} AND date >= ${startOfYear}
      `),

      // 10. Total interventions count this year
      prisma.intervention.count({
        where: { companyId, date: { gte: startOfYear } } as any,
      }),

      // 11. Recent refused devis for insights
      prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int as count
        FROM devis WHERE "companyId" = ${companyId} AND status = 'REFUSE' AND date >= ${sixMonthsAgo}
      `),
    ]);

    // ── COMPUTE METRICS ──

    const devisTotal = devisStats.reduce((s, d) => s + d.count, 0);
    const devisAcceptes = devisStats.find((d) => d.status === 'ACCEPTE')?.count || 0;
    const devisRefuses = devisStats.find((d) => d.status === 'REFUSE')?.count || 0;
    const devisEnvoyes = devisStats.find((d) => d.status === 'ENVOYE')?.count || 0;
    const devisFactures = devisStats.find((d) => d.status === 'FACTURE')?.count || 0;
    const tauxAcceptation = devisTotal > 0 ? Math.round(((devisAcceptes + devisFactures) / devisTotal) * 100) : 0;
    const tauxRefus = devisTotal > 0 ? Math.round((devisRefuses / devisTotal) * 100) : 0;

    // Monthly revenue for forecast
    const monthlyRevenues = monthlyRevenueRaw.map((m) => ({
      month: new Date(m.month).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      revenue: m.revenue,
      count: m.count,
    }));

    // CA forecast: weighted average of last 3-6 months
    const recentMonths = monthlyRevenueRaw.slice(-6);
    let previsionCA = 0;
    if (recentMonths.length >= 2) {
      const weights = recentMonths.map((_, i) => i + 1);
      const totalWeight = weights.reduce((s, w) => s + w, 0);
      previsionCA = Math.round(
        recentMonths.reduce((s, m, i) => s + m.revenue * weights[i], 0) / totalWeight
      );
    } else if (recentMonths.length === 1) {
      previsionCA = Math.round(recentMonths[0].revenue);
    }

    // Trend: compare last 3 months vs 3 months before
    let tendanceCA: 'up' | 'down' | 'stable' = 'stable';
    if (monthlyRevenueRaw.length >= 6) {
      const recent3 = monthlyRevenueRaw.slice(-3).reduce((s, m) => s + m.revenue, 0) / 3;
      const prev3 = monthlyRevenueRaw.slice(-6, -3).reduce((s, m) => s + m.revenue, 0) / 3;
      if (prev3 > 0) {
        const change = ((recent3 - prev3) / prev3) * 100;
        tendanceCA = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
      }
    }

    // Top 5 / Bottom 5 clients
    const topClients = clientRevenueRaw.slice(0, 5);
    const dormantClients = clientRevenueRaw.filter((c) => {
      const lastDate = new Date(c.last_intervention);
      const monthsAgo = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo > 3 && c.revenue > 500;
    }).slice(0, 5);

    // Work type profitability
    const leastProfitableTypes = [...interventionTypesRaw]
      .filter((t) => t.count >= 2)
      .sort((a, b) => a.avg_margin - b.avg_margin)
      .slice(0, 5);
    const mostProfitableTypes = [...interventionTypesRaw]
      .filter((t) => t.count >= 2)
      .sort((a, b) => b.avg_margin - a.avg_margin)
      .slice(0, 5);

    const unpaidInvoices = unpaidInvoicesRaw[0] || { count: 0, total: 0, overdue_count: 0, overdue_total: 0 };
    const hoursStats = hoursStatsRaw[0] || { total_hours: 0, avg_hours_per_day: 0, days_worked: 0 };
    const recentRefused = (recentDevisRaw[0] as any)?.count || 0;

    // ── GENERATE RECOMMENDATIONS ──
    const recommendations: Recommendation[] = [];

    // Stale devis to relance
    if (devisStaleRaw.length > 0) {
      const totalAmount = devisStaleRaw.reduce((s, d) => s + d.amount, 0);
      recommendations.push({
        type: 'relance',
        priority: totalAmount > 5000 ? 'high' : 'medium',
        title: `${devisStaleRaw.length} devis a relancer`,
        description: `${devisStaleRaw.length} devis envoyes depuis plus de 7 jours sans reponse, representant ${Math.round(totalAmount)} EUR HT. Relancez-les pour augmenter votre taux de conversion.`,
        action: { label: 'Voir les devis', href: '/devis?status=ENVOYE' },
      });
    }

    // Low margin work types
    leastProfitableTypes.forEach((t) => {
      if (t.avg_margin < 15 && t.count >= 3) {
        recommendations.push({
          type: 'price',
          priority: t.avg_margin < 5 ? 'high' : 'medium',
          title: `Augmentez vos prix sur "${t.category}"`,
          description: `Vos travaux "${t.category}" ont une marge de seulement ${t.avg_margin}% sur ${t.count} interventions. Envisagez d'augmenter vos tarifs de 10-15% pour ameliorer votre rentabilite.`,
        });
      }
    });

    // High refusal rate
    if (tauxRefus > 30 && devisTotal >= 5) {
      recommendations.push({
        type: 'price',
        priority: 'medium',
        title: 'Taux de refus de devis eleve',
        description: `${tauxRefus}% de vos devis sont refuses. Vos prix sont peut-etre trop eleves, ou vos devis manquent de detail. Analysez les devis refuses pour identifier les causes.`,
        action: { label: 'Devis refuses', href: '/devis?status=REFUSE' },
      });
    }

    // Low acceptance rate
    if (tauxAcceptation < 40 && devisTotal >= 5) {
      recommendations.push({
        type: 'warning',
        priority: 'medium',
        title: 'Taux de conversion devis faible',
        description: `Seulement ${tauxAcceptation}% de vos devis sont acceptes. La moyenne du secteur est de 50-60%. Relancez vos devis en attente et ameliorez vos propositions commerciales.`,
      });
    }

    // Dormant high-value clients
    dormantClients.forEach((c) => {
      recommendations.push({
        type: 'client',
        priority: c.revenue > 2000 ? 'high' : 'low',
        title: `Recontactez ${c.name}`,
        description: `${c.name} a genere ${Math.round(c.revenue)} EUR de CA (${c.count} interventions) mais n'a pas eu d'intervention depuis ${Math.round((now.getTime() - new Date(c.last_intervention).getTime()) / (1000 * 60 * 60 * 24 * 30))} mois. Un appel pourrait generer de nouveaux travaux.`,
        action: { label: 'Voir le client', href: `/clients/${c.client_id}` },
      });
    });

    // Overdue invoices
    if (unpaidInvoices.overdue_count > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: `${unpaidInvoices.overdue_count} facture${unpaidInvoices.overdue_count > 1 ? 's' : ''} en retard`,
        description: `${Math.round(unpaidInvoices.overdue_total)} EUR TTC de factures impayees en retard. Relancez rapidement pour maintenir votre tresorerie.`,
        action: { label: 'Voir les factures', href: '/factures' },
      });
    }

    // Revenue trend opportunity
    if (tendanceCA === 'up' && previsionCA > 0) {
      recommendations.push({
        type: 'opportunity',
        priority: 'low',
        title: 'Tendance CA positive',
        description: `Votre chiffre d'affaires est en hausse. Prevision du mois prochain : ~${Math.round(previsionCA)} EUR HT. Profitez de cette dynamique pour prospecter de nouveaux clients.`,
      });
    } else if (tendanceCA === 'down') {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Baisse de chiffre d\'affaires',
        description: `Votre CA est en baisse sur les 3 derniers mois. Intensifiez votre prospection et relancez vos devis en attente pour inverser la tendance.`,
        action: { label: 'Voir les devis', href: '/devis?status=ENVOYE' },
      });
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      metrics: {
        devis: {
          total: devisTotal,
          acceptes: devisAcceptes + devisFactures,
          refuses: devisRefuses,
          enAttente: devisEnvoyes,
          tauxAcceptation,
          tauxRefus,
        },
        revenue: {
          monthly: monthlyRevenues,
          previsionProchainMois: previsionCA,
          tendance: tendanceCA,
        },
        clients: {
          top: topClients,
          dormants: dormantClients,
          totalActifs: clientRevenueRaw.length,
        },
        travaux: {
          plusRentables: mostProfitableTypes,
          moinsRentables: leastProfitableTypes,
        },
        factures: unpaidInvoices,
        materiaux: materialCostsRaw,
        heures: hoursStats,
        interventionsAnnee: totalInterventions as number,
      },
      recommendations,
      devisARelancer: devisStaleRaw,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
