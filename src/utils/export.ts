import { Note } from '../types/note';
import { NOTE_COLORS } from './colors';
import { formatFullDate } from './date';
import { sanitizeHtml } from './sanitize';
import { downloadFile, escapeHtml, noteToText, safeFileName } from './text';

// ---------- HTML -> Markdown ----------

const INLINE_MARKS: Record<string, [string, string]> = {
  B: ['**', '**'],
  STRONG: ['**', '**'],
  I: ['*', '*'],
  EM: ['*', '*'],
  S: ['~~', '~~'],
  STRIKE: ['~~', '~~'],
  DEL: ['~~', '~~'],
  MARK: ['==', '=='],
  U: ['<u>', '</u>'],
  CODE: ['`', '`'],
};

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/ /g, ' ');
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  if (el.tagName === 'BR') return '  \n';
  const inner = Array.from(el.childNodes).map(inline).join('');
  if (el.tagName === 'A') {
    const href = el.getAttribute('href');
    return href ? `[${inner || href}](${href})` : inner;
  }
  const marks = INLINE_MARKS[el.tagName];
  if (!marks || !inner.trim()) return inner;
  // İşaretler boşluğa yapışırsa Markdown biçimi bozulur: boşlukları dışarı taşı
  const lead = inner.match(/^\s*/)?.[0] || '';
  const trail = inner.match(/\s*$/)?.[0] || '';
  return `${lead}${marks[0]}${inner.trim()}${marks[1]}${trail}`;
}

function block(node: Node, depth = 0): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = inline(node);
    return text.trim() ? `${text.trim()}\n\n` : '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as HTMLElement;
  const children = () => Array.from(el.childNodes).map((c) => block(c, depth)).join('');
  const text = () => Array.from(el.childNodes).map(inline).join('').trim();

  switch (el.tagName) {
    case 'H1':
      return `# ${text()}\n\n`;
    case 'H2':
      return `## ${text()}\n\n`;
    case 'H3':
      return `### ${text()}\n\n`;
    case 'HR':
      return '---\n\n';
    case 'PRE':
      return `\`\`\`\n${el.textContent || ''}\n\`\`\`\n\n`;
    case 'BLOCKQUOTE':
      return (
        children()
          .trim()
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n\n'
      );
    case 'UL':
    case 'OL': {
      const checklist = el.hasAttribute('data-checklist');
      const indent = '  '.repeat(depth);
      let i = 0;
      const lines = Array.from(el.children)
        .filter((c) => c.tagName === 'LI')
        .map((li) => {
          i += 1;
          const marker = checklist
            ? li.getAttribute('data-checked') === 'true'
              ? '- [x]'
              : '- [ ]'
            : el.tagName === 'OL'
            ? `${i}.`
            : '-';
          const own = Array.from(li.childNodes)
            .filter((c) => !(c.nodeType === Node.ELEMENT_NODE && ['UL', 'OL'].includes((c as HTMLElement).tagName)))
            .map(inline)
            .join('')
            .trim();
          const nested = Array.from(li.children)
            .filter((c) => c.tagName === 'UL' || c.tagName === 'OL')
            .map((c) => block(c, depth + 1).trimEnd())
            .join('\n');
          return `${indent}${marker} ${own}${nested ? `\n${nested}` : ''}`;
        });
      return `${lines.join('\n')}\n\n`;
    }
    case 'P':
    case 'DIV': {
      const hasBlocks = Array.from(el.children).some((c) =>
        ['P', 'DIV', 'UL', 'OL', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'PRE', 'HR'].includes(c.tagName)
      );
      if (hasBlocks) return children();
      const t = text();
      return t ? `${t}\n\n` : '';
    }
    default: {
      const t = inline(el).trim();
      return t ? `${t}\n\n` : '';
    }
  }
}

export function htmlToMarkdown(html: string): string {
  if (!html || typeof document === 'undefined') return '';
  const root = document.createElement('div');
  root.innerHTML = sanitizeHtml(html);
  return Array.from(root.childNodes)
    .map((n) => block(n))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function noteToMarkdown(note: Note): string {
  const parts = [`# ${note.title || 'Başlıksız Not'}`];
  const meta: string[] = [];
  if (note.tags?.length) meta.push(note.tags.map((t) => `#${t}`).join(' '));
  if (note.stickers?.length) meta.push(note.stickers.join(' '));
  if (meta.length) parts.push(meta.join(' · '));
  const body = htmlToMarkdown(note.content);
  if (body) parts.push(body);
  parts.push(`_${formatFullDate(note.updatedAt)} · ${note.lastEditedBy?.userName || 'Anonim'}_`);
  return parts.join('\n\n');
}

// ---------- Bağımsız HTML belgesi (paylaşım / yazdırma) ----------

const DOC_STYLE = `
  *{box-sizing:border-box}
  body{font-family:Inter,-apple-system,'Segoe UI',sans-serif;color:#1f2937;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.65}
  header{border-left:6px solid var(--accent);padding:4px 0 4px 16px;margin-bottom:28px}
  h1.title{font-size:2rem;margin:0 0 6px;line-height:1.2}
  .meta{font-size:.8rem;color:#6b7280}
  .tags span{display:inline-block;background:#f3f4f6;border-radius:999px;padding:1px 10px;margin:6px 6px 0 0;font-size:.75rem;font-weight:600}
  h1,h2,h3{line-height:1.25}
  blockquote{border-left:3px solid #d1d5db;margin:.6em 0;padding-left:.9em;color:#4b5563}
  pre{background:#f3f4f6;padding:12px 14px;border-radius:10px;overflow:auto;font-size:.85rem}
  code{background:#f3f4f6;padding:.1em .35em;border-radius:.3em;font-size:.9em}
  mark{background:#fef08a;padding:0 .25em;border-radius:.25em}
  a{color:#7c3aed}
  ul[data-checklist]{list-style:none;padding-left:0}
  ul[data-checklist]>li::before{content:'☐';margin-right:.5em}
  ul[data-checklist]>li[data-checked='true']{text-decoration:line-through;color:#6b7280}
  ul[data-checklist]>li[data-checked='true']::before{content:'☑'}
  .images{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:20px 0}
  .images img{width:100%;border-radius:12px;border:1px solid #e5e7eb}
  footer{margin-top:40px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:.75rem;color:#9ca3af}
  @media print{body{margin:0 auto}a{color:inherit}}
`;

export function noteToHtmlDocument(note: Note): string {
  const accent = (NOTE_COLORS[note.color] || NOTE_COLORS.yellow).accent;
  const title = escapeHtml(note.title || 'Başlıksız Not');
  const tags = (note.tags || []).map((t) => `<span>#${escapeHtml(t)}</span>`).join('');
  const images = note.images.length
    ? `<div class="images">${note.images
        .filter((src) => /^data:image\/|^https?:/.test(src))
        .map((src) => `<img src="${escapeHtml(src)}" alt="">`)
        .join('')}</div>`
    : '';
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>:root{--accent:${accent}}${DOC_STYLE}</style></head>
<body>
<header><h1 class="title">${title}</h1>
<div class="meta">${escapeHtml(formatFullDate(note.updatedAt))} · ${escapeHtml(note.lastEditedBy?.userName || 'Anonim')}</div>
${tags ? `<div class="tags">${tags}</div>` : ''}</header>
${images}
<main>${sanitizeHtml(note.content)}</main>
<footer>YuPPi Notes ile oluşturuldu</footer>
</body></html>`;
}

/** Notu gizli bir iframe'de yazdırma penceresine gönderir (PDF olarak kaydetmek de buradan yapılır). */
export function printNote(note: Note): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  iframe.srcdoc = noteToHtmlDocument(note);
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 60_000);
  };
  document.body.appendChild(iframe);
}

export type ExportFormat = 'txt' | 'md' | 'html';

export function exportNote(note: Note, format: ExportFormat): void {
  const name = safeFileName(note.title);
  if (format === 'md') downloadFile(`${name}.md`, noteToMarkdown(note), 'text/markdown;charset=utf-8');
  else if (format === 'html') downloadFile(`${name}.html`, noteToHtmlDocument(note), 'text/html;charset=utf-8');
  else downloadFile(`${name}.txt`, noteToText(note.title, note.content));
}

/** Birden çok notu tek bir Markdown dosyasında birleştirir. */
export function exportNotesMarkdown(notes: Note[], filename: string): void {
  const body = notes.map(noteToMarkdown).join('\n\n---\n\n');
  downloadFile(`${safeFileName(filename)}.md`, body, 'text/markdown;charset=utf-8');
}
