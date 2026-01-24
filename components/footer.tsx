"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/language-context"
import { Instagram, Twitter, Facebook, Mail } from "lucide-react"

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl font-bold mb-4">Wearo</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {t('footerTagline')}
            </p>
            <div className="flex gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                 className="w-9 h-9 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
                 className="w-9 h-9 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                 className="w-9 h-9 rounded-full bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold mb-4">{t('footerShop')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/store" className="hover:text-primary transition-colors">{t('allProducts')}</Link></li>
              <li><Link href="/store?category=clothing" className="hover:text-primary transition-colors">{t('clothing')}</Link></li>
              <li><Link href="/store?category=shoes" className="hover:text-primary transition-colors">{t('shoes')}</Link></li>
              <li><Link href="/store?category=accessories" className="hover:text-primary transition-colors">{t('accessories')}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">{t('footerCompany')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/seller/apply" className="hover:text-primary transition-colors">{t('becomeSeller')}</Link></li>
              <li><Link href="/about" className="hover:text-primary transition-colors">{t('aboutUs')}</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">{t('contactUs')}</Link></li>
              <li><Link href="/careers" className="hover:text-primary transition-colors">{t('careers')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">{t('footerLegal')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary transition-colors">{t('privacyPolicy')}</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">{t('termsOfService')}</Link></li>
              <li><a href="mailto:legal@wearo.com" className="hover:text-primary transition-colors flex items-center gap-1">
                <Mail className="w-3 h-3" />
                legal@wearo.com
              </a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2026 Wearo. {t('allRightsReserved')}</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-primary transition-colors">{t('privacy')}</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">{t('terms')}</Link>
            <Link href="/cookies" className="hover:text-primary transition-colors">{t('cookiePolicy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
