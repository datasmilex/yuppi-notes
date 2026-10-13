import { useEffect, useRef } from 'react';

// Üst üste açılan pencereler için ortak Esc yığını: Esc yalnızca en üstteki pencereyi kapatır
// (ör. editörün içinden açılan sürüm geçmişi kapanırken editör açık kalır).

interface Entry {
  handler: () => void;
}

const stack: Entry[] = [];
let installed = false;

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || stack.length === 0 || e.isComposing) return;
  e.preventDefault();
  e.stopPropagation();
  stack[stack.length - 1].handler();
}

export function useEscape(active: boolean, handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    const entry: Entry = { handler: () => handlerRef.current() };
    stack.push(entry);
    if (!installed) {
      window.addEventListener('keydown', onKeyDown, true);
      installed = true;
    }
    return () => {
      const index = stack.indexOf(entry);
      if (index !== -1) stack.splice(index, 1);
    };
  }, [active]);
}

/** Açık bir pencere/menü varken genel klavye kısayolları devre dışı kalsın diye. */
export function hasOpenLayer(): boolean {
  return stack.length > 0;
}
