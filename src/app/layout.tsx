import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-game',
});

export const metadata: Metadata = {
  title: 'Exploding Kittens',
  description: 'Play Exploding Kittens online with friends or against the computer!',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f0f23',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} font-[family-name:var(--font-game)] antialiased`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#e8e8f0',
              border: '1px solid #333355',
            },
          }}
        />
      </body>
    </html>
  );
}
