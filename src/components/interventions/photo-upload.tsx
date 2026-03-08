'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui';
import { apiFetch } from '@/lib/utils';

const MAX_SIZE = 500 * 1024;

interface Props {
  interventionId: string;
  photoCount: number;
  onUploaded: () => void;
}

export function PhotoUpload({ interventionId, photoCount, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.match(/^image\/(png|jpe?g|webp)$/)) {
      toast.error('Format accepté : PNG, JPG ou WebP');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Photo trop volumineuse (500 Ko max)');
      return;
    }
    if (photoCount >= 5) {
      toast.error('Maximum 5 photos par intervention');
      return;
    }

    setUploading(true);
    try {
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      await apiFetch(`/api/interventions/${interventionId}/photos`, {
        method: 'POST',
        body: JSON.stringify({ data }),
      });
      toast.success('Photo ajoutée');
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-zinc-200 rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all"
      >
        <Upload className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-500">
          {uploading ? 'Envoi en cours...' : `Ajouter une photo (${photoCount}/5)`}
        </span>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} className="hidden" />
    </div>
  );
}
