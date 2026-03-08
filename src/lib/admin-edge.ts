// Admin email for edge middleware (no Node.js APIs)
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'roheemathis@gmail.com';

export function isAdminEmail(email: string): boolean {
  return email === ADMIN_EMAIL;
}
