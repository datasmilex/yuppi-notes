import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ subsets: ['latin', 'latin-ext'], weight: ['400', '600', '700', '800'], display: 'swap' });

export const metadata = {
  title: 'Dertleş',
  description: 'Anonim, kayıtsız ve sıcak bir sohbet. İçini dökmek istediğinde biri seni dinlesin.',
  icons: { icon: '/icon.svg' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F6EFE4',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
