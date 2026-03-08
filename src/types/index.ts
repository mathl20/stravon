import type { Company, User, Client, Intervention, InterventionItem, FeuilleHeure, Planning, InterventionPhoto, Devis, DevisItem, Facture, FactureItem, MaterielUtilise, InterventionAssignment } from '@prisma/client';

export { Role } from '@prisma/client';

export type UserWithCompany = User & { company: Company };

export type ClientWithCount = Client & { _count: { interventions: number } };

export type InterventionWithRelations = Intervention & {
  items: InterventionItem[];
  client: Client;
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
};

export type AssignedUser = InterventionAssignment & {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>;
};

export type InterventionFull = Intervention & {
  items: InterventionItem[];
  client: Client;
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  company: Company;
  photos: InterventionPhoto[];
  materiels: MaterielUtilise[];
  assignedUsers: AssignedUser[];
  devis: (Devis & { items: DevisItem[] }) | null;
  factures: (Facture & { items: FactureItem[] })[];
  feuillesHeures: (FeuilleHeure & { utilisateur: Pick<User, 'id' | 'firstName' | 'lastName'> })[];
  rentabilite?: {
    coutMateriaux: number;
    coutMO: number;
    marge: number;
    tauxMarge: number;
    tauxHoraire: number;
    totalHeures: number;
  };
};

export type DevisFull = Devis & {
  items: DevisItem[];
  client: Client;
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  company: Company;
};

export type DevisWithRelations = Devis & {
  items: DevisItem[];
  client: Client;
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  _count?: { items: number };
};

export type FactureFull = Facture & {
  items: FactureItem[];
  client: Client;
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  company: Company;
  intervention?: Intervention | null;
  devis?: Devis | null;
};

export type FactureWithRelations = Facture & {
  items: FactureItem[];
  client: Client;
  intervention?: Pick<Intervention, 'id' | 'reference' | 'title'> | null;
};

export interface DashboardStats {
  monthlyRevenue: number;
  yearlyRevenue: number;
  pendingRevenue: number;
  totalClients: number;
  totalInterventions: number;
  recentInterventions: InterventionWithRelations[];
  monthlyData: { month: string; revenue: number }[];
  userRole: string;
}

export type FeuilleHeureWithRelations = FeuilleHeure & {
  utilisateur: Pick<User, 'id' | 'firstName' | 'lastName'>;
  intervention?: Pick<Intervention, 'id' | 'reference' | 'title'> | null;
};

export type PlanningWithRelations = Planning & {
  utilisateur: Pick<User, 'id' | 'firstName' | 'lastName'>;
  intervention?: Pick<Intervention, 'id' | 'reference' | 'title'> | null;
};

export type { Company, User, Client, Intervention, InterventionItem, FeuilleHeure, Planning, InterventionPhoto, Devis, DevisItem, Facture, FactureItem, MaterielUtilise, InterventionAssignment };
