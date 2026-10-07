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
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#FAF5FF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" data-theme="beige" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
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
          <UserProvider>
            <NotesProvider>
              <ToastProvider>{children}</ToastProvider>
            </NotesProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
