import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Mon Tournoi - Plateforme eSport",
  description: "Créez et gérez vos tournois eSport facilement",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  )
}
