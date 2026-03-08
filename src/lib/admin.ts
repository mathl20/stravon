// Admin email — the only account that can access the /admin panel
// Set ADMIN_EMAIL in your environment variables
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'roheemathis@gmail.com';

export function isAdmin(email: string): boolean {
  return email === ADMIN_EMAIL;
}
