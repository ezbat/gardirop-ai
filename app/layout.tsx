import type { Metadata } from "next"
import "@fontsource-variable/inter"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import CookieConsent from "@/components/cookie-consent"
import SupportChat from "@/components/support-chat"
import OnboardingGuard from "@/components/onboarding-guard"
import { PageTransitionProvider } from "@/lib/page-transition-context"
import TransitionWrapper from "@/components/transition-wrapper"
import NavHeader from "@/components/nav-header"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import Footer from "@/components/footer"
import { LanguageProvider } from '@/lib/language-context'
import { CurrencyProvider } from '@/lib/currency-context'
import SessionWrapper from "@/components/session-wrapper"


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
      <body className="font-sans antialiased" style={{ background: 'var(--lux-bg)' }}>
        <SessionWrapper>
          <ThemeProvider attribute="class" defaultTheme="dark">
            <LanguageProvider>
              <CurrencyProvider>
                <OnboardingGuard>
                  <div className="relative min-h-screen flex flex-col" style={{ background: 'var(--lux-bg)', color: 'var(--text-primary)' }}>
                    <PageTransitionProvider>
                      <NavHeader />
                      <TransitionWrapper>{children}</TransitionWrapper>
                      <Footer />
                      <MobileBottomNav />
                    </PageTransitionProvider>
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
