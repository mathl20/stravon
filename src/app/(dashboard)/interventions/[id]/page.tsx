'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, FileDown, CheckCircle, PenTool, Receipt, Hammer,
  MapPin, Clock, Users, FileSignature, FileText, Plus, X, Play, Square, Camera, QrCode, Loader2,
} from 'lucide-react';
import { Button, Card, StatusBadge, PageLoader } from '@/components/ui';
import { apiFetch, formatCurrency, formatDate, getStatusLabel } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { InterventionFull } from '@/types';
import { PhotoGallery } from '@/components/interventions/photo-gallery';
import { PhotoUpload } from '@/components/interventions/photo-upload';
import { SignaturePad } from '@/components/interventions/signature-pad';
import { canEditIntervention, canManageFactures, canViewProfitability, hasPermission, isEmployeeRole, PERMISSIONS } from '@/lib/permissions';
import { usePermissions } from '@/lib/permissions-context';
import { ProfitabilityCard } from '@/components/interventions/profitability-card';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
}

export default function InterventionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const perms = usePermissions();
  const isEmp = isEmployeeRole(perms);
  const [inv, setInv] = useState<InterventionFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [signUrl, setSignUrl] = useState('');
  const [userId, setUserId] = useState('');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'materiel' | 'heures' | 'photos'>('details');
  const [matNom, setMatNom] = useState('');
  const [matQte, setMatQte] = useState('1');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishAutoFacture, setFinishAutoFacture] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const reload = () => {
    apiFetch<{ data: InterventionFull }>(`/api/interventions/${id}`)
      .then((r) => setInv(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    apiFetch<{ data: InterventionFull }>(`/api/interventions/${id}`)
      .then((r) => setInv(r.data))
      .catch(() => router.push('/interventions'))
      .finally(() => setLoading(false));
    apiFetch<{ data: { id: string } }>('/api/auth/me')
      .then((r) => setUserId(r.data.id))
      .catch(() => {});
  }, [id, router]);

  useEffect(() => {
    if (!hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE)) return;
    apiFetch<{ data: TeamMember[] }>('/api/team')
      .then((r) => setTeam(r.data))
      .catch(() => {});
  }, [perms]);

  const changeStatus = async (status: string) => {
    try {
      await apiFetch(`/api/interventions/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast.success('Statut mis à jour');
      setInv((prev) => prev ? { ...prev, status } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleAssign = async () => {
    if (!assignUserId) return;
    try {
      await apiFetch(`/api/interventions/${id}/assignments`, { method: 'POST', body: JSON.stringify({ userId: assignUserId }) });
      toast.success('Employé assigné');
      setShowAssign(false);
      setAssignUserId('');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleUnassign = async (uid: string) => {
    try {
      await apiFetch(`/api/interventions/${id}/assignments`, { method: 'DELETE', body: JSON.stringify({ userId: uid }) });
      toast.success('Employé retiré');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (loading || !inv) return <PageLoader />;

  const tva = inv.amountTTC - inv.amountHT;
  const canEdit = canEditIntervention(perms, (inv as any).createdById === userId);
  const assignedIds = new Set(inv.assignedUsers?.map((a) => a.user.id) || []);
  const availableTeam = team.filter((m) => !assignedIds.has(m.id));

  const handleFinishIntervention = async () => {
    setFinishing(true);
    try {
      // Mark as TERMINE
      await apiFetch(`/api/interventions/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'TERMINE' }) });

      if (finishAutoFacture && !isEmp && canManageFactures(perms)) {
        // Generate facture from intervention items
        const items = inv.items?.map((it: any) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })) || [];

        if (items.length > 0) {
          const res = await apiFetch<{ data: { id: string } }>('/api/factures', {
            method: 'POST',
            body: JSON.stringify({
              clientId: inv.clientId,
              interventionId: inv.id,
              date: new Date().toISOString().split('T')[0],
              tvaRate: inv.tvaRate,
              items,
            }),
          });

          // Also mark intervention as INVOICED
          await apiFetch(`/api/interventions/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'INVOICED' }) });

          toast.success('Intervention terminée et facture générée !');
          setShowFinishModal(false);
          router.push(`/factures/${res.data.id}`);
          return;
        }
      }

      toast.success('Intervention terminée');
      setShowFinishModal(false);
      setInv((prev) => prev ? { ...prev, status: 'TERMINE' } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setFinishing(false);
    }
  };

  const tabs = [
    { key: 'details' as const, label: 'Détails', icon: FileText },
    { key: 'materiel' as const, label: 'Matériel', icon: FileSignature, count: inv.materiels?.length || 0 },
    { key: 'heures' as const, label: 'Heures', icon: Clock, count: inv.feuillesHeures?.length || 0 },
    { key: 'photos' as const, label: 'Photos', icon: Camera, count: inv.photos?.length || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => router.push('/interventions')} className="btn-ghost !p-2"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{inv.reference}</h1>
              <StatusBadge status={inv.status} />
            </div>
            <p className="page-subtitle">{inv.title}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Planifié → Démarrer */}
          {inv.status === 'PENDING' && (
            <Button variant="brand" onClick={() => changeStatus('EN_COURS')}>
              <Play className="w-4 h-4" /> Démarrer
            </Button>
          )}
          {/* En cours → Chantier terminé */}
          {inv.status === 'EN_COURS' && (
            <Button variant="brand" onClick={() => setShowFinishModal(true)} className="!bg-emerald-600 hover:!bg-emerald-700">
              <CheckCircle className="w-4 h-4" /> Chantier terminé
            </Button>
          )}
          {/* Terminé → Générer la facture */}
          {inv.status === 'TERMINE' && !isEmp && canManageFactures(perms) && (
            <Button variant="brand" onClick={() => { setFinishAutoFacture(true); setShowFinishModal(true); }}>
              <Receipt className="w-4 h-4" /> Générer la facture
            </Button>
          )}
          {/* Facturé → lien vers facture */}
          {inv.status === 'INVOICED' && (inv as any).factures?.[0] && (
            <Button variant="secondary" href={`/factures/${(inv as any).factures[0].id}`}>
              <Receipt className="w-4 h-4" /> Voir la facture
            </Button>
          )}
          {inv.status !== 'PAID' && inv.status !== 'INVOICED' && inv.status !== 'TERMINE' && (
            <Button variant="brand" href={`/interventions/${id}/chantier`}><Hammer className="w-4 h-4" /> Mode chantier</Button>
          )}
          {!isEmp && <Button variant="secondary" href={`/api/interventions/${id}/pdf`} target="_blank" rel="noreferrer"><FileDown className="w-4 h-4" /> PDF</Button>}
          {!isEmp && (inv.status === 'PENDING' || inv.status === 'EN_COURS') && (
            <Button variant="secondary" href={`/interventions/${id}/edit`}><Pencil className="w-4 h-4" /> Modifier</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-3" style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[11px] text-zinc-400 uppercase tracking-wide font-semibold">Statut</p>
              <p className="text-sm font-semibold mt-1 text-white">{getStatusLabel(inv.status)}</p>
            </div>
            {!isEmp && (
              <div className="rounded-xl p-3" style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[11px] text-zinc-400 uppercase tracking-wide font-semibold">Montant TTC</p>
                <p className="text-sm font-semibold mt-1 text-white">{formatCurrency(inv.amountTTC)}</p>
              </div>
            )}
            <div className="rounded-xl p-3" style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[11px] text-zinc-400 uppercase tracking-wide font-semibold">Heures</p>
              <p className="text-sm font-semibold mt-1 text-white">{(inv.rentabilite?.totalHeures || 0).toFixed(1)}h</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[11px] text-zinc-400 uppercase tracking-wide font-semibold">Équipe</p>
              <p className="text-sm font-semibold mt-1 text-white">{inv.assignedUsers?.length || 0} assigné{(inv.assignedUsers?.length || 0) > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Address + client contact for employees */}
          {(inv.address || inv.client.phone) && (
            <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)' }}>
              {inv.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inv.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 hover:underline transition-colors"
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{inv.address}</span>
                </a>
              )}
              {inv.client.phone && (
                <a
                  href={`tel:${inv.client.phone}`}
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                >
                  <span className="text-base">📞</span>
                  <span>{inv.client.firstName} {inv.client.lastName} — {inv.client.phone}</span>
                </a>
              )}
            </div>
          )}

          {/* Description */}
          {inv.description && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{inv.description}</p>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-200">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 text-[10px] bg-zinc-100 text-zinc-600 rounded-full px-1.5 py-0.5">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Items table */}
              <Card padding={false}>
                <div className="px-5 py-4 border-b border-zinc-100">
                  <h3 className="text-sm font-semibold text-zinc-900">Lignes de l&apos;intervention</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Description</th>
                      <th className="text-center px-5 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Qté</th>
                      {!isEmp && <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Prix unit.</th>}
                      {!isEmp && <th className="text-right px-5 py-2.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Total</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((item) => (
                      <tr key={item.id} className="border-b border-zinc-50">
                        <td className="px-5 py-3 text-zinc-700">{item.description}</td>
                        <td className="px-5 py-3 text-center text-zinc-500">{item.quantity}</td>
                        {!isEmp && <td className="px-5 py-3 text-right text-zinc-500">{formatCurrency(item.unitPrice)}</td>}
                        {!isEmp && <td className="px-5 py-3 text-right font-medium text-zinc-700">{formatCurrency(item.total)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isEmp && (
                  <div className="px-5 py-4 border-t border-zinc-100 flex justify-end">
                    <div className="w-56 space-y-1 text-sm">
                      <div className="flex justify-between text-zinc-500">
                        <span>Total HT</span><span className="font-medium">{formatCurrency(inv.amountHT)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-500">
                        <span>TVA ({inv.tvaRate}%)</span><span className="font-medium">{formatCurrency(tva)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-900 font-bold text-base pt-1.5 border-t border-zinc-200">
                        <span>Total TTC</span><span>{formatCurrency(inv.amountTTC)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Linked Devis */}
              {!isEmp && inv.devis && (
                <Card>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Devis lié</h3>
                  <Link href={`/devis/${inv.devis.id}`} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 group-hover:text-brand-600">{(inv.devis as any).reference}</p>
                      <p className="text-xs text-zinc-500">{(inv.devis as any).title}</p>
                    </div>
                    <span className="text-sm font-semibold text-zinc-700">{formatCurrency((inv.devis as any).amountTTC)}</span>
                  </Link>
                </Card>
              )}

              {/* Linked Factures */}
              {!isEmp && inv.factures && inv.factures.length > 0 && (
                <Card>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                    Facture{inv.factures.length > 1 ? 's' : ''} liée{inv.factures.length > 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-2">
                    {inv.factures.map((f) => (
                      <Link key={f.id} href={`/factures/${f.id}`} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors group">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 group-hover:text-brand-600">{(f as any).numero}</p>
                          <p className="text-xs text-zinc-500">{formatDate(f.date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-zinc-700">{formatCurrency(f.amountTTC)}</p>
                          <StatusBadge status={f.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}

              {/* Signature client */}
              <Card>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Signature client</h3>
                {inv.signatureClient ? (
                  <div>
                    <div className="inline-block p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <img src={inv.signatureClient} alt="Signature client" className="max-w-[280px] h-auto" />
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                      </div>
                      <p className="text-sm text-emerald-700 font-medium">
                        Signé le {inv.signedAt ? new Date(inv.signedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-500">Aucune signature</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="brand" onClick={async () => {
                        setQrLoading(true);
                        try {
                          const res = await apiFetch<{ data: { token: string } }>(`/api/interventions/${id}/signature-token`, { method: 'POST' });
                          const url = `${window.location.origin}/sign/${res.data.token}`;
                          setSignUrl(url);
                          const QRCode = (await import('qrcode')).default;
                          const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#18181b' } });
                          setQrDataUrl(dataUrl);
                          setShowQR(true);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Erreur');
                        } finally {
                          setQrLoading(false);
                        }
                      }} className="text-xs">
                        {qrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                        QR Code client
                      </Button>
                      <Button variant="secondary" onClick={() => setShowSignature(true)} className="text-xs">
                        <PenTool className="w-3.5 h-3.5" /> Signer ici
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Notes */}
              {inv.notes && (
                <Card>
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Notes internes</h3>
                  <p className="text-sm text-zinc-600 whitespace-pre-wrap">{inv.notes}</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'materiel' && (
            <Card>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Matériel utilisé</h3>

              {/* Add material form */}
              {canEdit && (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Matériel utilisé"
                    value={matNom}
                    onChange={(e) => setMatNom(e.target.value)}
                    className="input-field text-sm flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!matNom.trim()) return;
                        apiFetch(`/api/interventions/${id}/materiels`, {
                          method: 'POST',
                          body: JSON.stringify({ nom: matNom.trim(), quantite: Number(matQte) || 1 }),
                        }).then(() => { setMatNom(''); setMatQte('1'); reload(); toast.success('Matériel ajouté'); })
                          .catch((err) => toast.error(err instanceof Error ? err.message : 'Erreur'));
                      }
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Qté"
                    value={matQte}
                    onChange={(e) => setMatQte(e.target.value)}
                    className="input-field text-sm w-20 text-center"
                    min="1"
                  />
                  <Button
                    className="text-xs"
                    onClick={() => {
                      if (!matNom.trim()) { toast.error('Entrez un nom'); return; }
                      apiFetch(`/api/interventions/${id}/materiels`, {
                        method: 'POST',
                        body: JSON.stringify({ nom: matNom.trim(), quantite: Number(matQte) || 1 }),
                      }).then(() => { setMatNom(''); setMatQte('1'); reload(); toast.success('Matériel ajouté'); })
                        .catch((err) => toast.error(err instanceof Error ? err.message : 'Erreur'));
                    }}
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </Button>
                </div>
              )}

              {/* Material list */}
              {inv.materiels && inv.materiels.length > 0 ? (
                <div className="space-y-2">
                  {inv.materiels.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl group">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-zinc-900">{m.nom}</span>
                        <span className="text-xs text-zinc-400">× {m.quantite}</span>
                        {!isEmp && m.prixUnitaire > 0 && (
                          <span className="text-xs text-zinc-500">({formatCurrency(m.prixUnitaire)}/u)</span>
                        )}
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => {
                            apiFetch(`/api/interventions/${id}/materiels`, {
                              method: 'DELETE',
                              body: JSON.stringify({ materielId: m.id }),
                            }).then(() => { reload(); toast.success('Supprimé'); })
                              .catch((err) => toast.error(err instanceof Error ? err.message : 'Erreur'));
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-400 text-center py-4">Aucun matériel enregistré</p>
              )}
            </Card>
          )}

          {activeTab === 'heures' && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Heures travaillées</h3>
                <span className="text-xs text-zinc-500 font-medium">
                  Total : {(inv.rentabilite?.totalHeures || 0).toFixed(1)}h
                </span>
              </div>
              {inv.feuillesHeures && inv.feuillesHeures.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left pb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Date</th>
                        <th className="text-left pb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Employé</th>
                        <th className="text-center pb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Horaires</th>
                        <th className="text-right pb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.feuillesHeures.map((fh: any) => (
                        <tr key={fh.id} className="border-b border-zinc-50">
                          <td className="py-2.5 text-zinc-700">{formatDate(fh.date)}</td>
                          <td className="py-2.5 text-zinc-600">{fh.utilisateur.firstName} {fh.utilisateur.lastName}</td>
                          <td className="py-2.5 text-center text-zinc-500">
                            {fh.heureDebut && fh.heureFin ? `${fh.heureDebut} → ${fh.heureFin}` : '—'}
                          </td>
                          <td className="py-2.5 text-right font-medium text-zinc-900">{fh.heuresTravaillees}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Aucune heure enregistrée</p>
                  <Link href="/feuilles-heures/new" className="text-sm text-brand-600 font-medium mt-1 inline-block hover:underline">
                    Ajouter des heures
                  </Link>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'photos' && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Photos</h3>
                <span className="text-xs text-zinc-400">{inv.photos?.length || 0}/5</span>
              </div>
              <PhotoGallery
                interventionId={id}
                photos={inv.photos || []}
                canEdit={canEdit}
                onDeleted={reload}
              />
              {canEdit && (
                <div className="mt-3">
                  <PhotoUpload
                    interventionId={id}
                    photoCount={inv.photos?.length || 0}
                    onUploaded={reload}
                  />
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Client */}
          <Card>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Client</h3>
            <Link href={`/clients/${inv.client.id}`} className="block group">
              <p className="text-sm font-semibold text-zinc-900 group-hover:text-brand-600 transition-colors">
                {inv.client.firstName} {inv.client.lastName}
              </p>
              {!isEmp && inv.client.phone && <p className="text-xs text-zinc-500 mt-0.5">{inv.client.phone}</p>}
              {!isEmp && inv.client.email && <p className="text-xs text-zinc-500">{inv.client.email}</p>}
              {inv.client.city && <p className="text-xs text-zinc-400 mt-0.5">{inv.client.postalCode} {inv.client.city}</p>}
            </Link>
          </Card>

          {/* Assigned employees */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Employés assignés</h3>
              {hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) && (
                <button onClick={() => setShowAssign(!showAssign)} className="p-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            {showAssign && (
              <div className="flex gap-2 mb-3">
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="input-field text-sm flex-1"
                >
                  <option value="">Choisir...</option>
                  {availableTeam.map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
                <Button onClick={handleAssign} className="text-xs">Ajouter</Button>
              </div>
            )}
            {inv.assignedUsers && inv.assignedUsers.length > 0 ? (
              <div className="space-y-2">
                {inv.assignedUsers.map((a) => (
                  <div key={a.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                        {a.user.firstName[0]}{a.user.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{a.user.firstName} {a.user.lastName}</p>
                        <p className="text-[11px] text-zinc-400">{a.user.email}</p>
                      </div>
                    </div>
                    {hasPermission(perms, PERMISSIONS.INTERVENTIONS_MANAGE) && (
                      <button
                        onClick={() => handleUnassign(a.user.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Aucun employé assigné</p>
            )}
          </Card>

          {/* Info */}
          <Card>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Informations</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-zinc-500">Date</span><span className="font-medium text-zinc-700">{formatDate(inv.date)}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Technicien</span><span className="font-medium text-zinc-700">{(inv as any).createdBy?.firstName} {(inv as any).createdBy?.lastName}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Créée le</span><span className="font-medium text-zinc-700">{formatDate(inv.createdAt)}</span></div>
            </div>
          </Card>

          {/* Profitability */}
          {canViewProfitability(perms) && inv.rentabilite && (
            <Card>
              <ProfitabilityCard
                amountHT={inv.amountHT}
                rentabilite={inv.rentabilite}
                heuresEstimees={(inv as any).heuresEstimees}
              />
            </Card>
          )}
        </div>
      </div>

      {showSignature && (
        <SignaturePad
          interventionId={id}
          onSaved={() => { setShowSignature(false); reload(); }}
          onClose={() => setShowSignature(false)}
        />
      )}

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative animate-fade-in">
            <button onClick={() => setShowQR(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 mb-1">Faire signer le client</h2>
              <p className="text-xs text-zinc-500 mb-5">Le client scanne ce QR code avec son téléphone pour signer</p>

              {qrDataUrl && (
                <div className="flex justify-center mb-4">
                  <img src={qrDataUrl} alt="QR Code signature" className="w-56 h-56 rounded-xl border border-zinc-200" />
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(signUrl);
                    toast.success('Lien copié !');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Copier le lien
                </button>
                <p className="text-[11px] text-zinc-400">Le lien devient invalide après signature</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finish intervention modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in" style={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-emerald-600/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold" style={{ color: '#eae9f0' }}>
                {inv.status === 'TERMINE' ? 'Générer la facture' : 'Chantier terminé ?'}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#9d9bab' }}>
                {inv.status === 'TERMINE'
                  ? `Créer une facture de ${formatCurrency(inv.amountTTC)} pour ${inv.client.firstName} ${inv.client.lastName}`
                  : `Marquer l'intervention ${inv.reference} comme terminée`}
              </p>
            </div>

            {!isEmp && canManageFactures(perms) && inv.status !== 'TERMINE' && (inv.items?.length || 0) > 0 && (
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <input
                  type="checkbox"
                  checked={finishAutoFacture}
                  onChange={(e) => setFinishAutoFacture(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 text-emerald-600 focus:ring-emerald-500 bg-transparent"
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: '#eae9f0' }}>Générer la facture automatiquement</p>
                  <p className="text-xs" style={{ color: '#5f5d6e' }}>Une facture de {formatCurrency(inv.amountTTC)} sera créée</p>
                </div>
              </label>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ color: '#9d9bab', background: 'rgba(255,255,255,0.06)' }}
              >
                Annuler
              </button>
              <button
                onClick={inv.status === 'TERMINE' ? handleFinishIntervention : handleFinishIntervention}
                disabled={finishing}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
