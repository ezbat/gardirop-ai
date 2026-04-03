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
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { AuthModalProvider } from "@/components/auth-modal"


export const metadata: Metadata = {
  title: {
    default: "Wearo - Dein Store. Dein Link.",
    template: "%s | Wearo"
  },
  description: "Erstelle deinen eigenen Store in Minuten. Verkaufe direkt über deinen Link — ohne Code, ohne Limit.",
  keywords: ["Store erstellen", "Online-Shop", "Creator Store", "Link-in-Bio Shop", "Verkaufen", "E-Commerce", "Mode"],
  authors: [{ name: "Wearo Team" }],
  creator: "Wearo",
  publisher: "Wearo",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://wearo.de'),
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://wearo.de',
    title: 'Wearo - Dein Store. Dein Link.',
    description: 'Erstelle deinen eigenen Store in Minuten. Verkaufe direkt über deinen Link.',
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
    title: 'Wearo - Dein Store. Dein Link.',
    description: 'Erstelle deinen eigenen Store in Minuten. Verkaufe direkt über deinen Link.',
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
                <AuthModalProvider>
                <OnboardingGuard>
                  <ErrorBoundary>
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
                  </ErrorBoundary>
                </OnboardingGuard>
                </AuthModalProvider>
              </CurrencyProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}
