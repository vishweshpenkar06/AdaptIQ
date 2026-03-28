import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-sans',
});
const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'AdaptIQ - Intelligent Learning System',
  description: 'AdaptIQ diagnoses why students fail by analyzing concept dependencies. Visualize your knowledge gaps on a graph and get AI-powered personalized learning paths.',
  generator: 'v0.app',
  keywords: ['education', 'learning', 'AI', 'knowledge graph', 'adaptive learning', 'personalized education', 'AdaptIQ'],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-background text-foreground">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
