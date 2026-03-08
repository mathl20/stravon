'use client';

import { createContext, useContext } from 'react';

const PermissionsContext = createContext<string[]>([]);

export const PermissionsProvider = PermissionsContext.Provider;

export function usePermissions() {
  return useContext(PermissionsContext);
}
