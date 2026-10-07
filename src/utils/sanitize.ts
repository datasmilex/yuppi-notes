import { escapeHtml } from './text';

const ALLOWED_TAGS = new Set([
  'P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'MARK', 'SPAN',
  'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'CODE', 'PRE', 'HR',
]);

const DROP_WITH_CONTENT = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'SVG', 'MATH', 'TEMPLATE', 'FORM', 'NOSCRIPT',
]);

const ALLOWED_STYLE_PROPS = new Set([
  'background-color', 'background', 'color', 'font-weight', 'font-style', 'font-size', 'text-decoration',
  'display', 'padding', 'margin', 'border', 'border-radius', 'vertical-align', 'user-select',
]);

function cleanStyle(style: string): string {
  return style
    .split(';')
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const idx = decl.indexOf(':');
      if (idx === -1) return false;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim().toLowerCase();
      if (!ALLOWED_STYLE_PROPS.has(prop)) return false;
      return !/url\(|expression|javascript:|@import|var\(/.test(value);
    })
    .join('; ');
}

function cleanNode(node: Node, stripStyles: boolean): void {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      node.removeChild(child);
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as HTMLElement;
    const tag = el.tagName;

    if (DROP_WITH_CONTENT.has(tag)) {
      node.removeChild(el);
      return;
    }

    cleanNode(el, stripStyles);

    if (!ALLOWED_TAGS.has(tag)) {
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      node.removeChild(el);
      return;
    }

    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name === 'style') {
        const cleaned = stripStyles ? '' : cleanStyle(attr.value);
        if (cleaned) el.setAttribute('style', cleaned);
        else el.removeAttribute('style');
      } else if (name === 'data-checklist' && tag === 'UL') {
        el.setAttribute('data-checklist', 'true');
      } else if (name === 'data-checked' && tag === 'LI') {
        el.setAttribute('data-checked', attr.value === 'true' ? 'true' : 'false');
      } else {
        el.removeAttribute(attr.name);
      }
    });
  });
}

/**
 * Not içeriği ortak odalardaki başka kullanıcılardan gelebilir; render etmeden ve düzenleyiciye
 * yüklemeden önce yalnızca güvenli etiketler/özellikler bırakılır (XSS koruması).
 */
export function sanitizeHtml(html: string, options: { stripStyles?: boolean } = {}): string {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(html.replace(/<[^>]*>/g, ' '));
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  cleanNode(doc.body, Boolean(options.stripStyles));
  return doc.body.innerHTML;
}
