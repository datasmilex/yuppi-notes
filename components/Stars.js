'use client';
import { useState } from 'react';

export default function Stars({ value = 0, onChange, size = 34 }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="stars" role="radiogroup" aria-label="Puan">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} yıldız`}
          className={n <= shown ? 'on' : ''}
          style={{ fontSize: size }}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(n)}
        >★</button>
      ))}
    </div>
  );
}
