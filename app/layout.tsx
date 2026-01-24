import { Inter } from 'next/font/google'
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100`}>{children}</body>
    </html>
  )
}