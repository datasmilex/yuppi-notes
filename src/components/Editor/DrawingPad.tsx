'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Brush, Eraser, Trash, Undo2, Check } from 'lucide-react';
import { ModalShell } from '../Common/ModalShell';

interface DrawingPadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

const PEN_COLORS = ['#1F2937', '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#0891B2', '#2563EB', '#9333EA', '#DB2777'];
const SIZES = [
  { id: 'thin', px: 2.5, label: 'İnce' },
  { id: 'medium', px: 5, label: 'Orta' },
  { id: 'thick', px: 10, label: 'Kalın' },
];
const MAX_UNDO = 30;

/** Parmak, kalem veya fareyle eskiz; not galerisine görsel olarak eklenir. */
export const DrawingPad: React.FC<DrawingPadProps> = ({ isOpen, onClose, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const undoRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const [color, setColor] = useState(PEN_COLORS[0]);
  const [size, setSize] = useState(SIZES[1].px);
  const [eraser, setEraser] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Tuvali kapsayıcı genişliğine ve ekran yoğunluğuna göre hazırla (pencere DOM'a eklendikten hemen sonra)
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = wrap.clientWidth || 600;
    const height = Math.round(Math.min(width * 0.62, window.innerHeight * 0.55));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    undoRef.current = [];
    setCanUndo(false);
    setDirty(false);
  }, [isOpen]);

  const ctx = () => canvasRef.current?.getContext('2d') || null;

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const snapshot = () => {
    const canvas = canvasRef.current;
    const c = ctx();
    if (!canvas || !c) return;
    undoRef.current.push(c.getImageData(0, 0, canvas.width, canvas.height));
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
    setCanUndo(true);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ctx();
    if (!c) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    snapshot();
    drawingRef.current = true;
    const p = pointFrom(e);
    pointsRef.current = [p];
    const width = size * (e.pointerType === 'pen' && e.pressure > 0 ? 0.5 + e.pressure : 1);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = eraser ? '#ffffff' : color;
    c.fillStyle = eraser ? '#ffffff' : color;
    c.lineWidth = eraser ? size * 3 : width;
    // Tek dokunuş da nokta bıraksın
    c.beginPath();
    c.arc(p.x, p.y, c.lineWidth / 2, 0, Math.PI * 2);
    c.fill();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const c = ctx();
    if (!c) return;
    const pts = pointsRef.current;
    pts.push(pointFrom(e));
    if (pts.length < 3) return;
    // Ardışık orta noktalar arasında ikinci derece eğri: titrek olmayan, yumuşak çizgi
    const [p0, p1, p2] = pts.slice(-3);
    const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const m2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    c.beginPath();
    c.moveTo(m1.x, m1.y);
    c.quadraticCurveTo(p1.x, p1.y, m2.x, m2.y);
    c.stroke();
    setDirty(true);
  };

  const onPointerUp = () => {
    if (drawingRef.current) setDirty(true);
    drawingRef.current = false;
    pointsRef.current = [];
  };

  const undo = () => {
    const c = ctx();
    const last = undoRef.current.pop();
    if (c && last) c.putImageData(last, 0, 0);
    setCanUndo(undoRef.current.length > 0);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const c = ctx();
    if (!canvas || !c) return;
    snapshot();
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.restore();
    setDirty(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/jpeg', 0.9));
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Çizim Yap"
      subtitle="Parmak, kalem veya fareyle çiz · nota görsel olarak eklenir"
      icon={<Brush className="w-5 h-5" />}
      size="2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100">
            Vazgeç
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty && !canUndo}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md disabled:opacity-40 transition-all"
          >
            <Check className="w-4 h-4" />
            Nota Ekle
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setEraser(false);
              }}
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                color === c && !eraser ? 'border-gray-900 scale-110 ring-2 ring-offset-1 ring-gray-300' : 'border-white shadow-xs'
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Kalem rengi ${c}`}
            />
          ))}
        </div>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100">
          {SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSize(s.px)}
              className={`w-8 h-7 rounded-lg flex items-center justify-center ${size === s.px ? 'bg-white shadow-xs' : 'hover:bg-white/60'}`}
              title={s.label}
              aria-label={`${s.label} uç`}
            >
              <span className="rounded-full bg-gray-800" style={{ width: s.px + 2, height: s.px + 2 }} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setEraser(!eraser)}
          className={`p-2 rounded-xl transition-colors ${eraser ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          title="Silgi"
          aria-pressed={eraser}
        >
          <Eraser className="w-4 h-4" />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={undo} disabled={!canUndo} className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40" title="Geri Al">
            <Undo2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={clear} className="p-2 rounded-xl bg-gray-100 text-red-600 hover:bg-red-50" title="Tuvali Temizle">
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="w-full rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 bg-white">
        <canvas
          ref={canvasRef}
          className="drawing-canvas block"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
    </ModalShell>
  );
};
