'use client';

import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: { background: '#18181b', color: '#fff', borderRadius: '12px', fontSize: '13px', padding: '10px 16px' },
        }}
      />
    </>
  );
}
