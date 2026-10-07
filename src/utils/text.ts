export function uid(prefix = 'note'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTextToHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `<p>${line.trim() ? escapeHtml(line) : '<br>'}</p>`)
    .join('');
}

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI', 'HR']);

/**
 * HTML -> okunabilir düz metin. Detached elementlerde innerText satır sonlarını
 * korumadığı için bloklar, listeler ve yapılacaklar kutuları elle işlenir.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const root = document.createElement('div');
  root.innerHTML = html;
  let out = '';

  const ensureNewline = () => {
    if (out && !out.endsWith('\n')) out += '\n';
  };

  const walk = (node: Node, ctx: { ordered?: boolean; index?: number; checklist?: boolean }) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent || '').replace(/\u00a0/g, ' ');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;

    if (tag === 'BR') {
      out += '\n';
      return;
    }

    if (tag === 'UL' || tag === 'OL') {
      ensureNewline();
      const isChecklist = el.hasAttribute('data-checklist');
      let i = 0;
      el.childNodes.forEach((child) => {
        if ((child as HTMLElement).tagName === 'LI') {
          i += 1;
          walk(child, { ordered: tag === 'OL', index: i, checklist: isChecklist });
        } else {
          walk(child, {});
        }
      });
      ensureNewline();
      return;
    }

    if (tag === 'LI') {
      ensureNewline();
      if (ctx.checklist) out += el.getAttribute('data-checked') === 'true' ? '☑ ' : '☐ ';
      else if (ctx.ordered) out += `${ctx.index}. `;
      else out += '• ';
      el.childNodes.forEach((c) => walk(c, {}));
      ensureNewline();
      return;
    }

    const isBlock = BLOCK_TAGS.has(tag);
    if (isBlock) ensureNewline();
    el.childNodes.forEach((c) => walk(c, {}));
    if (isBlock) ensureNewline();
  };

  root.childNodes.forEach((c) => walk(c, {}));
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

export function noteToText(title: string, html: string): string {
  const body = htmlToPlainText(html);
  return body ? `${title}\n\n${body}` : title;
}

/** HTTP (LAN) üzerinden açılan mobil tarayıcılarda navigator.clipboard yoktur; eski yönteme düşer. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // aşağıdaki yedek yönteme geç
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function downloadFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFileName(name: string, fallback = 'not'): string {
  const cleaned = (name || fallback).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60);
  return cleaned || fallback;
}
