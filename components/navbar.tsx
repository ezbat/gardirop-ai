"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Menu, X, Search, User, LogOut, Plus, MessageCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import CreatePostModal from "./create-post-modal"

export default function Navbar() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)

  const navLinks = [
    { href: "/", label: "Ana Sayfa" },
    { href: "/wardrobe", label: "Gardırop" },
    { href: "/explore", label: "Keşfet" },
    { href: "/store", label: "Mağaza" },
    { href: "/admin/sellers", label: "Admin" },
  ]

  return (
    <>
      <nav className="sticky top-0 z-40 glass border-b border-border backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="font-serif text-xl font-bold hidden sm:block">Gardırop AI</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium hover:text-primary transition-colors">{link.label}</Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/search" className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors" title="Ara"><Search className="w-5 h-5" /></Link>
              {session ? (
                <>
                  <button onClick={() => setShowCreatePost(true)} className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors" title="Yeni Gönderi"><Plus className="w-5 h-5" /></button>
                  <Link href="/messages" className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors" title="Mesajlar"><MessageCircle className="w-5 h-5" /></Link>
                  <Link href="/profile" className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors" title="Profil"><User className="w-5 h-5" /></Link>
                  <button onClick={() => signOut()} className="p-2 glass border border-border rounded-xl hover:border-red-500 hover:text-red-500 transition-colors" title="Çıkış"><LogOut className="w-5 h-5" /></button>
                </>
              ) : (
                <Link href="/auth/signin" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">Giriş Yap</Link>
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
                <Link href="/search" onClick={() => setIsOpen(false)} className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors">Ara</Link>
                {session && (<Link href="/messages" onClick={() => setIsOpen(false)} className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors">Mesajlar</Link>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <CreatePostModal isOpen={showCreatePost} onClose={() => setShowCreatePost(false)} onSuccess={() => { setShowCreatePost(false); if (window.location.pathname === '/explore') { window.location.reload() } }} />
    </>
  )
}