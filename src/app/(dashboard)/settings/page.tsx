'use client';

import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Building2, Upload, X, Palette, Bell, Euro, FileSignature, Scale, Shield, FileText, CreditCard } from 'lucide-react';
import { Button, Input, Card, PageLoader } from '@/components/ui';
import { apiFetch } from '@/lib/utils';

interface CompanyForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  siret: string;
  logoUrl: string;
  primaryColor: string;
  tauxHoraire: number;
  metier: string;
  relancesActive: boolean;
  relancesJours: number[];
  devisRelancesActive: boolean;
  devisRelancesJours: number[];
  // Legal / fiscal
  tvaIntra: string;
  formeJuridique: string;
  capitalSocial: string;
  codeAPE: string;
  rcs: string;
  regimeTVA: string;
  // Assurance decennale
  assuranceDecennaleNom: string;
  assuranceDecennaleNumero: string;
  assuranceDecennaleZone: string;
  // Coordonnees bancaires
  iban: string;
  bic: string;
  nomBanque: string;
  // Default conditions
  conditionsGeneralesDevis: string;
  delaiPaiementJours: number;
  dureeValiditeDevis: number;
}

const PRESET_COLORS = [
  { value: '#1b40f5', label: 'Bleu' },
  { value: '#18181b', label: 'Noir' },
  { value: '#0f766e', label: 'Vert' },
  { value: '#1e3a5f', label: 'Marine' },
  { value: '#9a3412', label: 'Brique' },
  { value: '#475569', label: 'Ardoise' },
];

const METIERS = [
  { value: 'plombier', label: 'Plombier' },
  { value: 'electricien', label: 'Électricien' },
  { value: 'chauffagiste', label: 'Chauffagiste' },
  { value: 'climatisation', label: 'Climatisation' },
  { value: 'carreleur', label: 'Carreleur' },
  { value: 'peintre', label: 'Peintre' },
  { value: 'menuisier', label: 'Menuisier' },
  { value: 'maçon', label: 'Maçon' },
  { value: 'multi-services', label: 'Multi-services' },
  { value: 'autre', label: 'Autre' },
];

const MAX_LOGO_SIZE = 500 * 1024;

function validateSiret(siret: string): boolean {
  const digits = siret.replace(/\s/g, '');
  if (!/^\d{14}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = parseInt(digits[i], 10);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyForm>({
    name: '', email: '', phone: '', address: '', city: '', postalCode: '', siret: '',
    logoUrl: '', primaryColor: '#1b40f5', tauxHoraire: 45, metier: 'multi-services',
    relancesActive: true, relancesJours: [7, 14, 30],
    devisRelancesActive: true, devisRelancesJours: [3, 7, 14],
    tvaIntra: '', formeJuridique: '', capitalSocial: '', codeAPE: '', rcs: '',
    regimeTVA: 'assujetti',
    assuranceDecennaleNom: '', assuranceDecennaleNumero: '', assuranceDecennaleZone: '',
    iban: '', bic: '', nomBanque: '',
    conditionsGeneralesDevis: '', delaiPaiementJours: 30, dureeValiditeDevis: 30,
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<{ data: CompanyForm }>('/api/company')
      .then((r) => {
        const c = r.data;
        setForm({
          name: c.name || '', email: c.email || '', phone: c.phone || '',
          address: c.address || '', city: c.city || '', postalCode: c.postalCode || '',
          siret: c.siret || '', logoUrl: c.logoUrl || '',
          primaryColor: c.primaryColor || '#1b40f5',
          tauxHoraire: (c as any).tauxHoraire ?? 45,
          metier: (c as any).metier || 'multi-services',
          relancesActive: (c as any).relancesActive ?? true,
          relancesJours: (c as any).relancesJours || [7, 14, 30],
          devisRelancesActive: (c as any).devisRelancesActive ?? true,
          devisRelancesJours: (c as any).devisRelancesJours || [3, 7, 14],
          tvaIntra: (c as any).tvaIntra || '',
          formeJuridique: (c as any).formeJuridique || '',
          capitalSocial: (c as any).capitalSocial || '',
          codeAPE: (c as any).codeAPE || '',
          rcs: (c as any).rcs || '',
          regimeTVA: (c as any).regimeTVA || 'assujetti',
          assuranceDecennaleNom: (c as any).assuranceDecennaleNom || '',
          assuranceDecennaleNumero: (c as any).assuranceDecennaleNumero || '',
          assuranceDecennaleZone: (c as any).assuranceDecennaleZone || '',
          iban: (c as any).iban || '',
          bic: (c as any).bic || '',
          nomBanque: (c as any).nomBanque || '',
          conditionsGeneralesDevis: (c as any).conditionsGeneralesDevis || '',
          delaiPaiementJours: (c as any).delaiPaiementJours ?? 30,
          dureeValiditeDevis: (c as any).dureeValiditeDevis ?? 30,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof CompanyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── Logo handling ── */
  const handleLogoFile = (file: File) => {
    if (!file.type.match(/^image\/(png|jpe?g|svg\+xml)$/)) { toast.error('Format accepté : PNG, JPG ou SVG'); return; }
    if (file.size > MAX_LOGO_SIZE) { toast.error('Le logo ne doit pas dépasser 500 Ko'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleLogoFile(file); e.target.value = ''; };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleLogoFile(file); };
  const removeLogo = () => setForm((f) => ({ ...f, logoUrl: '' }));

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast.error('Nom et email requis'); return; }
    setSaving(true);
    try {
      await apiFetch('/api/company', { method: 'PUT', body: JSON.stringify(form) });
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Informations de votre entreprise</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Company info ── */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Entreprise</h2>
              <p className="text-xs text-zinc-400">Ces informations apparaissent sur vos fiches PDF</p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nom de l'entreprise" name="name" value={form.name} onChange={set('name')} required />
              <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} required placeholder="contact@entreprise.fr" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Téléphone" name="phone" value={form.phone} onChange={set('phone')} placeholder="06 12 34 56 78" />
              <div>
                <Input label="SIRET" name="siret" value={form.siret} onChange={set('siret')} placeholder="123 456 789 00012" />
                {form.siret && !validateSiret(form.siret) && (
                  <p className="text-xs text-red-500 mt-1">SIRET invalide (14 chiffres, verification Luhn)</p>
                )}
              </div>
            </div>
            <Input label="Adresse" name="address" value={form.address} onChange={set('address')} placeholder="12 rue des Artisans" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Code postal" name="postalCode" value={form.postalCode} onChange={set('postalCode')} />
              <Input label="Ville" name="city" value={form.city} onChange={set('city')} />
            </div>
          </div>
        </Card>

        {/* ── Branding ── */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Palette className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Personnalisation</h2>
              <p className="text-xs text-zinc-400">Logo et couleur utilisés sur vos documents PDF</p>
            </div>
          </div>

          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="label-field">Logo de l&apos;entreprise</label>
              <p className="text-xs text-zinc-400 mb-3">PNG, JPG ou SVG · 500 Ko max</p>
              {form.logoUrl ? (
                <div className="flex items-center gap-4">
                  <div className="w-36 h-20 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center p-2">
                    <img src={form.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="space-y-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">Remplacer</button>
                    <button type="button" onClick={removeLogo} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"><X className="w-3 h-3" /> Supprimer</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => fileRef.current?.click()} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
                  className="w-full max-w-sm border-2 border-dashed border-zinc-200 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                  <Upload className="w-5 h-5 text-zinc-400" />
                  <span className="text-sm text-zinc-500">Cliquer ou glisser-déposer</span>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={onFileChange} className="hidden" />
            </div>

            <div>
              <label className="label-field">Couleur principale</label>
              <p className="text-xs text-zinc-400 mb-3">Utilisée pour les titres et accents de vos PDF</p>
              <div className="flex items-center gap-4">
                <input type="color" value={form.primaryColor} onChange={set('primaryColor')} className="w-10 h-10 rounded-xl border border-zinc-200 cursor-pointer appearance-none bg-transparent p-0.5" />
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c.value} type="button" title={c.label} onClick={() => setForm((f) => ({ ...f, primaryColor: c.value }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${form.primaryColor === c.value ? 'border-zinc-900 scale-110' : 'border-zinc-200 hover:border-zinc-400'}`}
                      style={{ backgroundColor: c.value }} />
                  ))}
                </div>
                <span className="text-xs font-mono text-zinc-400">{form.primaryColor}</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Aperçu</p>
              <div className="flex items-center gap-3">
                {form.logoUrl && <img src={form.logoUrl} alt="" className="h-8 object-contain" />}
                <span className="text-base font-bold" style={{ color: form.primaryColor }}>{form.name || "Nom de l'entreprise"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Tarifs, Métier & Relances ── */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Euro className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Tarifs & Relances</h2>
              <p className="text-xs text-zinc-400">Taux horaire, métier et relances automatiques</p>
            </div>
          </div>

          <div className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Taux horaire (€/h)" name="tauxHoraire" type="number" min="0"
                value={form.tauxHoraire} onChange={(e) => setForm((f) => ({ ...f, tauxHoraire: Number(e.target.value) }))} placeholder="45" />
              <div>
                <label className="label-field">Corps de métier</label>
                <select value={form.metier} onChange={(e) => setForm(f => ({ ...f, metier: e.target.value }))} className="input-field w-full">
                  {METIERS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
                <p className="text-xs text-zinc-400 mt-1">Détermine les prestations par défaut pour l&apos;IA</p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <Bell className="w-4 h-4 text-zinc-500" />
                <label className="text-sm font-medium text-zinc-900">Relances automatiques</label>
              </div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input type="checkbox" checked={form.relancesActive} onChange={(e) => setForm((f) => ({ ...f, relancesActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-zinc-600">Activer les relances pour les factures en retard</span>
              </label>
              {form.relancesActive && (
                <div className="grid grid-cols-3 gap-4">
                  {['1ère relance', '2ème relance', '3ème relance'].map((label, i) => (
                    <div key={i}>
                      <label className="label-field">{label}</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={form.relancesJours[i] || ''}
                          onChange={(e) => { const nj = [...form.relancesJours]; nj[i] = Number(e.target.value) || 7; setForm((f) => ({ ...f, relancesJours: nj })); }}
                          className="input-field text-sm w-20 text-center" />
                        <span className="text-xs text-zinc-400">jours</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-6">
              <div className="flex items-center gap-3 mb-3">
                <FileSignature className="w-4 h-4 text-zinc-500" />
                <label className="text-sm font-medium text-zinc-900">Relances devis</label>
              </div>
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input type="checkbox" checked={form.devisRelancesActive} onChange={(e) => setForm((f) => ({ ...f, devisRelancesActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-zinc-600">Activer les relances pour les devis envoyés sans réponse</span>
              </label>
              {form.devisRelancesActive && (
                <div className="grid grid-cols-3 gap-4">
                  {['1ère relance', '2ème relance', '3ème relance'].map((label, i) => (
                    <div key={i}>
                      <label className="label-field">{label}</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" value={form.devisRelancesJours[i] || ''}
                          onChange={(e) => { const nj = [...form.devisRelancesJours]; nj[i] = Number(e.target.value) || 3; setForm((f) => ({ ...f, devisRelancesJours: nj })); }}
                          className="input-field text-sm w-20 text-center" />
                        <span className="text-xs text-zinc-400">jours</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Legal / fiscal ── */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Scale className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Informations legales</h2>
              <p className="text-xs text-zinc-400">Mentions obligatoires sur vos devis et factures</p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Forme juridique</label>
                <select value={form.formeJuridique} onChange={(e) => setForm(f => ({ ...f, formeJuridique: e.target.value }))} className="input-field w-full">
                  <option value="">Non renseigne</option>
                  <option value="EI">Entreprise individuelle (EI)</option>
                  <option value="EIRL">EIRL</option>
                  <option value="Auto-entrepreneur">Auto-entrepreneur / Micro-entreprise</option>
                  <option value="EURL">EURL</option>
                  <option value="SARL">SARL</option>
                  <option value="SAS">SAS</option>
                  <option value="SASU">SASU</option>
                  <option value="SA">SA</option>
                  <option value="SNC">SNC</option>
                </select>
              </div>
              <Input label="Capital social" name="capitalSocial" value={form.capitalSocial} onChange={set('capitalSocial')} placeholder="10 000 EUR" />
            </div>
            <div>
              <label className="label-field">Regime de TVA</label>
              <select value={form.regimeTVA} onChange={(e) => setForm(f => ({ ...f, regimeTVA: e.target.value }))} className="input-field w-full max-w-md">
                <option value="assujetti">Assujetti a la TVA</option>
                <option value="franchise">Franchise en base de TVA (micro-entreprise)</option>
              </select>
              {form.regimeTVA === 'franchise' && (
                <p className="text-xs text-amber-600 mt-1">La mention &quot;TVA non applicable, art. 293 B du CGI&quot; sera ajoutee sur vos devis et factures. La ligne TVA ne sera pas affichee.</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="N&deg; TVA intracommunautaire" name="tvaIntra" value={form.tvaIntra} onChange={set('tvaIntra')} placeholder="FR 12 345678901" />
              <Input label="Code APE / NAF" name="codeAPE" value={form.codeAPE} onChange={set('codeAPE')} placeholder="4322A" />
            </div>
            <Input label="RCS / RM (Registre)" name="rcs" value={form.rcs} onChange={set('rcs')} placeholder="RCS Paris 123 456 789 / RM 75" />
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700">Ces informations sont obligatoires sur les devis et factures en France. Renseignez-les pour etre en conformite legale.</p>
            </div>
          </div>
        </Card>

        {/* ── Assurance decennale ── */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Assurance decennale</h2>
              <p className="text-xs text-zinc-400">Obligatoire pour les artisans du batiment — affichee sur vos devis et factures</p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <Input label="Nom de l&apos;assureur" name="assuranceDecennaleNom" value={form.assuranceDecennaleNom} onChange={set('assuranceDecennaleNom')} placeholder="AXA, MAAF, Allianz..." />
            <Input label="N&deg; de contrat / police" name="assuranceDecennaleNumero" value={form.assuranceDecennaleNumero} onChange={set('assuranceDecennaleNumero')} placeholder="POL-2024-123456" />
            <Input label="Zone de couverture geographique" name="assuranceDecennaleZone" value={form.assuranceDecennaleZone} onChange={set('assuranceDecennaleZone')} placeholder="France metropolitaine" />
          </div>
        </Card>

        {/* ── Coordonnees bancaires ── */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Coordonnees bancaires</h2>
              <p className="text-xs text-zinc-400">Affichees sur vos factures pour faciliter le paiement par virement</p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <Input label="IBAN" name="iban" value={form.iban} onChange={set('iban')} placeholder="FR76 1234 5678 9012 3456 7890 123" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="BIC / SWIFT" name="bic" value={form.bic} onChange={set('bic')} placeholder="BNPAFRPP" />
              <Input label="Nom de la banque (optionnel)" name="nomBanque" value={form.nomBanque} onChange={set('nomBanque')} placeholder="BNP Paribas" />
            </div>
          </div>
        </Card>

        {/* ── Default conditions ── */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Conditions par defaut</h2>
              <p className="text-xs text-zinc-400">Appliquees automatiquement a vos nouveaux devis et factures</p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Delai de paiement par defaut</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={form.delaiPaiementJours}
                    onChange={(e) => setForm(f => ({ ...f, delaiPaiementJours: Number(e.target.value) || 30 }))}
                    className="input-field text-sm w-24 text-center" />
                  <span className="text-sm text-zinc-500">jours</span>
                </div>
              </div>
              <div>
                <label className="label-field">Duree de validite des devis</label>
                <select value={form.dureeValiditeDevis} onChange={(e) => setForm(f => ({ ...f, dureeValiditeDevis: Number(e.target.value) }))} className="input-field w-full">
                  <option value={14}>14 jours</option>
                  <option value={30}>1 mois (30 jours)</option>
                  <option value={60}>2 mois (60 jours)</option>
                  <option value={90}>3 mois (90 jours)</option>
                </select>
                <p className="text-xs text-zinc-400 mt-1">Appliquee automatiquement aux nouveaux devis</p>
              </div>
            </div>
            <div>
              <label className="label-field">Conditions generales (devis)</label>
              <textarea
                value={form.conditionsGeneralesDevis}
                onChange={(e) => setForm(f => ({ ...f, conditionsGeneralesDevis: e.target.value }))}
                rows={4}
                className="input-field w-full resize-y"
                placeholder="Ex: Devis valable 3 mois. Acompte de 30% a la commande. Solde a la reception des travaux."
              />
              <p className="text-xs text-zinc-400 mt-1">Ce texte sera ajoute en bas de chaque devis genere</p>
            </div>
          </div>
        </Card>

        <div>
          <Button type="submit" loading={saving}>Enregistrer les paramètres</Button>
        </div>
      </form>
    </div>
  );
}
