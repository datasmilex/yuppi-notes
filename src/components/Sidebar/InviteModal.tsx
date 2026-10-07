'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import { copyText } from '../../utils/text';
import { X, Copy, Check, Smartphone, Wifi } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
  const { getInviteLink, currentRoomId, isConnected } = useNotes();
  const { showToast } = useToast();
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setQr('');
    (async () => {
      const link = await getInviteLink();
      if (cancelled) return;
      setUrl(link);
      try {
        const dataUrl = await QRCode.toDataURL(link, {
          margin: 1,
          width: 240,
          color: { dark: '#1c1814', light: '#ffffff' },
        });
        if (!cancelled) setQr(dataUrl);
      } catch {
        // QR üretilemezse bağlantı yine kopyalanabilir
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, getInviteLink]);

  if (!isOpen) return null;

  const isLocalhost = /\/\/(localhost|127\.0\.0\.1)/.test(url);

  const handleCopy = async () => {
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      showToast('Davet bağlantısı kopyalandı! 🔗', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Kopyalanamadı; bağlantıyı elle seçip kopyalayın.', 'error');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 animate-scale-in"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-purple-100 text-purple-700">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Telefonda Aç / Davet Et</h3>
              <p className="text-xs text-gray-500">
                Oda: <strong className="text-purple-700">{currentRoomId}</strong> ·{' '}
                {isConnected ? 'Canlı' : 'Bağlanıyor...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <div className="w-[240px] h-[240px] rounded-2xl bg-white border border-black/10 shadow-xs flex items-center justify-center overflow-hidden">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Davet QR kodu" width={240} height={240} />
            ) : (
              <span className="text-xs font-semibold text-gray-400">QR hazırlanıyor...</span>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mb-3 leading-relaxed flex items-start gap-1.5 justify-center">
          <Wifi className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Telefonun kamerasıyla QR kodu okut. Cihazlar aynı Wi-Fi ağında olmalıdır.</span>
        </p>

        {isLocalhost && (
          <p className="text-[11px] font-semibold text-amber-800 bg-amber-100 rounded-xl px-3 py-2 mb-3">
            Yerel ağ adresi bulunamadı; bu bağlantı yalnızca bu bilgisayarda çalışır.
          </p>
        )}

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700 outline-hidden"
          />
          <button
            onClick={handleCopy}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
        </div>
      </div>
    </div>
  );
};
