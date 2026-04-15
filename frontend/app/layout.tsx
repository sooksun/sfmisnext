import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = localFont({
  src: [
    { path: '../public/fonts/Inter-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/Inter-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../public/fonts/Inter-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../public/fonts/Inter-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-inter',
})

const notoSansThai = localFont({
  src: [
    { path: '../public/fonts/NotoSansThai-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/NotoSansThai-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../public/fonts/NotoSansThai-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../public/fonts/NotoSansThai-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-thai',
})

export const metadata: Metadata = {
  title: 'SFMIS - ระบบบริหารจัดการการเงินโรงเรียน',
  description: 'School Financial Management Information System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${inter.variable} ${notoSansThai.variable} font-sans antialiased bg-gray-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
