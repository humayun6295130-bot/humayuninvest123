import type { Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider } from '@/firebase';
import { buildRootMetadata } from '@/lib/site-brand';

export const metadata = buildRootMetadata();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" />
        {/* Inter + Cabinet Grotesk load via globals.css @import (avoids duplicate @next/next/no-page-custom-font) */}
      </head>
      <body suppressHydrationWarning className="antialiased bg-background text-foreground">
        <FirebaseProvider>
          {children}
          <Toaster />
        </FirebaseProvider>
      </body>
    </html>
  );
}
