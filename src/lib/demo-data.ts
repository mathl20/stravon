import { generateReference, generateDevisReference, calculateTTC } from './utils';

interface DemoClient {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

interface DemoIntervention {
  title: string;
  description: string;
  address: string;
  status: string;
  amountHT: number;
  tvaRate: number;
  heuresEstimees: number;
  items: { description: string; quantity: number; unitPrice: number }[];
  materiels?: { nom: string; quantite: number; prixUnitaire: number }[];
}

interface DemoDevis {
  title: string;
  description: string;
  status: 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE';
  amountHT: number;
  tvaRate: number;
  items: { description: string; quantity: number; unitPrice: number }[];
}

interface DemoFacture {
  status: string;
  amountHT: number;
  tvaRate: number;
  items: { description: string; quantity: number; unitPrice: number }[];
}

interface MetierData {
  companyName: string;
  clients: DemoClient[];
  interventions: { clientIndex: number; data: DemoIntervention }[];
  devis: { clientIndex: number; data: DemoDevis }[];
  factures: { clientIndex: number; interventionIndex: number; data: DemoFacture }[];
}

const SHARED_CLIENTS: DemoClient[] = [
  { firstName: 'Pierre', lastName: 'Dupont', email: 'p.dupont@email.fr', phone: '06 12 34 56 78', address: '15 rue des Lilas', city: 'Lyon', postalCode: '69003' },
  { firstName: 'Marie', lastName: 'Martin', email: 'm.martin@email.fr', phone: '06 23 45 67 89', address: '8 avenue Victor Hugo', city: 'Lyon', postalCode: '69006' },
  { firstName: 'Jean', lastName: 'Leroy', email: 'j.leroy@email.fr', phone: '06 34 56 78 90', address: '42 boulevard Gambetta', city: 'Villeurbanne', postalCode: '69100' },
  { firstName: 'Sophie', lastName: 'Bernard', email: 's.bernard@email.fr', phone: '06 45 67 89 01', address: '3 place Bellecour', city: 'Lyon', postalCode: '69002' },
];

const METIER_DATA: Record<string, MetierData> = {
  plombier: {
    companyName: 'Plomberie Demo',
    clients: SHARED_CLIENTS,
    interventions: [
      { clientIndex: 0, data: { title: 'Reparation fuite cuisine', description: 'Fuite sous evier, joint a remplacer', address: '15 rue des Lilas, Lyon', status: 'PAID', amountHT: 180, tvaRate: 10, heuresEstimees: 2, items: [{ description: 'Remplacement joint evier', quantity: 1, unitPrice: 120 }, { description: 'Deplacement', quantity: 1, unitPrice: 60 }], materiels: [{ nom: 'Joint evier inox', quantite: 1, prixUnitaire: 12 }, { nom: 'Teflon', quantite: 2, prixUnitaire: 3 }] } },
      { clientIndex: 1, data: { title: 'Remplacement chauffe-eau', description: 'Remplacement chauffe-eau 200L electrique', address: '8 avenue Victor Hugo, Lyon', status: 'INVOICED', amountHT: 1250, tvaRate: 10, heuresEstimees: 4, items: [{ description: 'Chauffe-eau Atlantic 200L', quantity: 1, unitPrice: 650 }, { description: 'Main d\'oeuvre installation', quantity: 4, unitPrice: 55 }, { description: 'Raccordements et finitions', quantity: 1, unitPrice: 380 }], materiels: [{ nom: 'Chauffe-eau Atlantic 200L', quantite: 1, prixUnitaire: 420 }, { nom: 'Groupe securite', quantite: 1, prixUnitaire: 35 }, { nom: 'Raccords cuivre', quantite: 4, prixUnitaire: 8 }] } },
      { clientIndex: 2, data: { title: 'Debouchage evier', description: 'Evier bouche, debouchage haute pression', address: '42 boulevard Gambetta, Villeurbanne', status: 'PENDING', amountHT: 150, tvaRate: 10, heuresEstimees: 1.5, items: [{ description: 'Debouchage haute pression', quantity: 1, unitPrice: 120 }, { description: 'Deplacement', quantity: 1, unitPrice: 30 }] } },
    ],
    devis: [
      { clientIndex: 1, data: { title: 'Installation chauffe-eau thermodynamique', description: 'Fourniture et pose chauffe-eau thermodynamique 270L', status: 'ENVOYE', amountHT: 3200, tvaRate: 10, items: [{ description: 'Chauffe-eau thermodynamique 270L', quantity: 1, unitPrice: 1800 }, { description: 'Installation et raccordements', quantity: 1, unitPrice: 950 }, { description: 'Mise en service et reglages', quantity: 1, unitPrice: 450 }] } },
      { clientIndex: 3, data: { title: 'Renovation salle de bain', description: 'Renovation complete plomberie salle de bain', status: 'BROUILLON', amountHT: 4800, tvaRate: 10, items: [{ description: 'Depose sanitaires existants', quantity: 1, unitPrice: 400 }, { description: 'Nouvelle alimentation eau', quantity: 1, unitPrice: 1200 }, { description: 'Evacuation PVC', quantity: 1, unitPrice: 800 }, { description: 'Pose douche italienne', quantity: 1, unitPrice: 1600 }, { description: 'Robinetterie et accessoires', quantity: 1, unitPrice: 800 }] } },
    ],
    factures: [
      { clientIndex: 0, interventionIndex: 0, data: { status: 'PAID', amountHT: 180, tvaRate: 10, items: [{ description: 'Remplacement joint evier', quantity: 1, unitPrice: 120 }, { description: 'Deplacement', quantity: 1, unitPrice: 60 }] } },
    ],
  },
  electricien: {
    companyName: 'Electricite Demo',
    clients: SHARED_CLIENTS,
    interventions: [
      { clientIndex: 0, data: { title: 'Panne tableau electrique', description: 'Disjoncteur qui saute, diagnostic et reparation', address: '15 rue des Lilas, Lyon', status: 'PAID', amountHT: 220, tvaRate: 20, heuresEstimees: 2.5, items: [{ description: 'Diagnostic tableau electrique', quantity: 1, unitPrice: 80 }, { description: 'Remplacement disjoncteur 20A', quantity: 1, unitPrice: 85 }, { description: 'Main d\'oeuvre', quantity: 1, unitPrice: 55 }], materiels: [{ nom: 'Disjoncteur 20A Schneider', quantite: 1, prixUnitaire: 22 }] } },
      { clientIndex: 1, data: { title: 'Installation prises cuisine', description: 'Ajout de 4 prises dans la cuisine + ligne dediee', address: '8 avenue Victor Hugo, Lyon', status: 'INVOICED', amountHT: 650, tvaRate: 20, heuresEstimees: 5, items: [{ description: 'Tirage de cables', quantity: 4, unitPrice: 65 }, { description: 'Fourniture et pose prises', quantity: 4, unitPrice: 45 }, { description: 'Ligne dediee four/plaque', quantity: 1, unitPrice: 210 }], materiels: [{ nom: 'Cable R2V 3G2.5', quantite: 25, prixUnitaire: 2.5 }, { nom: 'Prises Legrand', quantite: 4, prixUnitaire: 12 }] } },
      { clientIndex: 2, data: { title: 'Mise aux normes electriques', description: 'Mise en conformite NF C15-100', address: '42 boulevard Gambetta, Villeurbanne', status: 'PENDING', amountHT: 2800, tvaRate: 20, heuresEstimees: 16, items: [{ description: 'Remplacement tableau electrique', quantity: 1, unitPrice: 800 }, { description: 'Mise a la terre', quantity: 1, unitPrice: 600 }, { description: 'Remplacement prises et interrupteurs', quantity: 1, unitPrice: 900 }, { description: 'Verification et certificat Consuel', quantity: 1, unitPrice: 500 }] } },
    ],
    devis: [
      { clientIndex: 3, data: { title: 'Installation borne de recharge', description: 'Borne de recharge vehicule electrique 7kW', status: 'ENVOYE', amountHT: 1800, tvaRate: 20, items: [{ description: 'Borne Wallbox Pulsar Plus 7kW', quantity: 1, unitPrice: 850 }, { description: 'Tirage cable 10mm2', quantity: 15, unitPrice: 18 }, { description: 'Protection differentielle dediee', quantity: 1, unitPrice: 180 }, { description: 'Main d\'oeuvre installation', quantity: 6, unitPrice: 55 }] } },
      { clientIndex: 0, data: { title: 'Eclairage LED complet maison', description: 'Remplacement eclairage par LED dans toute la maison', status: 'ACCEPTE', amountHT: 1200, tvaRate: 20, items: [{ description: 'Spots LED encastrables (lot)', quantity: 20, unitPrice: 25 }, { description: 'Pose et raccordement', quantity: 20, unitPrice: 20 }, { description: 'Variateurs', quantity: 3, unitPrice: 65 }] } },
    ],
    factures: [
      { clientIndex: 0, interventionIndex: 0, data: { status: 'PAID', amountHT: 220, tvaRate: 20, items: [{ description: 'Diagnostic et reparation tableau', quantity: 1, unitPrice: 220 }] } },
    ],
  },
};

// Generate default data for metiers without specific data
function getDefaultData(metier: string): MetierData {
  const metierLabel = metier.charAt(0).toUpperCase() + metier.slice(1);
  return {
    companyName: `${metierLabel} Demo`,
    clients: SHARED_CLIENTS,
    interventions: [
      { clientIndex: 0, data: { title: `Intervention ${metierLabel} #1`, description: 'Intervention standard', address: '15 rue des Lilas, Lyon', status: 'PAID', amountHT: 350, tvaRate: 10, heuresEstimees: 3, items: [{ description: 'Main d\'oeuvre', quantity: 3, unitPrice: 55 }, { description: 'Fournitures', quantity: 1, unitPrice: 185 }] } },
      { clientIndex: 1, data: { title: `Intervention ${metierLabel} #2`, description: 'Depannage urgent', address: '8 avenue Victor Hugo, Lyon', status: 'INVOICED', amountHT: 580, tvaRate: 10, heuresEstimees: 5, items: [{ description: 'Main d\'oeuvre', quantity: 5, unitPrice: 55 }, { description: 'Fournitures', quantity: 1, unitPrice: 305 }] } },
      { clientIndex: 2, data: { title: `Intervention ${metierLabel} #3`, description: 'Travaux planifies', address: '42 boulevard Gambetta, Villeurbanne', status: 'PENDING', amountHT: 1200, tvaRate: 10, heuresEstimees: 8, items: [{ description: 'Main d\'oeuvre', quantity: 8, unitPrice: 55 }, { description: 'Fournitures', quantity: 1, unitPrice: 760 }] } },
    ],
    devis: [
      { clientIndex: 3, data: { title: `Devis ${metierLabel} - Travaux neufs`, description: 'Devis pour travaux neufs', status: 'ENVOYE', amountHT: 3500, tvaRate: 10, items: [{ description: 'Main d\'oeuvre', quantity: 20, unitPrice: 55 }, { description: 'Materiaux', quantity: 1, unitPrice: 2400 }] } },
      { clientIndex: 0, data: { title: `Devis ${metierLabel} - Renovation`, description: 'Devis renovation', status: 'BROUILLON', amountHT: 5200, tvaRate: 10, items: [{ description: 'Depose existant', quantity: 1, unitPrice: 800 }, { description: 'Travaux neufs', quantity: 1, unitPrice: 3200 }, { description: 'Finitions', quantity: 1, unitPrice: 1200 }] } },
    ],
    factures: [
      { clientIndex: 0, interventionIndex: 0, data: { status: 'PAID', amountHT: 350, tvaRate: 10, items: [{ description: 'Intervention complete', quantity: 1, unitPrice: 350 }] } },
    ],
  };
}

export function getDemoData(metier: string): MetierData {
  return METIER_DATA[metier] || getDefaultData(metier);
}

export const DEMO_METIERS = [
  { id: 'plombier', label: 'Plombier' },
  { id: 'electricien', label: 'Electricien' },
  { id: 'carreleur', label: 'Carreleur' },
  { id: 'macon', label: 'Macon' },
  { id: 'menuisier', label: 'Menuisier' },
  { id: 'peintre', label: 'Peintre' },
  { id: 'couvreur', label: 'Couvreur' },
  { id: 'chauffagiste', label: 'Chauffagiste' },
  { id: 'climaticien', label: 'Climaticien' },
  { id: 'multi-services', label: 'Multi-services' },
  { id: 'entreprise-generale', label: 'Entreprise generale du batiment' },
];

export { generateReference, generateDevisReference, calculateTTC };
