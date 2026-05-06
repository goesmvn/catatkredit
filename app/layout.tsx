import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/layout/BottomNav'
import { AuthProvider } from '@/lib/auth'
import AuthGuard from '@/components/layout/AuthGuard'
import SyncProvider from '@/components/SyncProvider'

export const metadata: Metadata = {
  title: 'CatatKredit - Pencatatan Kredit Pelanggan',
  description: 'Aplikasi pencatatan hutang dan kredit pelanggan toko yang mudah digunakan',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CatatKredit',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B6CA8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: '"Inter", sans-serif' }}>
        <AuthProvider>
          <AuthGuard>
            <SyncProvider>
              <div className="app-container">
                <BottomNav />
                <main className="main-content">
                  {children}
                </main>
              </div>
            </SyncProvider>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
