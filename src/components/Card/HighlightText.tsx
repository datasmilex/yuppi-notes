import React from 'react';

/** Aranan ifadeyi metin içinde fosforlu kalemle işaretler (Türkçe büyük/küçük harf duyarsız). */
export const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = query.trim();
  if (!q || !text) return <>{text}</>;

  const haystack = text.toLocaleLowerCase('tr-TR');
  const needle = q.toLocaleLowerCase('tr-TR');
  const parts: React.ReactNode[] = [];
  let from = 0;
  let index = haystack.indexOf(needle, from);
  // Türkçe küçük harfe çevirme uzunluğu değiştirmediği sürece indeksler orijinal metinle örtüşür
  if (haystack.length !== text.length) return <>{text}</>;

  while (index !== -1) {
    if (index > from) parts.push(text.slice(from, index));
    parts.push(<mark key={index}>{text.slice(index, index + needle.length)}</mark>);
    from = index + needle.length;
    index = haystack.indexOf(needle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return <>{parts}</>;
};
