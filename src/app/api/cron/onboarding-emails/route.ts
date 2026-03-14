import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';
import {
  onboardingJ0Template,
  onboardingJ1DevisTemplate,
  onboardingJ1NoDevisTemplate,
  onboardingJ3Template,
  onboardingJ7Template,
  onboardingJ11Template,
  onboardingJ13Template,
} from '@/lib/email-templates';

export async function GET(request: Request) {
  // Verify cron secret
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find companies in trial (with trialEndsAt set, created in last 15 days)
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const companies = await prisma.company.findMany({
    where: {
      trialEndsAt: { not: null },
      createdAt: { gte: fifteenDaysAgo },
      subscriptionStatus: { not: 'active' },
      isDemo: false,
    },
    include: {
      users: {
        where: { role: 'PATRON' },
        take: 1,
        select: { firstName: true, email: true },
      },
    },
  });

  let sent = 0;

  for (const company of companies) {
    const patron = company.users[0];
    if (!patron?.email) continue;

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(company.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const lastEmail = company.lastOnboardingEmail;

    let template: { subject: string; html: string } | null = null;
    let emailNumber = 0;

    // J+0: Welcome (sent during registration, but catch if missed)
    if (daysSinceCreation >= 0 && lastEmail < 1) {
      template = onboardingJ0Template(patron.firstName);
      emailNumber = 1;
    }
    // J+1: Check if first devis was created
    else if (daysSinceCreation >= 1 && lastEmail < 2) {
      const hasDevis = await prisma.devis.count({ where: { companyId: company.id } }) > 0;
      template = hasDevis
        ? onboardingJ1DevisTemplate(patron.firstName)
        : onboardingJ1NoDevisTemplate(patron.firstName);
      emailNumber = 2;
    }
    // J+3: QR Code tip
    else if (daysSinceCreation >= 3 && lastEmail < 3) {
      template = onboardingJ3Template(patron.firstName);
      emailNumber = 3;
    }
    // J+7: Mid-trial
    else if (daysSinceCreation >= 7 && lastEmail < 4) {
      const devisCount = await prisma.devis.count({ where: { companyId: company.id } });
      const trialEnd = company.trialEndsAt!;
      const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      template = onboardingJ7Template(patron.firstName, daysLeft, devisCount);
      emailNumber = 4;
    }
    // J+11: Urgency
    else if (daysSinceCreation >= 11 && lastEmail < 5) {
      template = onboardingJ11Template(patron.firstName);
      emailNumber = 5;
    }
    // J+13: Last day
    else if (daysSinceCreation >= 13 && lastEmail < 6) {
      template = onboardingJ13Template(patron.firstName);
      emailNumber = 6;
    }

    if (template && emailNumber > 0) {
      try {
        await sendEmail({
          to: patron.email,
          subject: template.subject,
          html: template.html,
          replyTo: 'contact@stravon.fr',
        });
        await prisma.company.update({
          where: { id: company.id },
          data: { lastOnboardingEmail: emailNumber },
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send onboarding email to ${patron.email}:`, err);
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}
