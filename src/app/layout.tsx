import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dermal Skin Clinic and Spa Guam - Book Your Appointment',
  description: 'Book your spa appointment at Dermal Skin Clinic and Spa Guam. Professional facials, massages, treatments, and waxing services.',
  keywords: 'spa, facial, massage, waxing, Guam, booking, appointment',
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
          {children}
        </div>
      </body>
    </html>
  )
} 