import type { Metadata, Viewport } from 'next';
import { Bungee, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const bodyFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-game',
});

const displayFont = Bungee({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Exploding Kittens Party Arena',
  description: 'A fast, social card showdown. Bluff, explode, emote, and survive with friends.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Exploding Kittens Party Arena',
    description: 'A fast, social card showdown. Bluff, explode, emote, and survive with friends.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Exploding Kittens Party Arena',
    description: 'A fast, social card showdown. Bluff, explode, emote, and survive with friends.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#110f1d',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} font-[family-name:var(--font-game)] antialiased`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#151126',
              color: '#f6f4ff',
              border: '1px solid #3a2f56',
            },
          }}
        />
      </body>
    </html>
  );
}
