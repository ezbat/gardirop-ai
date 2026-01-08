"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Menu, X, Search, Bell, User, LogOut, Plus, MessageCircle, Bookmark } from "lucide-react"
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
  ]

  return (
    <>
      <nav className="sticky top-0 z-40 glass border-b border-border backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* LOGO */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="font-serif text-xl font-bold hidden sm:block">Gardırop AI</span>
            </Link>

            {/* DESKTOP NAV LINKS */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* RIGHT ICONS */}
            <div className="flex items-center gap-2">

              {/* SEARCH - Direct link to search page */}
              <Link
                href="/search"
                className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors"
                title="Ara"
              >
                <Search className="w-5 h-5" />
              </Link>

              {session ? (
                <>
                  {/* CREATE POST */}
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors"
                    title="Yeni Gönderi"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  {/* MESSAGES */}
                  <Link
                    href="/messages"
                    className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors"
                    title="Mesajlar"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Link>

                  {/* SAVED/BOOKMARKS */}
                  <Link
                    href="/saved"
                    className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors"
                    title="Kaydedilenler"
                  >
                    <Bookmark className="w-5 h-5" />
                  </Link>

                  {/* NOTIFICATIONS */}
                  <Link
                    href="/notifications"
                    className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors"
                    title="Bildirimler"
                  >
                    <Bell className="w-5 h-5" />
                  </Link>

                  {/* PROFILE */}
                  <Link
                    href="/profile"
                    className="p-2 glass border border-border rounded-xl hover:border-primary transition-colors"
                    title="Profil"
                  >
                    <User className="w-5 h-5" />
                  </Link>

                  {/* LOGOUT */}
                  <button
                    onClick={() => signOut()}
                    className="p-2 glass border border-border rounded-xl hover:border-red-500 hover:text-red-500 transition-colors"
                    title="Çıkış"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                /* LOGIN BUTTON */
                <Link
                  href="/api/auth/signin"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Giriş Yap
                </Link>
              )}

              {/* MOBILE MENU TOGGLE */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 glass border border-border rounded-xl"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                {/* SEARCH LINK FOR MOBILE */}
                <Link
                  href="/search"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors"
                >
                  Ara
                </Link>
                {session && (
                  <>
                    {/* SAVED LINK FOR MOBILE */}
                    <Link
                      href="/saved"
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors"
                    >
                      Kaydedilenler
                    </Link>
                    {/* MESSAGES LINK FOR MOBILE */}
                    <Link
                      href="/messages"
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 glass rounded-xl hover:border-primary transition-colors"
                    >
                      Mesajlar
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* CREATE POST MODAL */}
      <CreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSuccess={() => {
          setShowCreatePost(false)
          if (window.location.pathname === '/explore') {
            window.location.reload()
          }
        }}
      />
    </>
  )
}