'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '@/lib/utils';

interface Photo {
  id: string;
  data: string;
  label: string | null;
  createdAt: string | Date;
}

interface Props {
  interventionId: string;
  photos: Photo[];
  canEdit: boolean;
  onDeleted: () => void;
}

export function PhotoGallery({ interventionId, photos, canEdit, onDeleted }: Props) {
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const handleDelete = async (photoId: string) => {
    if (!confirm('Supprimer cette photo ?')) return;
    try {
      await apiFetch(`/api/interventions/${interventionId}/photos/${photoId}`, { method: 'DELETE' });
      toast.success('Photo supprimée');
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((p) => (
          <div key={p.id} className="relative group rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
            <img
              src={p.data}
              alt={p.label || 'Photo'}
              className="w-full h-32 object-cover cursor-pointer"
              onClick={() => setZoomSrc(p.data)}
            />
            {p.label && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[11px] px-2 py-1 truncate">
                {p.label}
              </div>
            )}
            {canEdit && (
              <button
                onClick={() => handleDelete(p.id)}
                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/90 text-red-500 hover:bg-red-50 transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {zoomSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setZoomSrc(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-zinc-300" onClick={() => setZoomSrc(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={zoomSrc} alt="Zoom" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}
