import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"
// import { Providers } from "@/components/providers"  ← BU SATIRI SİL
import { LanguageProvider } from '@/lib/language-context'
import SessionWrapper from "@/components/session-wrapper"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Gardırop AI - Premium Virtual Wardrobe",
  description: "AI-powered wardrobe management",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionWrapper>
          <ThemeProvider attribute="class" defaultTheme="dark">
            <LanguageProvider>
              <div className="relative min-h-screen bg-background">
                <Navbar />
                <main>{children}</main>
              </div>
            </LanguageProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}