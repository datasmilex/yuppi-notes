'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  RotateCcw,
  Trash2,
  Palette,
  Circle,
  Minimize2,
  Maximize2,
} from 'lucide-react';

interface DrawingCanvasProps {
  initialData?: string;
  onChange: (dataUrl: string) => void;
  readOnly?: boolean;
}

type ToolType = 'pen' | 'highlighter' | 'eraser';

const COLOR_PALETTE = [
  { name: 'Siyah', value: '#1E293B' },
  { name: 'Mavi', value: '#2563EB' },
  { name: 'Mor', value: '#9333EA' },
  { name: 'Kırmızı', value: '#EF4444' },
  { name: 'Yeşil', value: '#10B981' },
  { name: 'Fosforlu Sarı', value: '#FACC15' },
  { name: 'Fosforlu Pembe', value: '#F472B6' },
  { name: 'Fosforlu Yeşil', value: '#4ADE80' },
  { name: 'Fosforlu Mavi', value: '#38BDF8' },
];

const STROKE_WIDTHS = [
  { label: 'İnce', value: 2 },
  { label: 'Orta', value: 5 },
  { label: 'Kalın', value: 12 },
  { label: 'Geniş', value: 24 },
];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  initialData,
  onChange,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [activeColor, setActiveColor] = useState<string>('#1E293B');
  const [strokeWidth, setStrokeWidth] = useState<number>(5);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [canvasHeight, setCanvasHeight] = useState<number>(360);

  // Initialize canvas with initialData if present
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (initialData) {
      const img = new Image();
      img.src = initialData;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  }, [initialData]);

  // Adjust canvas resolution to container width
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    // Save existing content before resize
    const ctx = canvas.getContext('2d');
    const tempImage = canvas.toDataURL();

    canvas.width = rect.width;
    canvas.height = canvasHeight;

    if (tempImage && tempImage !== 'data:,') {
      const img = new Image();
      img.src = tempImage;
      img.onload = () => {
        ctx?.drawImage(img, 0, 0);
      };
    }
  }, [canvasHeight]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    try {
      const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-15), state]);
    } catch {}
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    saveHistoryState();
    setIsDrawing(true);

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = strokeWidth * 2.5;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const last = history[history.length - 1];
    ctx.putImageData(last, 0, 0);
    setHistory((prev) => prev.slice(0, -1));
    onChange(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    if (window.confirm('Tüm çizimi temizlemek istediğinizden emin misiniz?')) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      saveHistoryState();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onChange('');
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col rounded-3xl border-2 border-purple-200/80 bg-white/80 backdrop-blur-md overflow-hidden shadow-sm transition-all mb-6"
    >
      {/* OneNote Drawing Toolbar */}
      {!readOnly && (
        <div className="flex items-center justify-between p-2.5 border-b border-purple-100 bg-gradient-to-r from-purple-50/60 via-pink-50/40 to-amber-50/60 flex-wrap gap-2 select-none">
          {/* Tools: Pen, Highlighter, Eraser */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'pen'
                  ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                  : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              title="Tükenmez Kalem"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Kalem</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'highlighter'
                  ? 'bg-amber-400 text-amber-950 shadow-sm ring-2 ring-amber-300'
                  : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              title="Fosforlu Vurgulayıcı"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Vurgulayıcı</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTool === 'eraser'
                  ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-300'
                  : 'bg-white/80 hover:bg-white text-gray-700'
              }`}
              title="Silgi"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Silgi</span>
            </button>
          </div>

          {/* Stroke Widths */}
          <div className="flex items-center gap-1">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                type="button"
                onClick={() => setStrokeWidth(sw.value)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                  strokeWidth === sw.value
                    ? 'bg-purple-200 text-purple-900 font-bold ring-2 ring-purple-400'
                    : 'bg-white/70 hover:bg-white text-gray-500'
                }`}
                title={`Kalınlık: ${sw.label}`}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: `${Math.min(14, sw.value + 2)}px`, height: `${Math.min(14, sw.value + 2)}px` }}
                />
              </button>
            ))}
          </div>

          {/* Color Palette */}
          {activeTool !== 'eraser' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setActiveColor(c.value)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 shadow-2xs ${
                    activeColor === c.value ? 'ring-2 ring-offset-1 ring-gray-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          )}

          {/* Actions: Undo, Clear, Height toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 disabled:opacity-40 transition-colors shadow-2xs"
              title="Geri Al"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-xl bg-white/80 hover:bg-red-50 text-red-600 transition-colors shadow-2xs"
              title="Tuvali Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setCanvasHeight((prev) => (prev === 360 ? 600 : 360))}
              className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-gray-700 transition-colors shadow-2xs"
              title={canvasHeight === 360 ? 'Çizim Alanını Genişlet' : 'Daralt'}
            >
              {canvasHeight === 360 ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Grid Pattern OneNote Paper Surface */}
      <div
        className="relative w-full overflow-hidden bg-white cursor-crosshair"
        style={{
          backgroundImage:
            'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          height: `${canvasHeight}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none"
        />

        {!readOnly && (
          <div className="absolute bottom-2 right-3 pointer-events-none text-[11px] font-semibold text-gray-400 select-none">
            ✍️ Serbest OneNote Çizim Tuvali
          </div>
        )}
      </div>
    </div>
  );
};
