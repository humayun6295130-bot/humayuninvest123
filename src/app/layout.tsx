import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'AscendFolio',
  description: 'Premium investment platform for strategic wealth growth',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-off-white text-charcoal">
        <FirebaseProvider>
          {children}
          <Toaster />
        </FirebaseProvider>
      </body>
    </html>
  );
}
