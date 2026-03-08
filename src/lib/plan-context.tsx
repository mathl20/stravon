'use client';

import { createContext, useContext } from 'react';

interface PlanInfo {
  tier: number;
  name: string;
}

const PlanContext = createContext<PlanInfo>({ tier: 0, name: 'Solo' });

export const PlanProvider = PlanContext.Provider;

export function usePlan() {
  return useContext(PlanContext);
}
