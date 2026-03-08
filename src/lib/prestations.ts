/**
 * Catalogue de prestations par métier.
 * Utilisé pour seeder les prestations par défaut lors de l'inscription,
 * et comme référence pour l'assistant IA.
 */

export const METIERS = [
  { value: 'plombier', label: 'Plombier' },
  { value: 'electricien', label: 'Électricien' },
  { value: 'chauffagiste', label: 'Chauffagiste' },
  { value: 'climatisation', label: 'Climatisation / Froid' },
  { value: 'carreleur', label: 'Carreleur' },
  { value: 'peintre', label: 'Peintre' },
  { value: 'menuisier', label: 'Menuisier' },
  { value: 'maçon', label: 'Maçon' },
  { value: 'couvreur', label: 'Couvreur' },
  { value: 'serrurier', label: 'Serrurier' },
  { value: 'pisciniste', label: 'Pisciniste' },
  { value: 'paysagiste', label: 'Paysagiste' },
  { value: 'terrassement', label: 'Terrassement' },
  { value: 'renovation', label: 'Rénovation générale' },
  { value: 'multi-services', label: 'Multi-services' },
  { value: 'autre', label: 'Autre' },
] as const;

export type MetierValue = (typeof METIERS)[number]['value'];

export interface PrestationDefault {
  label: string;
  description?: string;
  category: string;
  hours: number;
  prixMateriel?: number;
}

/**
 * Prestations par défaut par métier.
 * "multi-services" et "autre" reçoivent toutes les prestations.
 */
const PRESTATIONS_BY_METIER: Record<string, PrestationDefault[]> = {
  plombier: [
    // Dépannage
    { label: 'Réparation fuite', description: 'Recherche et réparation de fuite sur canalisation ou raccord', category: 'Dépannage', hours: 1, prixMateriel: 15 },
    { label: 'Débouchage canalisation', description: 'Débouchage mécanique ou haute pression', category: 'Dépannage', hours: 1.5 },
    { label: 'Débouchage WC', description: 'Débouchage toilettes par furet ou ventouse', category: 'Dépannage', hours: 1 },
    { label: 'Réparation chasse d\'eau', description: 'Réglage ou remplacement partiel du mécanisme', category: 'Dépannage', hours: 0.5, prixMateriel: 10 },
    // Dépose
    { label: 'Dépose sanitaires', description: 'Démontage et évacuation des anciens sanitaires', category: 'Dépose', hours: 3 },
    { label: 'Dépose baignoire', description: 'Démontage baignoire et robinetterie', category: 'Dépose', hours: 2 },
    { label: 'Dépose chauffe-eau', description: 'Vidange, déconnexion et dépose ancien chauffe-eau', category: 'Dépose', hours: 1.5 },
    // Installation
    { label: 'Installation lavabo', description: 'Pose lavabo avec raccordements eau chaude/froide et évacuation', category: 'Installation', hours: 2, prixMateriel: 150 },
    { label: 'Installation WC', description: 'Pose WC complet avec raccordements', category: 'Installation', hours: 2.5, prixMateriel: 200 },
    { label: 'Installation WC suspendu', description: 'Pose bâti-support et WC suspendu avec raccordements', category: 'Installation', hours: 4, prixMateriel: 450 },
    { label: 'Installation douche', description: 'Pose receveur, colonne de douche et raccordements', category: 'Installation', hours: 4, prixMateriel: 350 },
    { label: 'Installation douche à l\'italienne', description: 'Réalisation douche de plain-pied avec étanchéité', category: 'Installation', hours: 8, prixMateriel: 600 },
    { label: 'Installation baignoire', description: 'Pose baignoire avec robinetterie et évacuation', category: 'Installation', hours: 5, prixMateriel: 500 },
    { label: 'Installation chauffe-eau / cumulus', description: 'Pose chauffe-eau avec raccordements eau et électricité', category: 'Installation', hours: 3, prixMateriel: 600 },
    { label: 'Installation adoucisseur', description: 'Pose adoucisseur d\'eau avec by-pass', category: 'Installation', hours: 3, prixMateriel: 800 },
    { label: 'Installation machine à laver', description: 'Raccordement eau et évacuation', category: 'Installation', hours: 1, prixMateriel: 20 },
    { label: 'Installation lave-vaisselle', description: 'Raccordement eau et évacuation sous évier', category: 'Installation', hours: 1, prixMateriel: 25 },
    { label: 'Pose radiateur', description: 'Pose radiateur avec raccordements au circuit de chauffage', category: 'Installation', hours: 2, prixMateriel: 250 },
    // Remplacement
    { label: 'Remplacement robinet / mitigeur', description: 'Fourniture et pose robinet ou mitigeur', category: 'Remplacement', hours: 1, prixMateriel: 80 },
    { label: 'Remplacement chasse d\'eau', description: 'Remplacement mécanisme de chasse d\'eau complet', category: 'Remplacement', hours: 1, prixMateriel: 35 },
    { label: 'Remplacement siphon', description: 'Remplacement siphon lavabo, évier ou baignoire', category: 'Remplacement', hours: 0.5, prixMateriel: 15 },
    { label: 'Remplacement flexible douche', description: 'Remplacement flexible et/ou douchette', category: 'Remplacement', hours: 0.5, prixMateriel: 25 },
    { label: 'Remplacement chauffe-eau', description: 'Dépose ancien et pose nouveau chauffe-eau avec raccordements', category: 'Remplacement', hours: 3, prixMateriel: 600 },
    // Rénovation
    { label: 'Plomberie salle de bain complète', description: 'Création complète des réseaux eau chaude/froide et évacuation', category: 'Rénovation', hours: 35, prixMateriel: 800 },
    { label: 'Rénovation salle de bain complète', description: 'Rénovation totale incluant plomberie, sanitaires et finitions', category: 'Rénovation', hours: 60, prixMateriel: 3000 },
    { label: 'Réfection réseau évacuation', description: 'Remplacement canalisations d\'évacuation PVC', category: 'Rénovation', hours: 6, prixMateriel: 150 },
    // Mise en service
    { label: 'Mise en eau installation', description: 'Remplissage, purge et vérification étanchéité', category: 'Mise en service', hours: 1 },
    { label: 'Essai pression réseau', description: 'Test d\'étanchéité sous pression du réseau', category: 'Mise en service', hours: 0.5 },
    // Divers
    { label: 'Diagnostic / état des lieux', description: 'Inspection et diagnostic de la plomberie existante', category: 'Divers', hours: 1 },
    { label: 'Évacuation gravats', description: 'Chargement et évacuation des déchets de chantier', category: 'Divers', hours: 2 },
    { label: 'Fourniture petits consommables', description: 'Joints, téflon, colliers, raccords divers', category: 'Fourniture', hours: 0, prixMateriel: 30 },
  ],

  electricien: [
    // Dépannage
    { label: 'Dépannage électrique', description: 'Recherche de panne et réparation', category: 'Dépannage', hours: 1 },
    { label: 'Recherche de panne', description: 'Diagnostic approfondi d\'une installation défaillante', category: 'Dépannage', hours: 1.5 },
    { label: 'Remplacement disjoncteur', description: 'Remplacement disjoncteur divisionnaire au tableau', category: 'Dépannage', hours: 0.5, prixMateriel: 20 },
    // Dépose
    { label: 'Dépose ancien tableau', description: 'Démontage et déconnexion tableau vétuste', category: 'Dépose', hours: 2 },
    { label: 'Dépose luminaire', description: 'Démontage luminaire existant', category: 'Dépose', hours: 0.5 },
    // Installation
    { label: 'Installation prise électrique', description: 'Pose et raccordement prise 16A encastrée', category: 'Installation', hours: 1, prixMateriel: 15 },
    { label: 'Installation interrupteur', description: 'Pose et raccordement interrupteur simple ou va-et-vient', category: 'Installation', hours: 0.5, prixMateriel: 12 },
    { label: 'Installation luminaire', description: 'Pose et raccordement point lumineux', category: 'Installation', hours: 1, prixMateriel: 10 },
    { label: 'Installation spot encastré', description: 'Perçage, pose et raccordement spot LED', category: 'Installation', hours: 0.5, prixMateriel: 20 },
    { label: 'Installation tableau électrique', description: 'Pose tableau avec disjoncteurs et différentiels', category: 'Installation', hours: 5, prixMateriel: 350 },
    { label: 'Câblage électrique pièce', description: 'Tirage de câbles et raccordement complet d\'une pièce', category: 'Installation', hours: 6, prixMateriel: 120 },
    { label: 'Installation VMC', description: 'Pose VMC simple flux avec bouches', category: 'Installation', hours: 4, prixMateriel: 200 },
    { label: 'Installation volet roulant électrique', description: 'Pose moteur et raccordement volet roulant', category: 'Installation', hours: 3, prixMateriel: 250 },
    { label: 'Installation domotique', description: 'Pose modules domotique et programmation', category: 'Installation', hours: 4, prixMateriel: 300 },
    { label: 'Installation interphone / visiophone', description: 'Pose et câblage interphone ou visiophone', category: 'Installation', hours: 2, prixMateriel: 200 },
    { label: 'Installation borne de recharge', description: 'Pose borne de recharge véhicule électrique', category: 'Installation', hours: 4, prixMateriel: 800 },
    { label: 'Passage de câbles', description: 'Tirage câbles en goulotte ou encastré', category: 'Installation', hours: 3, prixMateriel: 40 },
    { label: 'Installation détecteur de fumée', description: 'Pose et raccordement détecteur incendie', category: 'Installation', hours: 0.5, prixMateriel: 25 },
    // Remplacement
    { label: 'Remplacement prise / interrupteur', description: 'Remplacement appareillage défectueux', category: 'Remplacement', hours: 0.5, prixMateriel: 15 },
    { label: 'Remplacement tableau électrique', description: 'Remplacement complet du tableau de distribution', category: 'Remplacement', hours: 6, prixMateriel: 400 },
    // Rénovation
    { label: 'Mise aux normes électriques', description: 'Mise en conformité NF C 15-100', category: 'Rénovation', hours: 8, prixMateriel: 500 },
    { label: 'Rénovation électrique complète', description: 'Réfection totale installation électrique logement', category: 'Rénovation', hours: 40, prixMateriel: 2000 },
    // Mise en service
    { label: 'Mise en service installation', description: 'Tests, vérifications et mise sous tension', category: 'Mise en service', hours: 1 },
    { label: 'Vérification consuel', description: 'Préparation et accompagnement contrôle Consuel', category: 'Mise en service', hours: 2 },
    // Divers
    { label: 'Diagnostic électrique', description: 'Inspection et rapport de l\'installation électrique', category: 'Divers', hours: 1 },
  ],

  chauffagiste: [
    // Dépannage
    { label: 'Réparation fuite chauffage', description: 'Recherche et réparation fuite sur circuit chauffage', category: 'Dépannage', hours: 1.5, prixMateriel: 20 },
    { label: 'Dépannage chaudière', description: 'Diagnostic et réparation panne chaudière', category: 'Dépannage', hours: 2, prixMateriel: 50 },
    { label: 'Purge radiateurs', description: 'Purge complète de tous les radiateurs', category: 'Dépannage', hours: 1 },
    // Dépose
    { label: 'Dépose chaudière', description: 'Déconnexion et évacuation ancienne chaudière', category: 'Dépose', hours: 3 },
    { label: 'Dépose radiateur', description: 'Démontage et vidange radiateur', category: 'Dépose', hours: 1 },
    // Installation
    { label: 'Installation chaudière gaz', description: 'Pose chaudière gaz murale avec raccordements', category: 'Installation', hours: 5, prixMateriel: 2500 },
    { label: 'Installation chaudière condensation', description: 'Pose chaudière condensation avec évacuation', category: 'Installation', hours: 6, prixMateriel: 3500 },
    { label: 'Installation pompe à chaleur', description: 'Pose PAC air/eau avec unités intérieure et extérieure', category: 'Installation', hours: 8, prixMateriel: 6000 },
    { label: 'Pose radiateur', description: 'Pose radiateur avec raccordements au circuit de chauffage', category: 'Installation', hours: 2, prixMateriel: 250 },
    { label: 'Installation plancher chauffant', description: 'Pose circuit plancher chauffant eau (par pièce)', category: 'Installation', hours: 20, prixMateriel: 1500 },
    { label: 'Installation thermostat', description: 'Pose et programmation thermostat d\'ambiance', category: 'Installation', hours: 1.5, prixMateriel: 150 },
    { label: 'Installation thermostat connecté', description: 'Pose thermostat connecté avec configuration WiFi', category: 'Installation', hours: 2, prixMateriel: 250 },
    { label: 'Installation chauffe-eau thermodynamique', description: 'Pose chauffe-eau thermodynamique avec raccordements', category: 'Installation', hours: 4, prixMateriel: 2000 },
    { label: 'Installation poêle à granulés', description: 'Pose poêle avec conduit et tubage', category: 'Installation', hours: 6, prixMateriel: 3000 },
    // Remplacement
    { label: 'Remplacement chaudière', description: 'Dépose ancienne et pose nouvelle chaudière', category: 'Remplacement', hours: 6, prixMateriel: 3000 },
    { label: 'Remplacement chauffe-eau / cumulus', description: 'Dépose ancien et pose nouveau chauffe-eau', category: 'Remplacement', hours: 3, prixMateriel: 600 },
    { label: 'Remplacement circulateur', description: 'Remplacement pompe de circulation chauffage', category: 'Remplacement', hours: 1.5, prixMateriel: 200 },
    // Entretien
    { label: 'Entretien chaudière annuel', description: 'Entretien obligatoire annuel avec certificat', category: 'Entretien', hours: 1.5, prixMateriel: 20 },
    { label: 'Désembouage circuit', description: 'Nettoyage chimique du circuit de chauffage', category: 'Entretien', hours: 3, prixMateriel: 150 },
    { label: 'Ramonage conduit', description: 'Ramonage conduit de fumée avec certificat', category: 'Entretien', hours: 1, prixMateriel: 10 },
    // Mise en service
    { label: 'Mise en service chauffage', description: 'Remplissage, purge, réglages et mise en route', category: 'Mise en service', hours: 2 },
    { label: 'Équilibrage réseau', description: 'Réglage des débits radiateurs pour confort optimal', category: 'Mise en service', hours: 2 },
    // Divers
    { label: 'Diagnostic chauffage', description: 'Inspection et diagnostic de l\'installation', category: 'Divers', hours: 1 },
  ],

  climatisation: [
    // Dépannage
    { label: 'Dépannage climatisation', description: 'Diagnostic et réparation panne climatisation', category: 'Dépannage', hours: 2, prixMateriel: 30 },
    { label: 'Recherche fuite fluide', description: 'Détection fuite de fluide frigorigène', category: 'Dépannage', hours: 1.5 },
    // Dépose
    { label: 'Dépose climatisation', description: 'Récupération fluide et démontage unités', category: 'Dépose', hours: 2 },
    { label: 'Dépose unité extérieure', description: 'Démontage et évacuation groupe extérieur', category: 'Dépose', hours: 1.5 },
    // Installation
    { label: 'Installation climatisation mono-split', description: 'Pose unités intérieure et extérieure avec liaison', category: 'Installation', hours: 4, prixMateriel: 1200 },
    { label: 'Installation climatisation multi-split', description: 'Pose multi-split (1 UE + 2-4 UI) avec liaisons', category: 'Installation', hours: 8, prixMateriel: 3000 },
    { label: 'Installation climatisation gainable', description: 'Pose climatisation gainable avec gaines et bouches', category: 'Installation', hours: 12, prixMateriel: 4000 },
    { label: 'Installation VMC double flux', description: 'Pose VMC double flux avec gaines et bouches', category: 'Installation', hours: 6, prixMateriel: 1500 },
    { label: 'Installation pompe à chaleur air/air', description: 'Pose PAC réversible chaud/froid', category: 'Installation', hours: 8, prixMateriel: 4000 },
    { label: 'Installation unité intérieure supplémentaire', description: 'Ajout d\'une unité intérieure sur multi-split existant', category: 'Installation', hours: 3, prixMateriel: 600 },
    // Remplacement
    { label: 'Remplacement climatisation', description: 'Dépose ancienne et pose nouvelle climatisation', category: 'Remplacement', hours: 5, prixMateriel: 1500 },
    // Entretien
    { label: 'Entretien climatisation', description: 'Nettoyage filtres, vérification pressions et fonctionnement', category: 'Entretien', hours: 1.5, prixMateriel: 15 },
    { label: 'Recharge gaz frigorigène', description: 'Complément de charge en fluide frigorigène R32/R410A', category: 'Entretien', hours: 1, prixMateriel: 80 },
    { label: 'Nettoyage complet unités', description: 'Démontage et nettoyage approfondi des unités', category: 'Entretien', hours: 2, prixMateriel: 20 },
    // Mise en service
    { label: 'Mise en service climatisation', description: 'Tirage au vide, charge, tests et réglages', category: 'Mise en service', hours: 1.5 },
    // Divers
    { label: 'Diagnostic climatisation', description: 'Inspection et diagnostic de l\'installation', category: 'Divers', hours: 1 },
    { label: 'Certificat étanchéité', description: 'Contrôle étanchéité fluide et délivrance certificat', category: 'Divers', hours: 1 },
  ],

  carreleur: [
    // Dépose
    { label: 'Dépose ancien carrelage sol', description: 'Démontage carrelage sol et nettoyage support', category: 'Dépose', hours: 4, prixMateriel: 10 },
    { label: 'Dépose ancien carrelage mural', description: 'Démontage carrelage mural et préparation', category: 'Dépose', hours: 3 },
    { label: 'Dépose faïence', description: 'Démontage ancienne faïence', category: 'Dépose', hours: 3 },
    // Préparation
    { label: 'Ragréage sol', description: 'Mise à niveau du sol avant pose', category: 'Préparation', hours: 3, prixMateriel: 60 },
    { label: 'Primaire d\'accrochage', description: 'Application primaire sur support', category: 'Préparation', hours: 0.5, prixMateriel: 20 },
    { label: 'Étanchéité sous carrelage', description: 'Application système d\'étanchéité (SPEC)', category: 'Préparation', hours: 2, prixMateriel: 80 },
    // Pose
    { label: 'Pose carrelage sol (par m²)', description: 'Pose carrelage sol avec colle et croisillons', category: 'Pose', hours: 1, prixMateriel: 35 },
    { label: 'Pose carrelage mural (par m²)', description: 'Pose carrelage mur avec colle', category: 'Pose', hours: 0.8, prixMateriel: 30 },
    { label: 'Pose faïence (par m²)', description: 'Pose faïence murale salle de bain / cuisine', category: 'Pose', hours: 0.8, prixMateriel: 30 },
    { label: 'Pose mosaïque (par m²)', description: 'Pose mosaïque sur filet ou à l\'unité', category: 'Pose', hours: 1.5, prixMateriel: 50 },
    { label: 'Pose carrelage grand format (par m²)', description: 'Pose carrelage 60x60 ou plus avec double encollage', category: 'Pose', hours: 1.2, prixMateriel: 45 },
    { label: 'Pose crédence cuisine', description: 'Pose carrelage ou faïence en crédence', category: 'Pose', hours: 3, prixMateriel: 80 },
    { label: 'Pose plinthes carrelage', description: 'Pose plinthes en carrelage (ml)', category: 'Pose', hours: 0.3, prixMateriel: 8 },
    // Rénovation
    { label: 'Carrelage salle de bain complète', description: 'Sol + murs salle de bain (environ 6-8m²)', category: 'Rénovation', hours: 20, prixMateriel: 500 },
    { label: 'Carrelage cuisine complète', description: 'Sol cuisine + crédence', category: 'Rénovation', hours: 8, prixMateriel: 300 },
    // Finition
    { label: 'Joints carrelage', description: 'Réalisation des joints au ciment ou époxy', category: 'Finition', hours: 2, prixMateriel: 25 },
    { label: 'Joints silicone', description: 'Joints silicone d\'étanchéité périphériques', category: 'Finition', hours: 1, prixMateriel: 10 },
    // Réparation
    { label: 'Réparation carrelage', description: 'Remplacement carreaux cassés ou décollés', category: 'Réparation', hours: 2, prixMateriel: 20 },
    // Divers
    { label: 'Évacuation gravats', description: 'Chargement et évacuation des déchets', category: 'Divers', hours: 2 },
    { label: 'Protection chantier', description: 'Bâchage et protection des zones non concernées', category: 'Divers', hours: 0.5 },
  ],

  peintre: [
    // Dépose
    { label: 'Dépose papier peint', description: 'Décollage papier peint et nettoyage support', category: 'Dépose', hours: 3, prixMateriel: 10 },
    { label: 'Décapage peinture ancienne', description: 'Décapage chimique ou thermique', category: 'Dépose', hours: 4, prixMateriel: 25 },
    // Préparation
    { label: 'Enduit / rebouchage', description: 'Rebouchage trous et fissures, enduit de lissage', category: 'Préparation', hours: 3, prixMateriel: 20 },
    { label: 'Ponçage / préparation murs', description: 'Ponçage murs et dépoussiérage avant peinture', category: 'Préparation', hours: 2, prixMateriel: 10 },
    { label: 'Sous-couche / primaire', description: 'Application sous-couche d\'accrochage', category: 'Préparation', hours: 2, prixMateriel: 30 },
    { label: 'Traitement fissures', description: 'Ouverture et traitement des fissures avec calicot', category: 'Préparation', hours: 2, prixMateriel: 15 },
    { label: 'Traitement humidité', description: 'Traitement anti-humidité avant peinture', category: 'Préparation', hours: 1.5, prixMateriel: 40 },
    // Peinture
    { label: 'Peinture murs (par pièce)', description: 'Peinture murs 2 couches (pièce ~12m²)', category: 'Peinture', hours: 6, prixMateriel: 60 },
    { label: 'Peinture plafond (par pièce)', description: 'Peinture plafond 2 couches', category: 'Peinture', hours: 4, prixMateriel: 40 },
    { label: 'Peinture boiseries / portes', description: 'Peinture boiseries, portes, huisseries', category: 'Peinture', hours: 2, prixMateriel: 25 },
    { label: 'Peinture sol / garage', description: 'Peinture sol béton garage ou cave', category: 'Peinture', hours: 4, prixMateriel: 80 },
    { label: 'Laquage meuble', description: 'Ponçage et laquage meuble (2 couches)', category: 'Peinture', hours: 3, prixMateriel: 40 },
    { label: 'Peinture radiateur', description: 'Peinture spéciale haute température radiateur', category: 'Peinture', hours: 1.5, prixMateriel: 20 },
    // Revêtement
    { label: 'Pose papier peint (par pièce)', description: 'Pose papier peint ou toile de verre', category: 'Revêtement', hours: 5, prixMateriel: 80 },
    { label: 'Pose toile de verre', description: 'Encollage et pose toile de verre à peindre', category: 'Revêtement', hours: 4, prixMateriel: 40 },
    // Extérieur
    { label: 'Peinture façade', description: 'Peinture façade extérieure (par face)', category: 'Extérieur', hours: 15, prixMateriel: 200 },
    { label: 'Ravalement façade', description: 'Ravalement complet : nettoyage, enduit, peinture', category: 'Extérieur', hours: 25, prixMateriel: 500 },
    { label: 'Peinture volets', description: 'Peinture volets bois (par paire)', category: 'Extérieur', hours: 2, prixMateriel: 30 },
    // Divers
    { label: 'Protection chantier', description: 'Bâchage sols et meubles, scotch de masquage', category: 'Divers', hours: 1, prixMateriel: 15 },
    { label: 'Nettoyage fin de chantier', description: 'Nettoyage complet après travaux de peinture', category: 'Divers', hours: 1.5 },
  ],

  menuisier: [
    // Dépose
    { label: 'Dépose porte intérieure', description: 'Démontage porte, bâti et habillage', category: 'Dépose', hours: 1 },
    { label: 'Dépose fenêtre', description: 'Démontage fenêtre et nettoyage tableau', category: 'Dépose', hours: 1.5 },
    { label: 'Dépose cuisine', description: 'Démontage et évacuation anciens meubles de cuisine', category: 'Dépose', hours: 4 },
    { label: 'Dépose parquet / sol', description: 'Arrachage ancien parquet ou revêtement de sol', category: 'Dépose', hours: 3 },
    // Installation
    { label: 'Pose porte intérieure', description: 'Pose porte intérieure avec huisserie et quincaillerie', category: 'Installation', hours: 2, prixMateriel: 200 },
    { label: 'Pose porte d\'entrée', description: 'Pose porte d\'entrée avec serrure multipoints', category: 'Installation', hours: 4, prixMateriel: 800 },
    { label: 'Pose porte coulissante', description: 'Pose porte coulissante à galandage ou en applique', category: 'Installation', hours: 3, prixMateriel: 400 },
    { label: 'Pose fenêtre', description: 'Pose fenêtre PVC/alu/bois avec calfeutrement', category: 'Installation', hours: 3, prixMateriel: 400 },
    { label: 'Pose porte-fenêtre', description: 'Pose porte-fenêtre avec seuil', category: 'Installation', hours: 4, prixMateriel: 600 },
    { label: 'Pose baie vitrée', description: 'Pose baie vitrée coulissante', category: 'Installation', hours: 5, prixMateriel: 1200 },
    { label: 'Pose cuisine', description: 'Montage et pose meubles de cuisine complets', category: 'Installation', hours: 12, prixMateriel: 200 },
    { label: 'Pose placards / rangements', description: 'Pose placards encastrés avec portes', category: 'Installation', hours: 6, prixMateriel: 400 },
    { label: 'Pose escalier', description: 'Pose escalier bois avec rampe et balustres', category: 'Installation', hours: 10, prixMateriel: 1500 },
    { label: 'Pose volets bois', description: 'Pose volets battants bois avec ferrures', category: 'Installation', hours: 3, prixMateriel: 300 },
    // Sol
    { label: 'Pose parquet massif (par m²)', description: 'Pose parquet massif cloué ou collé', category: 'Sol', hours: 1, prixMateriel: 50 },
    { label: 'Pose parquet flottant / stratifié (par m²)', description: 'Pose parquet stratifié avec sous-couche', category: 'Sol', hours: 0.5, prixMateriel: 25 },
    { label: 'Pose plinthes', description: 'Pose plinthes bois ou MDF (par ml)', category: 'Sol', hours: 0.2, prixMateriel: 5 },
    // Aménagement
    { label: 'Pose placo / cloison', description: 'Pose cloison placo sur ossature métallique', category: 'Aménagement', hours: 8, prixMateriel: 200 },
    { label: 'Pose faux plafond', description: 'Pose faux plafond suspendu placo ou dalles', category: 'Aménagement', hours: 8, prixMateriel: 200 },
    // Fabrication
    { label: 'Fabrication meuble sur mesure', description: 'Conception et fabrication meuble bois/MDF', category: 'Fabrication', hours: 15, prixMateriel: 300 },
    { label: 'Fabrication étagères sur mesure', description: 'Découpe et pose étagères sur mesure', category: 'Fabrication', hours: 4, prixMateriel: 80 },
    // Extérieur
    { label: 'Pose terrasse bois', description: 'Pose terrasse bois ou composite sur lambourdes', category: 'Extérieur', hours: 15, prixMateriel: 600 },
    { label: 'Pose pergola bois', description: 'Montage et pose pergola bois', category: 'Extérieur', hours: 8, prixMateriel: 800 },
    // Réparation
    { label: 'Réparation menuiserie', description: 'Réparation porte, fenêtre ou meuble', category: 'Réparation', hours: 2, prixMateriel: 20 },
    { label: 'Réparation parquet', description: 'Remplacement lames et ponçage local', category: 'Réparation', hours: 2, prixMateriel: 30 },
  ],

  maçon: [
    // Dépose
    { label: 'Démolition cloison', description: 'Démolition cloison briques ou parpaings', category: 'Dépose', hours: 4 },
    { label: 'Démolition mur porteur (avec IPN)', description: 'Ouverture mur porteur avec pose IPN/HEB', category: 'Dépose', hours: 12, prixMateriel: 500 },
    { label: 'Démolition muret extérieur', description: 'Démolition muret et évacuation', category: 'Dépose', hours: 3 },
    // Gros œuvre
    { label: 'Ouverture de mur', description: 'Création d\'une ouverture dans mur non porteur', category: 'Gros œuvre', hours: 8, prixMateriel: 50 },
    { label: 'Montage mur / cloison parpaings', description: 'Montage mur en parpaings (par m²)', category: 'Gros œuvre', hours: 1.5, prixMateriel: 25 },
    { label: 'Montage mur briques', description: 'Montage mur en briques (par m²)', category: 'Gros œuvre', hours: 2, prixMateriel: 30 },
    { label: 'Dalle béton', description: 'Coulage dalle béton armé (par m²)', category: 'Gros œuvre', hours: 1, prixMateriel: 40 },
    { label: 'Chape béton', description: 'Réalisation chape de finition (par m²)', category: 'Gros œuvre', hours: 0.5, prixMateriel: 20 },
    { label: 'Fondations', description: 'Terrassement et coulage semelles de fondation', category: 'Gros œuvre', hours: 12, prixMateriel: 400 },
    { label: 'Pose agglos / parpaings', description: 'Pose parpaings avec chaînage', category: 'Gros œuvre', hours: 6, prixMateriel: 150 },
    { label: 'Pose linteau / IPN', description: 'Pose linteau béton ou poutrelle métallique', category: 'Gros œuvre', hours: 3, prixMateriel: 200 },
    // Finition
    { label: 'Enduit extérieur (par m²)', description: 'Application enduit monocouche ou traditionnel', category: 'Finition', hours: 0.5, prixMateriel: 15 },
    { label: 'Crépissage', description: 'Crépi de finition intérieur ou extérieur', category: 'Finition', hours: 6, prixMateriel: 100 },
    { label: 'Ragréage sol', description: 'Mise à niveau sol avant revêtement', category: 'Finition', hours: 3, prixMateriel: 60 },
    // Extérieur
    { label: 'Construction muret / clôture', description: 'Construction muret en parpaings avec finition', category: 'Extérieur', hours: 6, prixMateriel: 200 },
    { label: 'Terrasse béton', description: 'Coffrage et coulage terrasse béton', category: 'Extérieur', hours: 10, prixMateriel: 400 },
    { label: 'Pose pavés / dalles extérieures', description: 'Pose pavés ou dalles sur lit de sable', category: 'Extérieur', hours: 6, prixMateriel: 200 },
    { label: 'Escalier extérieur béton', description: 'Coffrage et coulage escalier extérieur', category: 'Extérieur', hours: 8, prixMateriel: 250 },
    // Réparation
    { label: 'Réparation fissures mur', description: 'Ouverture et rebouchage fissures structurelles', category: 'Réparation', hours: 3, prixMateriel: 30 },
    { label: 'Reprise en sous-œuvre', description: 'Renforcement fondations existantes', category: 'Réparation', hours: 16, prixMateriel: 500 },
    // Divers
    { label: 'Évacuation gravats', description: 'Chargement et évacuation des déchets de chantier', category: 'Divers', hours: 2, prixMateriel: 80 },
    { label: 'Coffrage', description: 'Réalisation coffrage bois pour béton', category: 'Divers', hours: 3, prixMateriel: 40 },
  ],

  couvreur: [
    // Dépose
    { label: 'Dépose couverture (par m²)', description: 'Démontage tuiles/ardoises et nettoyage', category: 'Dépose', hours: 0.5 },
    { label: 'Dépose gouttière', description: 'Démontage gouttière et descente EP', category: 'Dépose', hours: 1.5 },
    { label: 'Dépose zinguerie', description: 'Démontage éléments de zinguerie (noues, rives)', category: 'Dépose', hours: 2 },
    // Installation
    { label: 'Pose tuiles (par m²)', description: 'Pose tuiles terre cuite ou béton sur liteaux', category: 'Installation', hours: 0.5, prixMateriel: 30 },
    { label: 'Pose ardoises (par m²)', description: 'Pose ardoises naturelles ou fibrociment', category: 'Installation', hours: 0.7, prixMateriel: 40 },
    { label: 'Pose écran sous-toiture', description: 'Déroulage et fixation écran HPV sous-toiture', category: 'Installation', hours: 3, prixMateriel: 100 },
    { label: 'Pose liteaux / voliges', description: 'Pose liteaux ou voligeage sur chevrons', category: 'Installation', hours: 4, prixMateriel: 150 },
    { label: 'Pose gouttière aluminium', description: 'Fourniture et pose gouttière alu (par ml)', category: 'Installation', hours: 0.5, prixMateriel: 25 },
    { label: 'Pose gouttière zinc', description: 'Fourniture et pose gouttière zinc (par ml)', category: 'Installation', hours: 0.5, prixMateriel: 35 },
    { label: 'Pose descente EP', description: 'Pose descente eau pluviale (par ml)', category: 'Installation', hours: 0.3, prixMateriel: 15 },
    { label: 'Pose velux / fenêtre de toit', description: 'Découpe et pose fenêtre de toit avec raccord', category: 'Installation', hours: 4, prixMateriel: 500 },
    { label: 'Pose faîtage', description: 'Pose faîtières scellées ou à sec', category: 'Installation', hours: 3, prixMateriel: 80 },
    { label: 'Pose noue', description: 'Réalisation noue zinguée', category: 'Installation', hours: 3, prixMateriel: 100 },
    { label: 'Pose chatière / ventilation', description: 'Pose chatières de ventilation sous-toiture', category: 'Installation', hours: 0.5, prixMateriel: 10 },
    // Rénovation
    { label: 'Réfection toiture complète', description: 'Dépose et repose couverture avec écran et isolation', category: 'Rénovation', hours: 40, prixMateriel: 3000 },
    { label: 'Isolation sous-toiture', description: 'Pose isolant entre et sous chevrons (par m²)', category: 'Rénovation', hours: 0.5, prixMateriel: 25 },
    // Réparation
    { label: 'Réparation fuite toiture', description: 'Recherche et réparation fuite en urgence', category: 'Réparation', hours: 2, prixMateriel: 30 },
    { label: 'Remplacement tuiles cassées', description: 'Remplacement tuiles ou ardoises cassées', category: 'Réparation', hours: 1, prixMateriel: 20 },
    { label: 'Réparation zinguerie', description: 'Réparation soudure zinc, noue ou abergement', category: 'Réparation', hours: 2, prixMateriel: 40 },
    { label: 'Traitement charpente', description: 'Traitement bois charpente insectes/champignons', category: 'Réparation', hours: 4, prixMateriel: 200 },
    // Divers
    { label: 'Nettoyage toiture', description: 'Nettoyage haute pression et traitement anti-mousse', category: 'Divers', hours: 4, prixMateriel: 80 },
    { label: 'Diagnostic toiture', description: 'Inspection et rapport d\'état de la toiture', category: 'Divers', hours: 1 },
    { label: 'Échafaudage / sécurité', description: 'Montage et démontage dispositifs de sécurité', category: 'Divers', hours: 3, prixMateriel: 150 },
  ],

  serrurier: [
    // Dépannage
    { label: 'Ouverture de porte (sans casse)', description: 'Ouverture porte claquée ou verrouillée sans dégât', category: 'Dépannage', hours: 0.5 },
    { label: 'Ouverture de porte (avec casse)', description: 'Ouverture forcée avec remplacement cylindre', category: 'Dépannage', hours: 1, prixMateriel: 50 },
    { label: 'Ouverture de porte blindée', description: 'Ouverture porte blindée ou haute sécurité', category: 'Dépannage', hours: 1.5, prixMateriel: 80 },
    // Dépose
    { label: 'Dépose serrure', description: 'Démontage serrure et quincaillerie', category: 'Dépose', hours: 0.5 },
    { label: 'Dépose porte', description: 'Démontage porte et bâti', category: 'Dépose', hours: 1 },
    // Installation
    { label: 'Pose serrure encastrée', description: 'Installation serrure à larder dans la porte', category: 'Installation', hours: 1.5, prixMateriel: 80 },
    { label: 'Pose serrure multipoints', description: 'Installation serrure 3 ou 5 points', category: 'Installation', hours: 2, prixMateriel: 250 },
    { label: 'Pose serrure connectée', description: 'Installation serrure connectée avec configuration', category: 'Installation', hours: 2, prixMateriel: 350 },
    { label: 'Pose porte blindée', description: 'Installation porte blindée avec huisserie renforcée', category: 'Installation', hours: 4, prixMateriel: 1500 },
    { label: 'Pose porte de garage', description: 'Installation porte de garage sectionnelle ou enroulable', category: 'Installation', hours: 4, prixMateriel: 1000 },
    { label: 'Pose grille de défense', description: 'Installation grille de protection fenêtre', category: 'Installation', hours: 2, prixMateriel: 200 },
    { label: 'Pose rideau métallique', description: 'Installation rideau métallique commerce', category: 'Installation', hours: 5, prixMateriel: 1500 },
    { label: 'Pose ferme-porte', description: 'Installation ferme-porte automatique', category: 'Installation', hours: 1, prixMateriel: 80 },
    { label: 'Pose barre anti-panique', description: 'Installation barre anti-panique ERP', category: 'Installation', hours: 1.5, prixMateriel: 200 },
    // Remplacement
    { label: 'Remplacement cylindre', description: 'Remplacement cylindre de serrure (même clé possible)', category: 'Remplacement', hours: 0.5, prixMateriel: 40 },
    { label: 'Remplacement serrure complète', description: 'Remplacement boîtier et cylindre de serrure', category: 'Remplacement', hours: 1.5, prixMateriel: 120 },
    { label: 'Remplacement poignée de porte', description: 'Remplacement poignée et rosaces', category: 'Remplacement', hours: 0.5, prixMateriel: 40 },
    // Réparation
    { label: 'Réparation serrure', description: 'Réparation mécanisme de serrure grippée', category: 'Réparation', hours: 1, prixMateriel: 15 },
    { label: 'Réparation porte', description: 'Réparation porte forcée ou endommagée', category: 'Réparation', hours: 2, prixMateriel: 50 },
    { label: 'Réparation rideau métallique', description: 'Réparation rideau métallique bloqué', category: 'Réparation', hours: 2, prixMateriel: 60 },
    // Divers
    { label: 'Reproduction de clé', description: 'Reproduction clé standard ou haute sécurité', category: 'Divers', hours: 0.5, prixMateriel: 20 },
    { label: 'Diagnostic sécurité', description: 'Audit de sécurité des accès et serrures', category: 'Divers', hours: 1 },
  ],

  pisciniste: [
    // Dépose
    { label: 'Dépose liner', description: 'Retrait ancien liner de piscine', category: 'Dépose', hours: 4 },
    { label: 'Dépose équipements', description: 'Démontage pompe, filtre, skimmer', category: 'Dépose', hours: 2 },
    // Installation
    { label: 'Construction piscine coque', description: 'Pose piscine coque polyester complète', category: 'Installation', hours: 40, prixMateriel: 8000 },
    { label: 'Construction piscine béton', description: 'Construction piscine maçonnée (hors terrassement)', category: 'Installation', hours: 80, prixMateriel: 12000 },
    { label: 'Pose liner', description: 'Pose liner PVC armé sur mesure', category: 'Installation', hours: 8, prixMateriel: 2000 },
    { label: 'Installation pompe filtration', description: 'Pose pompe de filtration avec raccordements', category: 'Installation', hours: 2, prixMateriel: 500 },
    { label: 'Installation filtre à sable', description: 'Pose filtre à sable avec vanne multivoies', category: 'Installation', hours: 2, prixMateriel: 400 },
    { label: 'Installation traitement automatique', description: 'Pose régulateur pH et/ou électrolyseur au sel', category: 'Installation', hours: 3, prixMateriel: 1200 },
    { label: 'Installation pompe à chaleur piscine', description: 'Pose PAC piscine avec raccordements hydrauliques', category: 'Installation', hours: 3, prixMateriel: 2500 },
    { label: 'Pose margelles', description: 'Pose margelles pierre ou béton autour du bassin', category: 'Installation', hours: 6, prixMateriel: 800 },
    { label: 'Installation volet roulant piscine', description: 'Pose couverture automatique de piscine', category: 'Installation', hours: 6, prixMateriel: 4000 },
    { label: 'Installation éclairage piscine', description: 'Pose projecteurs LED immergés', category: 'Installation', hours: 2, prixMateriel: 300 },
    { label: 'Installation douche extérieure', description: 'Pose douche solaire ou raccordée', category: 'Installation', hours: 2, prixMateriel: 200 },
    // Entretien
    { label: 'Mise en route saison', description: 'Remise en service piscine après hivernage', category: 'Entretien', hours: 2, prixMateriel: 50 },
    { label: 'Hivernage piscine', description: 'Mise en hivernage actif ou passif', category: 'Entretien', hours: 2, prixMateriel: 40 },
    { label: 'Entretien annuel complet', description: 'Nettoyage, vérifications, analyse eau, réglages', category: 'Entretien', hours: 3, prixMateriel: 60 },
    { label: 'Traitement eau verte', description: 'Traitement choc et remise en état eau trouble/verte', category: 'Entretien', hours: 2, prixMateriel: 80 },
    // Réparation
    { label: 'Réparation fuite piscine', description: 'Recherche et réparation fuite bassin ou réseau', category: 'Réparation', hours: 4, prixMateriel: 100 },
    { label: 'Réparation liner', description: 'Rustine ou soudure liner sous eau', category: 'Réparation', hours: 1, prixMateriel: 30 },
    { label: 'Réparation pompe', description: 'Diagnostic et réparation pompe filtration', category: 'Réparation', hours: 1.5, prixMateriel: 50 },
    // Remplacement
    { label: 'Remplacement pompe', description: 'Dépose et repose pompe de filtration', category: 'Remplacement', hours: 2, prixMateriel: 500 },
    { label: 'Remplacement filtre', description: 'Remplacement filtre ou média filtrant', category: 'Remplacement', hours: 2, prixMateriel: 350 },
    // Divers
    { label: 'Diagnostic piscine', description: 'Inspection complète installation et bassin', category: 'Divers', hours: 1.5 },
    { label: 'Analyse eau complète', description: 'Analyse eau et recommandations traitement', category: 'Divers', hours: 0.5, prixMateriel: 10 },
  ],

  paysagiste: [
    // Dépose
    { label: 'Abattage arbre', description: 'Abattage arbre avec tronçonnage et évacuation', category: 'Dépose', hours: 4, prixMateriel: 50 },
    { label: 'Dessouchage', description: 'Arrachage souche d\'arbre', category: 'Dépose', hours: 3, prixMateriel: 30 },
    { label: 'Débroussaillage terrain', description: 'Débroussaillage et nettoyage terrain (par 100m²)', category: 'Dépose', hours: 3 },
    { label: 'Arrachage haie', description: 'Arrachage et évacuation haie existante (par ml)', category: 'Dépose', hours: 0.5 },
    // Installation
    { label: 'Plantation arbre', description: 'Fourniture et plantation arbre d\'ornement', category: 'Installation', hours: 1.5, prixMateriel: 150 },
    { label: 'Plantation haie (par ml)', description: 'Fourniture et plantation haie champêtre ou persistante', category: 'Installation', hours: 0.5, prixMateriel: 20 },
    { label: 'Création massif fleuri', description: 'Préparation terre et plantation massif', category: 'Installation', hours: 4, prixMateriel: 200 },
    { label: 'Pose gazon en rouleau (par m²)', description: 'Préparation sol et pose gazon en plaques', category: 'Installation', hours: 0.2, prixMateriel: 10 },
    { label: 'Semis gazon (par m²)', description: 'Préparation sol et semis gazon', category: 'Installation', hours: 0.1, prixMateriel: 3 },
    { label: 'Pose terrasse bois / composite', description: 'Pose terrasse sur lambourdes (par m²)', category: 'Installation', hours: 1, prixMateriel: 60 },
    { label: 'Installation arrosage automatique', description: 'Pose réseau arrosage enterré avec programmateur', category: 'Installation', hours: 8, prixMateriel: 500 },
    { label: 'Pose clôture / grillage (par ml)', description: 'Pose poteaux et grillage ou panneaux rigides', category: 'Installation', hours: 0.5, prixMateriel: 30 },
    { label: 'Pose clôture bois (par ml)', description: 'Pose clôture lames bois avec poteaux', category: 'Installation', hours: 0.7, prixMateriel: 50 },
    { label: 'Pose bordures', description: 'Pose bordures béton ou pierre (par ml)', category: 'Installation', hours: 0.3, prixMateriel: 10 },
    { label: 'Création allée gravillonnée', description: 'Décaissement, géotextile et gravier (par m²)', category: 'Installation', hours: 0.5, prixMateriel: 15 },
    { label: 'Création allée pavée', description: 'Pose pavés sur lit de sable stabilisé (par m²)', category: 'Installation', hours: 1, prixMateriel: 35 },
    { label: 'Installation éclairage extérieur', description: 'Pose bornes et spots de jardin avec câblage', category: 'Installation', hours: 3, prixMateriel: 300 },
    { label: 'Pose pergola / tonnelle', description: 'Montage et fixation pergola bois ou alu', category: 'Installation', hours: 6, prixMateriel: 800 },
    // Entretien
    { label: 'Tonte pelouse', description: 'Tonte, ramassage et soufflage (par 100m²)', category: 'Entretien', hours: 0.5 },
    { label: 'Taille haie (par ml)', description: 'Taille haie avec ramassage', category: 'Entretien', hours: 0.3 },
    { label: 'Taille arbustes', description: 'Taille de formation ou d\'entretien', category: 'Entretien', hours: 1 },
    { label: 'Élagage arbre', description: 'Élagage et mise en forme arbre', category: 'Entretien', hours: 3, prixMateriel: 20 },
    { label: 'Entretien massif', description: 'Désherbage, taille et paillage massif', category: 'Entretien', hours: 2, prixMateriel: 20 },
    { label: 'Nettoyage jardin saisonnier', description: 'Nettoyage complet jardin de saison', category: 'Entretien', hours: 4 },
    // Divers
    { label: 'Évacuation déchets verts', description: 'Chargement et évacuation déchets végétaux', category: 'Divers', hours: 2, prixMateriel: 40 },
    { label: 'Conseil aménagement jardin', description: 'Étude et proposition d\'aménagement paysager', category: 'Divers', hours: 2 },
  ],

  terrassement: [
    // Dépose
    { label: 'Démolition béton extérieur', description: 'Démolition dalles béton, terrasse, allée', category: 'Dépose', hours: 4, prixMateriel: 50 },
    { label: 'Arrachage enrobé', description: 'Fraisage et arrachage ancien enrobé', category: 'Dépose', hours: 3 },
    // Terrassement
    { label: 'Terrassement pleine masse (par m³)', description: 'Excavation terrain naturel', category: 'Terrassement', hours: 0.5, prixMateriel: 5 },
    { label: 'Terrassement fondation', description: 'Fouilles en rigoles pour fondations', category: 'Terrassement', hours: 4, prixMateriel: 30 },
    { label: 'Terrassement piscine', description: 'Excavation fouille piscine avec talutage', category: 'Terrassement', hours: 8, prixMateriel: 100 },
    { label: 'Décaissement terrain (par m²)', description: 'Décaissement sur profondeur définie', category: 'Terrassement', hours: 0.3, prixMateriel: 3 },
    { label: 'Tranchée réseaux (par ml)', description: 'Creusement tranchée pour canalisations/câbles', category: 'Terrassement', hours: 0.5, prixMateriel: 5 },
    { label: 'Nivellement terrain', description: 'Mise à niveau et compactage du terrain', category: 'Terrassement', hours: 4, prixMateriel: 20 },
    // VRD
    { label: 'Pose canalisations EU/EP (par ml)', description: 'Pose canalisations assainissement ou eaux pluviales', category: 'VRD', hours: 0.5, prixMateriel: 20 },
    { label: 'Pose regard béton', description: 'Pose regard de visite avec tampon', category: 'VRD', hours: 1.5, prixMateriel: 150 },
    { label: 'Raccordement tout-à-l\'égout', description: 'Raccordement réseau privatif au collecteur', category: 'VRD', hours: 4, prixMateriel: 300 },
    { label: 'Pose fosse septique', description: 'Excavation et pose fosse toutes eaux', category: 'VRD', hours: 8, prixMateriel: 2000 },
    { label: 'Pose drain périphérique', description: 'Mise en place drain autour fondations', category: 'VRD', hours: 6, prixMateriel: 200 },
    { label: 'Enrobé / goudron (par m²)', description: 'Pose enrobé à chaud ou à froid', category: 'VRD', hours: 0.3, prixMateriel: 25 },
    // Installation
    { label: 'Pose géotextile', description: 'Déroulage géotextile anti-remontée', category: 'Installation', hours: 1, prixMateriel: 30 },
    { label: 'Empierrement / remblai', description: 'Apport et compactage tout-venant ou gravier', category: 'Installation', hours: 3, prixMateriel: 150 },
    { label: 'Mur de soutènement', description: 'Construction mur de soutènement béton armé', category: 'Installation', hours: 12, prixMateriel: 600 },
    { label: 'Enrochement', description: 'Mise en place enrochement paysager ou de soutien', category: 'Installation', hours: 4, prixMateriel: 300 },
    // Divers
    { label: 'Évacuation terres / gravats', description: 'Chargement et évacuation par camion', category: 'Divers', hours: 2, prixMateriel: 150 },
    { label: 'Location mini-pelle (journée)', description: 'Location mini-pelle avec transport', category: 'Divers', hours: 0, prixMateriel: 250 },
    { label: 'Étude de sol', description: 'Reconnaissance terrain et rapport', category: 'Divers', hours: 2 },
    { label: 'Implantation / piquetage', description: 'Tracé et implantation sur terrain', category: 'Divers', hours: 1 },
  ],

  renovation: [
    // Dépose
    { label: 'Démolition cloison', description: 'Démolition cloison et évacuation gravats', category: 'Dépose', hours: 4 },
    { label: 'Dépose revêtement sol', description: 'Arrachage ancien revêtement de sol', category: 'Dépose', hours: 3 },
    { label: 'Dépose sanitaires', description: 'Démontage et évacuation anciens sanitaires', category: 'Dépose', hours: 3 },
    { label: 'Dépose cuisine existante', description: 'Démontage meubles et équipements cuisine', category: 'Dépose', hours: 4 },
    { label: 'Curage appartement', description: 'Curage complet avant rénovation (par pièce)', category: 'Dépose', hours: 6 },
    // Gros œuvre
    { label: 'Ouverture de mur', description: 'Création ouverture dans mur non porteur', category: 'Gros œuvre', hours: 8, prixMateriel: 50 },
    { label: 'Montage cloison placo', description: 'Cloison placo sur rail métallique avec isolation', category: 'Gros œuvre', hours: 8, prixMateriel: 200 },
    { label: 'Doublage mur', description: 'Doublage isolant collé ou sur ossature', category: 'Gros œuvre', hours: 4, prixMateriel: 100 },
    { label: 'Faux plafond', description: 'Pose faux plafond suspendu placo', category: 'Gros œuvre', hours: 8, prixMateriel: 200 },
    { label: 'Ragréage sol', description: 'Mise à niveau sol avant revêtement', category: 'Gros œuvre', hours: 3, prixMateriel: 60 },
    // Plomberie
    { label: 'Plomberie salle de bain', description: 'Réseaux eau chaude/froide et évacuation SDB', category: 'Plomberie', hours: 8, prixMateriel: 200 },
    { label: 'Pose WC', description: 'Fourniture et pose WC avec raccordements', category: 'Plomberie', hours: 2.5, prixMateriel: 200 },
    { label: 'Pose lavabo / vasque', description: 'Fourniture et pose avec robinetterie', category: 'Plomberie', hours: 2, prixMateriel: 200 },
    { label: 'Pose douche complète', description: 'Receveur, colonne, paroi et raccordements', category: 'Plomberie', hours: 4, prixMateriel: 500 },
    // Électricité
    { label: 'Électricité pièce', description: 'Câblage complet d\'une pièce (prises, éclairage, inter)', category: 'Électricité', hours: 6, prixMateriel: 150 },
    { label: 'Tableau électrique', description: 'Remplacement ou création tableau électrique', category: 'Électricité', hours: 5, prixMateriel: 350 },
    // Peinture
    { label: 'Peinture pièce (murs + plafond)', description: 'Préparation et peinture 2 couches pièce complète', category: 'Peinture', hours: 8, prixMateriel: 80 },
    { label: 'Enduit + peinture murs', description: 'Enduit de lissage + peinture 2 couches', category: 'Peinture', hours: 10, prixMateriel: 100 },
    // Sol
    { label: 'Pose carrelage sol (par m²)', description: 'Pose carrelage avec colle et joints', category: 'Sol', hours: 1, prixMateriel: 35 },
    { label: 'Pose parquet / stratifié (par m²)', description: 'Pose parquet flottant avec sous-couche', category: 'Sol', hours: 0.5, prixMateriel: 25 },
    // Rénovation complète
    { label: 'Rénovation salle de bain complète', description: 'Dépose, plomberie, carrelage, sanitaires, peinture', category: 'Rénovation complète', hours: 60, prixMateriel: 3000 },
    { label: 'Rénovation cuisine complète', description: 'Dépose, plomberie, électricité, carrelage, peinture', category: 'Rénovation complète', hours: 50, prixMateriel: 2500 },
    { label: 'Rénovation appartement (par m²)', description: 'Rénovation intégrale tous corps d\'état', category: 'Rénovation complète', hours: 3, prixMateriel: 100 },
    // Divers
    { label: 'Évacuation gravats', description: 'Chargement et évacuation déchets chantier', category: 'Divers', hours: 2, prixMateriel: 80 },
    { label: 'Nettoyage fin de chantier', description: 'Nettoyage complet après travaux', category: 'Divers', hours: 3 },
    { label: 'Protection chantier', description: 'Bâchage et protection des existants', category: 'Divers', hours: 1, prixMateriel: 15 },
  ],
};

/**
 * Renvoie les prestations par défaut pour un métier donné.
 * "multi-services" et "autre" renvoient toutes les prestations de tous les métiers.
 */
export function getDefaultPrestations(metier: string): PrestationDefault[] {
  if (metier === 'multi-services' || metier === 'autre') {
    // Merge all, deduplicate by label
    const seen = new Set<string>();
    const all: PrestationDefault[] = [];
    for (const prestations of Object.values(PRESTATIONS_BY_METIER)) {
      for (const p of prestations) {
        if (!seen.has(p.label)) {
          seen.add(p.label);
          all.push(p);
        }
      }
    }
    return all;
  }
  return PRESTATIONS_BY_METIER[metier] || PRESTATIONS_BY_METIER['plombier'];
}

/**
 * Renvoie la liste des métiers disponibles dans le catalogue.
 */
export function getAvailableMetiers(): string[] {
  return Object.keys(PRESTATIONS_BY_METIER);
}

/**
 * Formate des prestations (depuis la DB) en texte pour le prompt IA.
 */
export function formatPrestationsForPrompt(
  prestations: { label: string; category: string; hours: number; prixMateriel?: number }[],
  tauxHoraire: number,
): string {
  const byCategory: Record<string, typeof prestations> = {};
  for (const p of prestations) {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }

  let text = '';
  for (const [category, items] of Object.entries(byCategory)) {
    text += `\n  [${category}]\n`;
    for (const p of items) {
      const mo = Math.round(p.hours * tauxHoraire * 100) / 100;
      const mat = p.prixMateriel || 0;
      const total = mo + mat;
      text += `    - "${p.label}" → MO: ${p.hours}h × ${tauxHoraire}€ = ${mo}€${mat > 0 ? ` + Matériel: ${mat}€` : ''} = ${total}€\n`;
    }
  }
  return text;
}
