import { siteOrigin } from '@/lib/utils/site';
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/ui/providers';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'VoltSpace AI',
    title: 'VoltSpace AI — Understand your power. Control your bill.',
    description:
      'Private electricity bill analysis, energy intelligence and savings scenarios for Indian homes.',
  },
  twitter: { card: 'summary_large_image' },
  title: {
    default: 'VoltSpace AI — Understand your power. Control your bill.',
    template: '%s | VoltSpace AI',
  },
  description:
    'Understand electricity bills, estimate appliance consumption, and explore smarter energy habits. Built for Indian homes.',
  applicationName: 'VoltSpace AI',
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#10171c' };
const themeScript = `(function(){try{var t=localStorage.getItem('voltscope-theme')||'dark';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t}catch(e){document.documentElement.dataset.theme='dark'}})()`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
