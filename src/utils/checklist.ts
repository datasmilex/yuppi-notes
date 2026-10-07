import { sanitizeHtml } from './sanitize';

/**
 * Kart önizlemesinde tıklanan yapılacak maddesini (sıra numarasına göre) işaretler/kaldırır
 * ve güncellenmiş HTML'i döndürür.
 */
export function toggleChecklistItem(html: string, index: number): string | null {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(`<body>${sanitizeHtml(html)}</body>`, 'text/html');
  const items = doc.body.querySelectorAll('ul[data-checklist] > li');
  const li = items[index];
  if (!li) return null;
  li.setAttribute('data-checked', li.getAttribute('data-checked') === 'true' ? 'false' : 'true');
  return doc.body.innerHTML;
}

export function checklistProgress(html: string): { done: number; total: number } {
  if (!html || typeof DOMParser === 'undefined') return { done: 0, total: 0 };
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const items = doc.body.querySelectorAll('ul[data-checklist] > li');
  let done = 0;
  items.forEach((li) => {
    if (li.getAttribute('data-checked') === 'true') done += 1;
  });
  return { done, total: items.length };
}
