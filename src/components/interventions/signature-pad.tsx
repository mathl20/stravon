'use client';

import { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui';
import { apiFetch } from '@/lib/utils';

interface Props {
  interventionId: string;
  onSaved: () => void;
  onClose: () => void;
}

export function SignaturePad({ interventionId, onSaved, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    setHasDrawn(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const save = async () => {
    if (!hasDrawn) {
      toast.error('Veuillez signer avant de sauvegarder');
      return;
    }
    setSaving(true);
    try {
      const data = canvasRef.current!.toDataURL('image/png');
      await apiFetch(`/api/interventions/${interventionId}/signature`, {
        method: 'PUT',
        body: JSON.stringify({ signatureClient: data }),
      });
      toast.success('Signature enregistrée');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Signature client</h2>
        <p className="text-xs text-zinc-400 mb-4">Signez dans le cadre ci-dessous</p>

        <canvas
          ref={canvasRef}
          width={440}
          height={200}
          className="w-full border border-zinc-200 rounded-xl cursor-crosshair touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />

        <div className="flex gap-3 mt-4">
          <Button onClick={save} loading={saving}>Sauvegarder</Button>
          <Button variant="secondary" onClick={clear}>Effacer</Button>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
        </div>
      </div>
    </div>
  );
}
