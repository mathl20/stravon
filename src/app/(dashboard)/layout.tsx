import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getEffectivePermissions } from '@/lib/permissions';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/api/auth/logout');
  }

  const permissions = getEffectivePermissions(user);

  const isDemo = (user.company as any).isDemo === true;

  return (
    <DashboardShell
      user={{ firstName: user.firstName, lastName: user.lastName, role: user.role, permissions }}
      company={{ name: user.company.name }}
      isDemo={isDemo}
    >
      {children}
    </DashboardShell>
  );
}
