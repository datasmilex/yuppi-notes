'use client';

import { useEffect } from 'react';
import { initPwaInstall } from '../../utils/pwa';

export const PwaRegister = () => {
  useEffect(() => {
    initPwaInstall();
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      const register = () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW kaydı başarısız:', err);
        });
      };
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    } else {
      // Geliştirme modunda eski bir üretim service worker'ı bayat kod sunmasın
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    }
  }, []);

  return null;
};
