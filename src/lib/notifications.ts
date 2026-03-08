import prisma from './prisma';
import { sendPushToUser } from './web-push';

const PUSH_TITLES: Record<string, string> = {
  DEVIS_ACCEPTE: 'Devis accept\u00e9',
  DEVIS_REFUSE: 'Devis refus\u00e9',
  FACTURE_PAYEE: 'Facture pay\u00e9e',
  RELANCE: 'Facture en retard',
  RELANCE_DEVIS: 'Devis sans r\u00e9ponse',
  FEUILLE_HEURE: 'Feuille d\'heures',
  CONGE: 'Demande de cong\u00e9',
  PLANNING: 'Planning',
};

export async function createNotification(
  type: string,
  message: string,
  lien: string | null,
  userId: string,
  companyId: string
): Promise<void> {
  try {
    await prisma.notification.create({
      data: { type, message, lien, userId, companyId },
    });

    // Send Web Push notification (non-blocking)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.stravon.fr';
    sendPushToUser(userId, {
      title: PUSH_TITLES[type] || 'STRAVON',
      message,
      type,
      url: lien ? `${baseUrl}${lien}` : baseUrl,
    }).catch(() => {});
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
}
