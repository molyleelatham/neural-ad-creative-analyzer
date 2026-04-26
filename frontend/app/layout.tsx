import './v3-globals.css'
import type { Metadata } from 'next'
import { Inter, Newsreader, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  style: ['normal', 'italic'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Arcanalytics — Ad Intelligence Platform',
  description: 'Know what your ad does to the brain — before you spend. Computer vision + neural encoder predicts viewer response.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
