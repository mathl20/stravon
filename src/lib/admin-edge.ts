// Admin email for edge middleware (no Node.js APIs)
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@stravon.fr';

export function isAdminEmail(email: string): boolean {
  return email === ADMIN_EMAIL;
}
