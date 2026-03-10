import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const registerSchema = z.object({
  firstName: z.string().min(2, 'Prénom requis (2 car. min.)'),
  lastName: z.string().min(2, 'Nom requis (2 car. min.)'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
  companyName: z.string().min(2, 'Nom d\'entreprise requis'),
  metier: z.string().optional(),
  referralCode: z.string().optional(),
  affiliateCode: z.string().optional(),
  ambassadorCode: z.string().optional(),
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres').optional().or(z.literal('')),
  companyAddress: z.string().optional().or(z.literal('')),
  companyPostalCode: z.string().optional().or(z.literal('')),
  companyCity: z.string().optional().or(z.literal('')),
});

export const clientSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export const interventionItemSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().min(0.01, 'Quantité invalide'),
  unitPrice: z.number().min(0, 'Prix invalide'),
  type: z.enum(['prestation', 'main_oeuvre', 'materiel']).optional(),
  prixAchat: z.number().min(0).optional().nullable(),
  coefMarge: z.number().min(1).optional().nullable(),
});

export const interventionSchema = z.object({
  title: z.string().min(2, 'Titre requis'),
  description: z.string().optional().or(z.literal('')),
  date: z.string().min(1, 'Date requise'),
  clientId: z.string().min(1, 'Client requis'),
  status: z.enum(['PENDING', 'INVOICED', 'PAID']).optional(),
  tvaRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(interventionItemSchema).min(1, 'Au moins une ligne requise'),
});

export const companySchema = z.object({
  name: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  postalCode: z.string().optional().or(z.literal('')),
  siret: z.string().optional().or(z.literal('')),
  logoUrl: z.string().optional().or(z.literal('')),
  primaryColor: z.string().optional().or(z.literal('')),
});

export const inviteUserSchema = z.object({
  firstName: z.string().min(2, 'Prénom requis (2 car. min.)'),
  lastName: z.string().min(2, 'Nom requis (2 car. min.)'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
  role: z.enum(['PATRON', 'SECRETAIRE', 'EMPLOYE'], { required_error: 'Rôle requis' }),
});

export const feuilleHeureSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  heuresTravaillees: z.number().min(0.5, 'Minimum 0.5h').max(24, 'Maximum 24h'),
  panierRepas: z.boolean().optional(),
  zone: z.number().int().min(1).max(5).optional().nullable(),
  grandDeplacement: z.boolean().optional(),
  interventionId: z.string().optional().or(z.literal('')),
});

export const planningSchema = z.object({
  date: z.string().min(1, 'Date requise'),
  heureDebut: z.string().min(1, 'Heure de début requise'),
  heureFin: z.string().min(1, 'Heure de fin requise'),
  utilisateurId: z.string().min(1, 'Utilisateur requis'),
  interventionId: z.string().optional().or(z.literal('')),
  statut: z.enum(['PREVU', 'CONFIRME', 'ANNULE']).optional(),
});

export const interventionPhotoSchema = z.object({
  data: z.string().min(1, 'Photo requise'),
  label: z.string().optional().or(z.literal('')),
});

export const signatureSchema = z.object({
  signatureClient: z.string().min(1, 'Signature requise'),
});

export const devisItemSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().min(0.01, 'Quantité invalide'),
  unitPrice: z.number().min(0, 'Prix invalide'),
  type: z.enum(['prestation', 'main_oeuvre', 'materiel']).optional(),
  prixAchat: z.number().min(0).optional().nullable(),
  coefMarge: z.number().min(0.1).optional().nullable(),
  fournisseur: z.string().optional().nullable(),
  referenceFournisseur: z.string().optional().nullable(),
});

export const devisSchema = z.object({
  title: z.string().min(2, 'Titre requis'),
  description: z.string().optional().or(z.literal('')),
  date: z.string().min(1, 'Date requise'),
  dateExpiration: z.string().optional().or(z.literal('')).nullable(),
  clientId: z.string().min(1, 'Client requis'),
  status: z.enum(['BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE', 'FACTURE']).optional(),
  tvaRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional().or(z.literal('')),
  conditionsParticulieres: z.string().optional().or(z.literal('')),
  adresseChantier: z.string().optional().or(z.literal('')),
  villeChantier: z.string().optional().or(z.literal('')),
  cpChantier: z.string().optional().or(z.literal('')),
  conditionsPaiement: z.string().optional().or(z.literal('')),
  acomptePercent: z.number().min(0).max(100).optional().nullable(),
  delaiTravaux: z.string().optional().or(z.literal('')),
  items: z.array(devisItemSchema).min(1, 'Au moins une ligne requise'),
});

export const factureItemSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().min(0.01, 'Quantité invalide'),
  unitPrice: z.number().min(0, 'Prix invalide'),
});

export const factureSchema = z.object({
  interventionId: z.string().optional().or(z.literal('')),
  devisId: z.string().optional().or(z.literal('')),
  clientId: z.string().min(1, 'Client requis'),
  date: z.string().min(1, 'Date requise'),
  dateEcheance: z.string().optional().or(z.literal('')).nullable(),
  tvaRate: z.number().min(0).max(100).optional(),
  conditionsPaiement: z.string().optional().or(z.literal('')).nullable(),
  mentionsLegales: z.string().optional().or(z.literal('')).nullable(),
  notes: z.string().optional().or(z.literal('')).nullable(),
  items: z.array(factureItemSchema).min(1, 'Au moins une ligne requise'),
});

export const facturePaymentSchema = z.object({
  modePaiement: z.enum(['virement', 'cheque', 'especes', 'cb']),
  datePaiement: z.string().min(1, 'Date requise'),
});

export const articleSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  description: z.string().optional().or(z.literal('')),
  reference: z.string().optional().or(z.literal('')),
  categorie: z.string().optional().or(z.literal('')),
  unite: z.enum(['pièce', 'mètre', 'kg', 'litre', 'm²']).optional(),
  prixAchat: z.number().min(0, 'Prix invalide'),
  margePercent: z.number().min(0).max(500).optional(),
  prixVente: z.number().min(0).optional(),
});

export const articleUtiliseSchema = z.object({
  articleId: z.string().min(1, 'Article requis'),
  quantite: z.number().min(0.01, 'Quantité invalide'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type InterventionInput = z.infer<typeof interventionSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type FeuilleHeureInput = z.infer<typeof feuilleHeureSchema>;
export type PlanningInput = z.infer<typeof planningSchema>;
export type DevisInput = z.infer<typeof devisSchema>;
export type FactureInput = z.infer<typeof factureSchema>;
export type ArticleInput = z.infer<typeof articleSchema>;
