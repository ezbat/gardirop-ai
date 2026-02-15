import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import CookieConsent from "@/components/cookie-consent"
import SupportChat from "@/components/support-chat"
import SwipeNavigationProvider from "@/components/swipe-navigation/SwipeNavigationProvider"
import SwipeNavigator from "@/components/swipe-navigation/SwipeNavigator"
import EdgeIndicators from "@/components/swipe-navigation/EdgeIndicators"
import SwipeTutorialOverlay from "@/components/swipe-navigation/SwipeTutorialOverlay"
import CreateGestureButton from "@/components/swipe-navigation/CreateGestureButton"
import OnboardingGuard from "@/components/onboarding-guard"
import Footer from "@/components/footer"
import { LanguageProvider } from '@/lib/language-context'
import { CurrencyProvider } from '@/lib/currency-context'
import SessionWrapper from "@/components/session-wrapper"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: {
    default: "Wearo - KI-gestützte Mode-Plattform",
    template: "%s | Wearo"
  },
  description: "Moderne, luxuriöse und benutzerfreundliche E-Commerce-Plattform. KI-gestützte Modeempfehlungen, Outfit-Erstellung und sicheres Einkaufserlebnis.",
  keywords: ["Mode", "E-Commerce", "Online-Shopping", "Kleidung", "Schuhe", "Accessoires", "Outfit", "KI Mode"],
  authors: [{ name: "Wearo Team" }],
  creator: "Wearo",
  publisher: "Wearo",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://wearo.de'),
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://wearo.de',
    title: 'Wearo - KI-gestützte Mode-Plattform',
    description: 'Moderne, luxuriöse und benutzerfreundliche E-Commerce-Plattform.',
    siteName: 'Wearo',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Wearo',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wearo - KI-gestützte Mode-Plattform',
    description: 'Moderne, luxuriöse und benutzerfreundliche E-Commerce-Plattform.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionWrapper>
          <ThemeProvider attribute="class" defaultTheme="dark">
            <LanguageProvider>
              <CurrencyProvider>
                <OnboardingGuard>
                  <div className="relative min-h-screen bg-background flex flex-col">
                    <SwipeNavigationProvider>
                      <SwipeNavigator>
                        <main className="flex-1">{children}</main>
                        <Footer />
                      </SwipeNavigator>
                      <EdgeIndicators />
                      <SwipeTutorialOverlay />
                      <CreateGestureButton />
                    </SwipeNavigationProvider>
                    <CookieConsent />
                    <SupportChat />
                  </div>
                </OnboardingGuard>
              </CurrencyProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}