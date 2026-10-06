'use client';

import { useEffect } from 'react';

export const PwaRegister = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.log('SW registration failed: ', err);
        });
      });
    }
  }, []);

  return null;
};
