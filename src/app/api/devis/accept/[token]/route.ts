import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createNotification } from '@/lib/notifications';

type Ctx = { params: Promise<{ token: string }> };

// GET - Public: fetch devis data for acceptance page
export async function GET(_: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

    const devis = await prisma.devis.findUnique({
      where: { acceptToken: token },
      include: {
        client: { select: { firstName: true, lastName: true, address: true, city: true, postalCode: true, email: true, phone: true } },
        company: { select: { name: true, email: true, phone: true, address: true, city: true, postalCode: true, logoUrl: true, primaryColor: true, siret: true } },
        items: { select: { description: true, quantity: true, unitPrice: true, total: true, type: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!devis) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    // Check token expiration
    if ((devis as any).acceptTokenExpiresAt && new Date((devis as any).acceptTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré. Veuillez demander un nouveau devis.' }, { status: 410 });
    }

    if (devis.status === 'REFUSE') {
      return NextResponse.json({ error: 'already_refused', refused: true, refusedAt: (devis as any).refusedAt }, { status: 400 });
    }

    if (devis.signatureClient && devis.acceptedAt) {
      return NextResponse.json({ error: 'already_accepted', accepted: true, acceptedAt: devis.acceptedAt, signedAt: devis.signedAt }, { status: 400 });
    }

    if (devis.status === 'ACCEPTE' && devis.acceptedAt) {
      return NextResponse.json({ error: 'already_accepted', accepted: true, acceptedAt: devis.acceptedAt }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        id: devis.id,
        reference: devis.reference,
        title: devis.title,
        description: devis.description,
        date: devis.date,
        dateExpiration: devis.dateExpiration,
        status: devis.status,
        amountHT: devis.amountHT,
        tvaRate: devis.tvaRate,
        amountTTC: devis.amountTTC,
        acomptePercent: devis.acomptePercent,
        conditionsPaiement: devis.conditionsPaiement,
        delaiTravaux: devis.delaiTravaux,
        client: devis.client,
        company: devis.company,
        createdBy: devis.createdBy,
        items: devis.items,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT - Public: refuse devis
export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

    const devis: any = await prisma.devis.findUnique({
      where: { acceptToken: token },
      include: {
        client: true,
        company: true,
        createdBy: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!devis) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    if (devis.acceptTokenExpiresAt && new Date(devis.acceptTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 });
    }

    if (devis.status === 'REFUSE') {
      return NextResponse.json({ error: 'Ce devis a déjà été refusé' }, { status: 400 });
    }

    if (devis.status === 'ACCEPTE') {
      return NextResponse.json({ error: 'Ce devis a déjà été accepté' }, { status: 400 });
    }

    const body = await request.json();
    const motifRefus = body.motifRefus && typeof body.motifRefus === 'string' ? body.motifRefus.trim() : null;

    await prisma.devis.update({
      where: { id: devis.id },
      data: {
        status: 'REFUSE',
        motifRefus,
        refusedAt: new Date(),
        acceptToken: null, // Invalidate token
      },
    });

    // Create in-app notification for devis creator
    await createNotification(
      'DEVIS_REFUSE',
      `Devis ${devis.reference} refus\u00e9 par ${devis.client.firstName} ${devis.client.lastName}`,
      `/devis/${devis.id}`,
      devis.createdById,
      devis.companyId
    );

    // Send notification email to artisan
    const company = devis.company;
    const brandColor = company.primaryColor || '#1b40f5';
    const artisanEmail = devis.createdBy.email || company.email;

    if (artisanEmail) {
      try {
        await sendEmail({
          to: artisanEmail,
          subject: `Devis ${devis.reference} refusé par ${devis.client.firstName} ${devis.client.lastName}`,
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#18181b">
              <div style="text-align:center;margin-bottom:32px">
                <div style="width:64px;height:64px;border-radius:50%;background:#fef2f2;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
                  <span style="font-size:28px">✗</span>
                </div>
                <h1 style="font-size:20px;font-weight:700;color:#dc2626;margin:0">Devis refusé</h1>
              </div>

              <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
                Bonjour ${devis.createdBy.firstName},
              </p>

              <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
                Votre client <strong>${devis.client.firstName} ${devis.client.lastName}</strong> a refusé le devis <strong>${devis.reference}</strong>.
              </p>

              ${motifRefus ? `
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:24px">
                <p style="font-size:12px;font-weight:600;color:#dc2626;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Motif du refus</p>
                <p style="font-size:14px;color:#18181b;margin:0">${motifRefus}</p>
              </div>
              ` : ''}

              <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
                <p style="font-size:16px;font-weight:600;margin:0 0 4px">${devis.title}</p>
                <div style="display:flex;justify-content:space-between;border-top:1px solid #e4e4e7;padding-top:12px;margin-top:12px">
                  <span style="font-size:13px;color:#71717a">Total TTC</span>
                  <span style="font-size:18px;font-weight:700;color:${brandColor}">${formatCurrency(devis.amountTTC)}</span>
                </div>
              </div>

              <div style="text-align:center;margin-bottom:32px">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.stravon.fr'}/devis/${devis.id}" style="display:inline-block;padding:12px 32px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">
                  Voir le devis
                </a>
              </div>

              <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:32px;border-top:1px solid #f4f4f5;padding-top:16px">
                Email envoye via <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none">STRAVON</a>
              </p>
            </div>
          `,
        });
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({ message: 'Devis refusé' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Public: accept and sign devis
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 });

    const devis: any = await prisma.devis.findUnique({
      where: { acceptToken: token },
      include: {
        client: true,
        company: true,
        createdBy: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!devis) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    if (devis.acceptTokenExpiresAt && new Date(devis.acceptTokenExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré.' }, { status: 410 });
    }

    if (devis.status === 'ACCEPTE' && devis.acceptedAt) {
      return NextResponse.json({ error: 'Ce devis a déjà été accepté' }, { status: 400 });
    }

    const body = await request.json();
    const { signatureClient } = body;

    const updateData: any = {
      status: 'ACCEPTE',
      acceptedAt: new Date(),
      acceptToken: null, // Invalidate token
    };

    if (signatureClient && typeof signatureClient === 'string' && signatureClient.startsWith('data:image/')) {
      updateData.signatureClient = signatureClient;
      updateData.signedAt = new Date();
    }

    await prisma.devis.update({
      where: { id: devis.id },
      data: updateData,
    });

    // Create in-app notification for devis creator
    await createNotification(
      'DEVIS_ACCEPTE',
      `Devis ${devis.reference} accept\u00e9 par ${devis.client.firstName} ${devis.client.lastName}`,
      `/devis/${devis.id}`,
      devis.createdById,
      devis.companyId
    );

    // Also notify all PATRON users in the company
    const patrons = await prisma.user.findMany({
      where: { companyId: devis.companyId, role: 'PATRON', id: { not: devis.createdById } },
    });
    for (const patron of patrons) {
      await createNotification(
        'DEVIS_ACCEPTE',
        `Devis ${devis.reference} accept\u00e9 par ${devis.client.firstName} ${devis.client.lastName}`,
        `/devis/${devis.id}`,
        patron.id,
        devis.companyId
      );
    }

    // Send confirmation email to artisan
    const company = devis.company;
    const brandColor = company.primaryColor || '#1b40f5';
    const artisanEmail = devis.createdBy.email || company.email;

    if (artisanEmail) {
      try {
        await sendEmail({
          to: artisanEmail,
          subject: `Devis ${devis.reference} accepté par ${devis.client.firstName} ${devis.client.lastName}`,
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#18181b">
              <div style="text-align:center;margin-bottom:32px">
                <div style="width:64px;height:64px;border-radius:50%;background:#dcfce7;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
                  <span style="font-size:28px">✓</span>
                </div>
                <h1 style="font-size:20px;font-weight:700;color:#059669;margin:0">Devis accepté !</h1>
              </div>

              <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
                Bonjour ${devis.createdBy.firstName},
              </p>

              <p style="font-size:14px;line-height:1.6;margin-bottom:24px">
                Votre client <strong>${devis.client.firstName} ${devis.client.lastName}</strong> a accepté${updateData.signatureClient ? ' et signé' : ''} le devis <strong>${devis.reference}</strong>.
              </p>

              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px">
                <p style="font-size:16px;font-weight:600;margin:0 0 4px">${devis.title}</p>
                <div style="display:flex;justify-content:space-between;border-top:1px solid #bbf7d0;padding-top:12px;margin-top:12px">
                  <span style="font-size:13px;color:#71717a">Total TTC</span>
                  <span style="font-size:18px;font-weight:700;color:${brandColor}">${formatCurrency(devis.amountTTC)}</span>
                </div>
              </div>

              <div style="text-align:center;margin-bottom:32px">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.stravon.fr'}/devis/${devis.id}" style="display:inline-block;padding:12px 32px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">
                  Voir le devis
                </a>
              </div>

              <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:32px;border-top:1px solid #f4f4f5;padding-top:16px">
                Email envoye via <a href="https://stravon.fr" style="color:${brandColor};text-decoration:none">STRAVON</a>
              </p>
            </div>
          `,
        });
      } catch {
        // Non-blocking: email failure shouldn't prevent acceptance
      }
    }

    return NextResponse.json({ message: 'Devis accepté avec succès' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
