'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2, Wrench, Sparkles, Paperclip, X, FileText, Image, MapPin, User, Phone, Mail, ChevronDown, ChevronUp, Loader2, Package, Clock, Camera } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { apiFetch, formatCurrency, calculateTTC } from '@/lib/utils';
import { PrestationPicker } from '@/components/forms/prestation-picker';
import { ArticlePicker } from '@/components/forms/article-picker';
import type { Client, Devis, DevisItem } from '@/types';

interface DevisFormProps {
  devis?: Devis & { items: DevisItem[] };
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  type: 'prestation' | 'main_oeuvre' | 'materiel';
  prixAchat?: number | null;
  coefMarge?: number | null;
}

const LINE_TYPES = [
  { value: 'prestation', label: 'Prestation', color: 'bg-brand-100 text-brand-700', icon: Wrench },
  { value: 'main_oeuvre', label: 'Main d\'oeuvre', color: 'bg-blue-100 text-blue-700', icon: Clock },
  { value: 'materiel', label: 'Matériel', color: 'bg-amber-100 text-amber-700', icon: Package },
] as const;

interface PieceJointe {
  id?: string;
  nom: string;
  type: string;
  data?: string;
  taille: number;
}

export function DevisForm({ devis }: DevisFormProps) {
  const router = useRouter();
  const isEditing = !!devis;
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showChantierAddress, setShowChantierAddress] = useState(false);
  const [showPrestations, setShowPrestations] = useState(false);
  const [showArticles, setShowArticles] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiPhotoModal, setShowAiPhotoModal] = useState(false);
  const [aiPhotoLoading, setAiPhotoLoading] = useState(false);
  const [aiPhotoDescription, setAiPhotoDescription] = useState('');
  const [aiPhotos, setAiPhotos] = useState<string[]>([]);
  const [pieces, setPieces] = useState<PieceJointe[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiPhotoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: devis?.title || '',
    description: devis?.description || '',
    date: devis?.date ? new Date(devis.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    dateExpiration: devis?.dateExpiration ? new Date(devis.dateExpiration).toISOString().split('T')[0] : '',
    clientId: devis?.clientId || '',
    status: devis?.status || 'BROUILLON',
    tvaRate: devis?.tvaRate ?? 20,
    notes: devis?.notes || '',
    conditionsParticulieres: devis?.conditionsParticulieres || '',
    adresseChantier: (devis as any)?.adresseChantier || '',
    villeChantier: (devis as any)?.villeChantier || '',
    cpChantier: (devis as any)?.cpChantier || '',
    conditionsPaiement: (devis as any)?.conditionsPaiement || '',
    acomptePercent: (devis as any)?.acomptePercent ?? null as number | null,
    delaiTravaux: (devis as any)?.delaiTravaux || '',
  });

  const [items, setItems] = useState<LineItem[]>(
    devis?.items?.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      type: ((it as any).type || 'prestation') as LineItem['type'],
      prixAchat: (it as any).prixAchat ?? null,
      coefMarge: (it as any).coefMarge ?? null,
    })) || [{ description: '', quantity: 1, unitPrice: 0, type: 'prestation' }]
  );

  useEffect(() => {
    apiFetch<{ data: Client[] }>('/api/clients').then((r) => {
      setClients(r.data);
      if (devis?.clientId) {
        const c = r.data.find((cl) => cl.id === devis.clientId);
        if (c) setSelectedClient(c);
      }
    }).catch(() => {});
  }, [devis?.clientId]);

  // Load existing attachments when editing
  useEffect(() => {
    if (devis?.id) {
      apiFetch<{ data: PieceJointe[] }>(`/api/devis/${devis.id}/pieces-jointes`).then((r) => {
        setPieces(r.data || []);
      }).catch(() => {});
    }
  }, [devis?.id]);

  // Init chantier address visibility
  useEffect(() => {
    if (form.adresseChantier || form.villeChantier || form.cpChantier) {
      setShowChantierAddress(true);
    }
  }, []);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setForm((f) => ({ ...f, clientId: id }));
    const c = clients.find((cl) => cl.id === id) || null;
    setSelectedClient(c);
  };

  const addItem = (type: LineItem['type'] = 'prestation') => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, type, prixAchat: null, coefMarge: type === 'materiel' ? 1.5 : null }]);

  const removeItem = (i: number) => {
    if (items.length > 1) setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, field: keyof LineItem, value: string | number | null) => {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      // Auto-calculate resale price when prixAchat or coefMarge changes on material items
      if (updated.type === 'materiel' && updated.prixAchat != null && updated.coefMarge != null) {
        if (field === 'prixAchat' || field === 'coefMarge') {
          updated.unitPrice = Math.round(updated.prixAchat * updated.coefMarge * 100) / 100;
        }
      }
      // When switching to materiel type, set default coefficient
      if (field === 'type' && value === 'materiel' && !updated.coefMarge) {
        updated.coefMarge = 1.5;
      }
      // Clear margin fields when switching away from materiel
      if (field === 'type' && value !== 'materiel') {
        updated.prixAchat = null;
        updated.coefMarge = null;
      }
      return updated;
    }));
  };

  const totalHT = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const totalTTC = calculateTTC(totalHT, form.tvaRate);
  const montantAcompte = form.acomptePercent ? Math.round(totalTTC * form.acomptePercent) / 100 : 0;

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} est trop volumineux (max 2 Mo)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const type = file.type.startsWith('image/') ? 'photo' : file.name.endsWith('.pdf') ? 'document' : 'plan';
        setPieces((prev) => [...prev, { nom: file.name, type, data: base64, taille: file.size }]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePiece = async (index: number) => {
    const piece = pieces[index];
    if (piece.id && devis?.id) {
      try {
        await apiFetch(`/api/devis/${devis.id}/pieces-jointes?pieceId=${piece.id}`, { method: 'DELETE' });
      } catch { /* ignore */ }
    }
    setPieces((prev) => prev.filter((_, i) => i !== index));
  };

  // AI generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error('Décrivez les travaux'); return; }
    setAiLoading(true);
    try {
      const res = await apiFetch<{ data: { title: string; description: string; items: LineItem[]; conditionsPaiement: string; delaiTravaux: string } }>('/api/devis/generate-ai', {
        method: 'POST',
        body: JSON.stringify({ description: aiPrompt }),
      });
      const { data } = res;
      setItems(data.items.map((it: any) => ({ ...it, type: it.type || 'prestation' })));
      if (data.title && !form.title) setForm((f) => ({ ...f, title: data.title }));
      if (data.description && !form.description) setForm((f) => ({ ...f, description: data.description }));
      if (data.conditionsPaiement && !form.conditionsPaiement) setForm((f) => ({ ...f, conditionsPaiement: data.conditionsPaiement }));
      if (data.delaiTravaux && !form.delaiTravaux) setForm((f) => ({ ...f, delaiTravaux: data.delaiTravaux }));
      toast.success(`${data.items.length} lignes générées par l'IA`);
      setShowAiModal(false);
      setAiPrompt('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur IA');
    } finally {
      setAiLoading(false);
    }
  };

  // AI photo generation
  const handleAiPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 5 - aiPhotos.length;
    const toProcess = Array.from(files).slice(0, remaining);

    toProcess.forEach((file) => {
      if (file.size > 4 * 1024 * 1024) {
        toast.error(`${file.name} est trop volumineux (max 4 Mo)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAiPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleAiPhotoGenerate = async () => {
    if (aiPhotos.length === 0) { toast.error('Ajoutez au moins une photo'); return; }
    setAiPhotoLoading(true);
    try {
      const res = await apiFetch<{ data: { title: string; description: string; items: LineItem[]; conditionsPaiement: string; delaiTravaux: string } }>('/api/devis/generate-ai-photos', {
        method: 'POST',
        body: JSON.stringify({ description: aiPhotoDescription, photos: aiPhotos }),
      });
      const { data } = res;
      setItems(data.items.map((it: any) => ({ ...it, type: it.type || 'prestation' })));
      if (data.title && !form.title) setForm((f) => ({ ...f, title: data.title }));
      if (data.description && !form.description) setForm((f) => ({ ...f, description: data.description }));
      if (data.conditionsPaiement && !form.conditionsPaiement) setForm((f) => ({ ...f, conditionsPaiement: data.conditionsPaiement }));
      if (data.delaiTravaux && !form.delaiTravaux) setForm((f) => ({ ...f, delaiTravaux: data.delaiTravaux }));
      toast.success(`${data.items.length} lignes générées à partir des photos`);
      setShowAiPhotoModal(false);
      setAiPhotos([]);
      setAiPhotoDescription('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur IA');
    } finally {
      setAiPhotoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { toast.error('Sélectionnez un client'); return; }
    if (items.some((it) => !it.description)) { toast.error('Renseignez toutes les descriptions'); return; }
    if (items.some((it) => it.unitPrice < 0 || it.quantity < 0)) { toast.error('Les prix et quantités doivent être positifs'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        tvaRate: Number(form.tvaRate),
        dateExpiration: form.dateExpiration || null,
        acomptePercent: form.acomptePercent ? Number(form.acomptePercent) : null,
        items: items.map((it) => ({ ...it, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
      };

      let devisId: string;

      if (isEditing) {
        await apiFetch<{ data: { id: string } }>(`/api/devis/${devis.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        devisId = devis.id;
        toast.success('Devis modifié');
      } else {
        const res = await apiFetch<{ data: { id: string } }>('/api/devis', { method: 'POST', body: JSON.stringify(payload) });
        devisId = res.data.id;
        toast.success('Devis créé');
      }

      // Upload new attachments (ones without id)
      const newPieces = pieces.filter((p) => !p.id && p.data);
      for (const piece of newPieces) {
        try {
          await apiFetch(`/api/devis/${devisId}/pieces-jointes`, {
            method: 'POST',
            body: JSON.stringify({ nom: piece.nom, type: piece.type, data: piece.data }),
          });
        } catch { /* ignore individual upload errors */ }
      }

      router.push('/devis');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* AI row */}
      {!isEditing && (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="brand" onClick={() => setShowAiModal(true)} className="text-sm">
            <Sparkles className="w-4 h-4" /> Créer devis avec IA
          </Button>
          <Button type="button" variant="brand" onClick={() => setShowAiPhotoModal(true)} className="text-sm">
            <Camera className="w-4 h-4" /> Créer devis avec photos
          </Button>
        </div>
      )}

      {/* General info */}
      <div className="space-y-4">
        <Input label="Titre du devis" name="title" value={form.title} onChange={set('title')} required placeholder="Ex: Rénovation salle de bain" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Client"
            name="clientId"
            value={form.clientId}
            onChange={handleClientChange}
            placeholder="Sélectionner un client"
            options={clients.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))}
          />
          <Select
            label="Statut"
            name="status"
            value={form.status}
            onChange={set('status')}
            options={[
              { value: 'BROUILLON', label: 'Brouillon' },
              { value: 'ENVOYE', label: 'Envoyé' },
              { value: 'ACCEPTE', label: 'Accepté' },
              { value: 'REFUSE', label: 'Refusé' },
            ]}
          />
        </div>

        {/* Client info card */}
        {selectedClient && (
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Informations client</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-zinc-700">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium">{selectedClient.firstName} {selectedClient.lastName}</span>
              </div>
              {selectedClient.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{selectedClient.address}{selectedClient.postalCode || selectedClient.city ? `, ${selectedClient.postalCode || ''} ${selectedClient.city || ''}` : ''}</span>
                </div>
              )}
              {selectedClient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{selectedClient.phone}</span>
                </div>
              )}
              {selectedClient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{selectedClient.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Date" name="date" type="date" value={form.date} onChange={set('date')} required />
          <Input label="Date d'expiration" name="dateExpiration" type="date" value={form.dateExpiration} onChange={set('dateExpiration')} />
          <Input label="Taux TVA (%)" name="tvaRate" type="number" value={form.tvaRate} onChange={(e) => setForm((f) => ({ ...f, tvaRate: Number(e.target.value) }))} />
        </div>
        <Textarea label="Description" name="description" value={form.description} onChange={set('description')} placeholder="Détails du devis..." />
      </div>

      {/* Adresse chantier */}
      <div>
        <button
          type="button"
          onClick={() => setShowChantierAddress(!showChantierAddress)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          Adresse du chantier (si différente du client)
          {showChantierAddress ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showChantierAddress && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <Input label="Adresse du chantier" name="adresseChantier" value={form.adresseChantier} onChange={set('adresseChantier')} placeholder="Adresse du lieu d'intervention" />
            </div>
            <Input label="Code postal" name="cpChantier" value={form.cpChantier} onChange={set('cpChantier')} placeholder="75001" />
            <div className="sm:col-span-2">
              <Input label="Ville" name="villeChantier" value={form.villeChantier} onChange={set('villeChantier')} placeholder="Paris" />
            </div>
          </div>
        )}
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Lignes de détail</h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="brand" onClick={() => setShowPrestations(true)} className="text-xs !px-3 !py-1.5">
              <Wrench className="w-3.5 h-3.5" /> Prestation
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowArticles(true)} className="text-xs !px-3 !py-1.5">
              <Package className="w-3.5 h-3.5" /> Matériel
            </Button>
            <Button type="button" variant="secondary" onClick={() => addItem('main_oeuvre')} className="text-xs !px-3 !py-1.5">
              <Clock className="w-3.5 h-3.5" /> Main d'oeuvre
            </Button>
            <Button type="button" variant="secondary" onClick={() => addItem('prestation')} className="text-xs !px-3 !py-1.5">
              <Plus className="w-3.5 h-3.5" /> Ligne libre
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => {
            const lt = LINE_TYPES.find((t) => t.value === item.type) || LINE_TYPES[0];
            const TypeIcon = lt.icon;
            const isMateriel = item.type === 'materiel';
            const hasMargin = isMateriel && item.prixAchat != null && item.prixAchat > 0;
            const marginPercent = hasMargin && item.coefMarge ? Math.round((item.coefMarge - 1) * 100) : 0;
            return (
              <div key={i} className="p-4 bg-zinc-50/80 rounded-xl border border-zinc-100 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex items-center gap-2 sm:block">
                    <select
                      value={item.type}
                      onChange={(e) => updateItem(i, 'type', e.target.value)}
                      className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer ${lt.color}`}
                    >
                      {LINE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeItem(i)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors sm:hidden ml-auto">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-xs text-zinc-400 mb-1 block sm:hidden">Description</label>
                    <input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(i, 'description', e.target.value)}
                      className="input-field text-sm relative z-10"
                    />
                  </div>
                  <div className="grid grid-cols-3 sm:flex gap-3 sm:gap-3 items-end">
                    <div className="sm:w-20">
                      <label className="text-xs text-zinc-400 mb-1 block sm:hidden">Quantité</label>
                      <input
                        type="number"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="input-field text-sm text-center"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="sm:w-28">
                      <label className="text-xs text-zinc-400 mb-1 block sm:hidden">{isMateriel ? 'Prix revente' : 'Prix unit.'}</label>
                      <input
                        type="number"
                        placeholder={isMateriel ? 'Prix revente' : 'Prix unit.'}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="input-field text-sm text-right"
                        min="0"
                        step="0.01"
                        readOnly={isMateriel && item.prixAchat != null && item.prixAchat > 0}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <div className="py-2.5 text-sm font-medium text-zinc-700 text-right whitespace-nowrap">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>
                      <button type="button" onClick={() => removeItem(i)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors hidden sm:block">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Material margin fields */}
                {isMateriel && (
                  <div className="flex flex-wrap items-center gap-3 sm:ml-[72px]">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-zinc-400 whitespace-nowrap">Achat HT</label>
                      <input
                        type="number"
                        placeholder="Prix achat"
                        value={item.prixAchat ?? ''}
                        onChange={(e) => updateItem(i, 'prixAchat', e.target.value ? Number(e.target.value) : null)}
                        onFocus={(e) => e.target.select()}
                        className="input-field text-xs text-right w-24"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-zinc-400 whitespace-nowrap">Coef.</label>
                      <input
                        type="number"
                        placeholder="1.5"
                        value={item.coefMarge ?? ''}
                        onChange={(e) => updateItem(i, 'coefMarge', e.target.value ? Number(e.target.value) : null)}
                        onFocus={(e) => e.target.select()}
                        className="input-field text-xs text-center w-16"
                        min="1"
                        step="0.1"
                      />
                    </div>
                    {hasMargin && (
                      <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        +{marginPercent}% marge
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1.5 text-sm">
            {(() => {
              const moTotal = items.filter((it) => it.type === 'main_oeuvre').reduce((s, it) => s + it.quantity * it.unitPrice, 0);
              const matTotal = items.filter((it) => it.type === 'materiel').reduce((s, it) => s + it.quantity * it.unitPrice, 0);
              const presTotal = items.filter((it) => it.type === 'prestation').reduce((s, it) => s + it.quantity * it.unitPrice, 0);
              const hasMultipleTypes = [moTotal, matTotal, presTotal].filter((t) => t > 0).length > 1;
              if (!hasMultipleTypes) return null;
              return (
                <>
                  {presTotal > 0 && <div className="flex justify-between text-zinc-400"><span>Prestations</span><span>{formatCurrency(presTotal)}</span></div>}
                  {moTotal > 0 && <div className="flex justify-between text-zinc-400"><span>Main d'oeuvre</span><span>{formatCurrency(moTotal)}</span></div>}
                  {matTotal > 0 && <div className="flex justify-between text-zinc-400"><span>Matériel</span><span>{formatCurrency(matTotal)}</span></div>}
                  <div className="border-t border-zinc-100 pt-1.5" />
                </>
              );
            })()}
            <div className="flex justify-between text-zinc-500">
              <span>Total HT</span>
              <span className="font-medium">{formatCurrency(totalHT)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>TVA ({form.tvaRate}%)</span>
              <span className="font-medium">{formatCurrency(totalTTC - totalHT)}</span>
            </div>
            <div className="flex justify-between text-zinc-900 font-bold text-base pt-1.5 border-t border-zinc-200">
              <span>Total TTC</span>
              <span>{formatCurrency(totalTTC)}</span>
            </div>
            {form.acomptePercent != null && form.acomptePercent > 0 && (
              <>
                <div className="flex justify-between text-amber-600 pt-1">
                  <span>Acompte ({form.acomptePercent}%)</span>
                  <span className="font-semibold">{formatCurrency(montantAcompte)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Solde restant</span>
                  <span className="font-medium">{formatCurrency(totalTTC - montantAcompte)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Conditions de paiement & délai */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900">Conditions & délais</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Conditions de paiement"
            name="conditionsPaiement"
            value={form.conditionsPaiement}
            onChange={set('conditionsPaiement')}
            placeholder="Ex: 30% acompte, solde fin de chantier"
          />
          <Input
            label="Délai estimé des travaux"
            name="delaiTravaux"
            value={form.delaiTravaux}
            onChange={set('delaiTravaux')}
            placeholder="Ex: 2 semaines"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Acompte (%)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={form.acomptePercent ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, acomptePercent: e.target.value ? Number(e.target.value) : null }))}
              className="input-field text-sm w-24"
              min="0"
              max="100"
              step="5"
              placeholder="0"
            />
            {form.acomptePercent != null && form.acomptePercent > 0 && totalTTC > 0 && (
              <span className="text-sm text-amber-600 font-medium">
                = {formatCurrency(montantAcompte)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pièces jointes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Pièces jointes</h3>
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs !px-3 !py-1.5"
          >
            <Paperclip className="w-3.5 h-3.5" /> Ajouter fichier
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {pieces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pieces.map((piece, i) => (
              <div key={piece.id || i} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center flex-shrink-0">
                  {piece.type === 'photo' ? <Image className="w-4 h-4 text-zinc-500" /> : <FileText className="w-4 h-4 text-zinc-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-700 truncate">{piece.nom}</p>
                  <p className="text-xs text-zinc-400">{Math.round(piece.taille / 1024)} Ko</p>
                </div>
                <button type="button" onClick={() => removePiece(i)} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Aucune pièce jointe (photos, plans, documents)</p>
        )}
      </div>

      <Textarea label="Notes internes" name="notes" value={form.notes} onChange={set('notes')} placeholder="Remarques, rappels..." />
      <Textarea label="Conditions particulières" name="conditionsParticulieres" value={form.conditionsParticulieres} onChange={set('conditionsParticulieres')} placeholder="Conditions spécifiques au devis..." />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>{isEditing ? 'Enregistrer' : 'Créer le devis'}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Annuler</Button>
      </div>

      {/* Prestation picker modal */}
      {showPrestations && (
        <PrestationPicker
          onSelect={(newItems) => {
            setItems((prev) => {
              const cleaned = prev.length === 1 && !prev[0].description && prev[0].unitPrice === 0
                ? []
                : prev;
              return [...cleaned, ...newItems.map((it) => ({ ...it, type: 'prestation' as const }))];
            });
          }}
          onClose={() => setShowPrestations(false)}
        />
      )}

      {/* Article picker modal */}
      {showArticles && (
        <ArticlePicker
          onSelect={(newItems) => {
            setItems((prev) => {
              const cleaned = prev.length === 1 && !prev[0].description && prev[0].unitPrice === 0
                ? []
                : prev;
              return [...cleaned, ...newItems.map((it) => ({ ...it, type: it.type as LineItem['type'] }))];
            });
          }}
          onClose={() => setShowArticles(false)}
        />
      )}

      {/* AI Photo Modal */}
      {showAiPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !aiPhotoLoading && setShowAiPhotoModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Devis depuis photos</h2>
                  <p className="text-xs text-zinc-400">L&apos;IA analyse vos photos de chantier</p>
                </div>
              </div>
              <button onClick={() => !aiPhotoLoading && setShowAiPhotoModal(false)} className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Photo upload area */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Photos du chantier (max 5)</label>
                <div
                  onClick={() => aiPhotos.length < 5 && aiPhotoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    aiPhotos.length < 5
                      ? 'border-zinc-300 hover:border-emerald-400 cursor-pointer hover:bg-emerald-50/30'
                      : 'border-zinc-200 bg-zinc-50'
                  }`}
                >
                  <Camera className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">
                    {aiPhotos.length < 5
                      ? 'Cliquez pour ajouter des photos'
                      : 'Nombre maximum de photos atteint'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">JPG, PNG — max 4 Mo par photo</p>
                </div>
                <input
                  ref={aiPhotoInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={handleAiPhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Photo previews */}
              {aiPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {aiPhotos.map((photo, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200">
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setAiPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
                        {i + 1}/{aiPhotos.length}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description du chantier (optionnel)</label>
                <textarea
                  value={aiPhotoDescription}
                  onChange={(e) => setAiPhotoDescription(e.target.value)}
                  placeholder="Ex: Rénovation cuisine, le client souhaite refaire le carrelage et les meubles..."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={aiPhotoLoading}
                />
              </div>

              <div className="text-xs text-zinc-400 space-y-1">
                <p>L&apos;IA va analyser vos photos pour :</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Identifier les travaux nécessaires</li>
                  <li>Estimer les surfaces et quantités</li>
                  <li>Générer les lignes main d&apos;oeuvre et matériel</li>
                  <li>Proposer un chiffrage réaliste</li>
                </ul>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-zinc-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAiPhotoModal(false)}
                disabled={aiPhotoLoading}
                className="px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAiPhotoGenerate}
                disabled={aiPhotoLoading || aiPhotos.length === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiPhotoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Analyser et générer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !aiLoading && setShowAiModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Créer devis avec IA</h2>
                  <p className="text-xs text-zinc-400">Décrivez les travaux, l'IA génère les lignes</p>
                </div>
              </div>
              <button onClick={() => !aiLoading && setShowAiModal(false)} className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Décrivez les travaux à réaliser</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Rénovation complète d'une salle de bain de 8m² avec dépose de l'ancienne baignoire, installation d'une douche à l'italienne, pose de carrelage au sol et aux murs, remplacement de la robinetterie..."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  rows={5}
                  disabled={aiLoading}
                />
              </div>
              <div className="text-xs text-zinc-400 space-y-1">
                <p>L'IA va analyser votre description et générer :</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Les lignes de prestations détaillées</li>
                  <li>Les heures estimées par prestation</li>
                  <li>Les prix basés sur votre taux horaire</li>
                  <li>Les conditions et délais suggérés</li>
                </ul>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-zinc-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                disabled={aiLoading}
                className="px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Générer le devis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
