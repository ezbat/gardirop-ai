"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Menu, X, Search, User, LogOut, Plus, MessageCircle, Languages } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import CreatePostModal from "./create-post-modal"
import { useLanguage } from "@/lib/language-context"

export default function Navbar() {
  const { data: session } = useSession()
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)

  const navLinks = [
    { href: "/", label: t('home') },
    { href: "/wardrobe", label: t('wardrobe') },
    { href: "/explore", label: t('explore') },
    { href: "/store", label: t('store') },
    { href: "/admin/sellers", label: "Admin" },
  ]

  const languages = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ]

  const currentLang = languages.find(l => l.code === language)

  return (
    <>
      <nav className="sticky top-0 z-40 glass border-b border-border backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <span className="text-white font-bold text-xl">W</span>
              </div>
              <span className="font-serif text-xl font-bold hidden sm:block">{t('appName')}</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium hover:text-primary transition-colors">{link.label}</Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors flex items-center gap-1"
                  title={t('settings')}
                >
                  <span className="text-lg">{currentLang?.flag}</span>
                  <Languages className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showLangMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-40 glass border border-border rounded-xl shadow-lg overflow-hidden"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code as 'tr' | 'en' | 'de')
                            setShowLangMenu(false)
                          }}
                          className={`w-full px-4 py-2 flex items-center gap-2 hover:bg-primary/10 transition-colors text-left ${
                            language === lang.code ? 'bg-primary/5 text-primary font-semibold' : ''
                          }`}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-sm">{lang.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/search" className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors" title={t('search')}><Search className="w-5 h-5" /></Link>
              {session ? (
                <>
                  <button onClick={() => setShowCreatePost(true)} className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors" title={t('newOutfit')}><Plus className="w-5 h-5" /></button>
                  <Link href="/messages" className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors" title={t('messages')}><MessageCircle className="w-5 h-5" /></Link>
                  <Link href="/profile" className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors" title={t('profile')}><User className="w-5 h-5" /></Link>
                  <button onClick={() => signOut()} className="p-2 glass border border-border rounded-xl hover:border-red-500 hover:text-red-500 transition-colors" title={t('logout')}><LogOut className="w-5 h-5" /></button>
                </>
              ) : (
                <Link href="/auth/signin" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">{t('login')}</Link>
              )}
              <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 glass border border-border rounded-xl">{isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden border-t border-border overflow-hidden">
              <div className="container mx-auto px-4 py-4 space-y-2">
                {navLinks.map((link) => (<Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors">{link.label}</Link>))}
                <Link href="/search" onClick={() => setIsOpen(false)} className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors">{t('search')}</Link>
                {session && (<Link href="/messages" onClick={() => setIsOpen(false)} className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors">{t('messages')}</Link>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <CreatePostModal isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} onSuccess={() => { setShowCreatePost(false); if (window.location.pathname === '/explore') { window.location.reload() } }} />
    </>
  )
}
