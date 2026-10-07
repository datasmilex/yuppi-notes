import type { Metadata, Viewport } from 'next';
import './globals.css';
import { UserProvider } from '../context/UserContext';
import { NotesProvider } from '../context/NotesContext';
import { ToastProvider } from '../components/Common/Toast';
import { PwaRegister } from '../components/Common/PwaRegister';
import { ThemeProvider } from '../context/ThemeContext';

export const metadata: Metadata = {
  title: 'YuPPi Notes - Cıvıl Cıvıl Post-it Pano',
  description:
    'Renkli, canlı, zengin metinli ve fotoğraflı gerçek zamanlı not panosu. Web, Mobil ve Masaüstü.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" data-theme="beige" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('yuppi_theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
      </head>
      <body>
        <PwaRegister />
        <ThemeProvider>
          <ToastProvider>
            <UserProvider>
              <NotesProvider>{children}</NotesProvider>
            </UserProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
