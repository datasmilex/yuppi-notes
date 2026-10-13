import type { Metadata, Viewport } from 'next';
import './globals.css';
import { UserProvider } from '../context/UserContext';
import { NotesProvider } from '../context/NotesContext';
import { ToastProvider } from '../components/Common/Toast';
import { PwaRegister } from '../components/Common/PwaRegister';
import { ThemeProvider } from '../context/ThemeContext';
import { UIProvider } from '../context/UIContext';
import { ConfirmProvider } from '../components/Common/Confirm';

export const metadata: Metadata = {
  title: 'YuPPi Notes - Cıvıl Cıvıl Post-it Pano',
  description:
    'Renkli, canlı, zengin metinli ve fotoğraflı gerçek zamanlı not panosu. Hatırlatıcılar, şablonlar, arşiv ve sürüm geçmişiyle. Web, Mobil ve Masaüstü.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    title: 'YuPPi Notes',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#F5F0E6',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Tema, sayfa boyanmadan önce uygulanır (açılışta yanlış tema titreşmesin)
const THEME_BOOT = `try{var t=localStorage.getItem('yuppi_theme');if(t==='system'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'beige'}if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" data-theme="beige" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <PwaRegister />
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <UserProvider>
                <UIProvider>
                  <NotesProvider>{children}</NotesProvider>
                </UIProvider>
              </UserProvider>
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
