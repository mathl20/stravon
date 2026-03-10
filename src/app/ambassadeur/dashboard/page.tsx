import { Suspense } from 'react';
import AmbassadeurDashboardContent from './dashboard-content';

export const dynamic = 'force-dynamic';

export default function AmbassadeurDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AmbassadeurDashboardContent />
    </Suspense>
  );
}
