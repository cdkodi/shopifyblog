import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navigation } from '@/components/ui/navigation'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shopify Blog CMS',
  description: 'Comprehensive blog content management system for Shopify with SEO optimization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
} 