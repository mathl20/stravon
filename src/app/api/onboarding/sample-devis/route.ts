import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateDevisReference } from '@/lib/utils';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  // Create a sample client if none exists
  let client = await prisma.client.findFirst({ where: { companyId: user.companyId } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@exemple.fr',
        phone: '06 12 34 56 78',
        address: '12 rue des Lilas',
        city: 'Paris',
        postalCode: '75001',
        companyId: user.companyId,
      },
    });
  }

  const reference = generateDevisReference();
  const items = [
    { description: 'Déplacement', quantity: 1, unitPrice: 45, total: 45, type: 'prestation' },
    { description: 'Main d\'œuvre - Installation', quantity: 3, unitPrice: 45, total: 135, type: 'main_oeuvre' },
    { description: 'Chauffe-eau Atlantic 200L', quantity: 1, unitPrice: 450, total: 450, type: 'materiel', prixAchat: 320, coefMarge: 1.41, fournisseur: 'Cedeo' },
    { description: 'Kit raccordement cuivre', quantity: 1, unitPrice: 35, total: 35, type: 'materiel', prixAchat: 22, coefMarge: 1.59 },
    { description: 'Groupe de sécurité', quantity: 1, unitPrice: 28, total: 28, type: 'materiel', prixAchat: 15, coefMarge: 1.87 },
  ];

  const amountHT = items.reduce((s, i) => s + i.total, 0);
  const amountTTC = Math.round(amountHT * 1.2 * 100) / 100;

  const devis = await prisma.devis.create({
    data: {
      reference,
      title: 'Installation chauffe-eau',
      description: 'Fourniture et pose d\'un chauffe-eau Atlantic 200L avec raccordements',
      amountHT,
      tvaRate: 20,
      amountTTC,
      clientId: client.id,
      createdById: user.id,
      companyId: user.companyId,
      dateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          type: item.type,
          prixAchat: (item as any).prixAchat || null,
          coefMarge: (item as any).coefMarge || null,
          fournisseur: (item as any).fournisseur || null,
        })),
      },
    },
  });

  // Mark onboarding steps
  await prisma.company.update({
    where: { id: user.companyId },
    data: {
      onboardingFirstDevis: true,
      onboardingFirstClient: true,
    },
  });

  return NextResponse.json({ devisId: devis.id, reference });
}
