'use client'

/**
 * AuthModal — Modal-first authentication prompt
 *
 * Usage:
 *   import { useAuthModal } from '@/components/auth-modal'
 *
 *   const { requireAuth, AuthModal } = useAuthModal()
 *
 *   // In an onClick handler:
 *   const handleAction = () => {
 *     if (!requireAuth()) return   // shows modal if not logged in
 *     doProtectedAction()
 *   }
 *
 *   // In JSX:
 *   <AuthModal />
 */

import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { X, LogIn, Mail, Lock, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthModalContextValue {
  /** Returns true if user IS authenticated. Shows modal and returns false if not. */
  requireAuth: (message?: string) => boolean
  /** Imperatively open the auth modal */
  openAuthModal: (message?: string) => void
  /** Close the modal */
  closeAuthModal: () => void
}

const AuthModalContext = createContext<AuthModalContextValue>({
  requireAuth: () => false,
  openAuthModal: () => {},
  closeAuthModal: () => {},
})

export function useAuthModal() {
  return useContext(AuthModalContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const requireAuth = useCallback((msg?: string): boolean => {
    if (session?.user) return true
    setMessage(msg || 'Melde dich an, um fortzufahren.')
    setOpen(true)
    return false
  }, [session])

  const openAuthModal = useCallback((msg?: string) => {
    setMessage(msg || 'Melde dich an, um fortzufahren.')
    setOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => setOpen(false), [])

  return (
    <AuthModalContext.Provider value={{ requireAuth, openAuthModal, closeAuthModal }}>
      {children}
      <AuthModalOverlay open={open} message={message} onClose={() => setOpen(false)} />
    </AuthModalContext.Provider>
  )
}

// ─── Modal Overlay ────────────────────────────────────────────────────────────

function AuthModalOverlay({
  open,
  message,
  onClose,
}: {
  open: boolean
  message: string
  onClose: () => void
}) {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })

      if (result?.error) {
        setError('E-Mail oder Passwort ist falsch.')
        setLoading(false)
        return
      }

      // Success — close modal and refresh
      onClose()
      router.refresh()
    } catch {
      setError('Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
      setLoading(false)
    }
  }

  const handleGoogle = () => {
    signIn('google', { callbackUrl: window.location.pathname })
  }

  const handleFullPage = () => {
    onClose()
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="w-full max-w-[400px] rounded-2xl overflow-hidden"
              style={{
                background: 'var(--lux-layer-1, #141416)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #D97706, #F59E0B)' }}
                  >
                    <LogIn className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
                      Anmelden
                    </h2>
                    <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.50)' }}>
                      {message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                >
                  <X className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.50)' }} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 pt-4 pb-2 space-y-3">
                {error && (
                  <div
                    className="px-3 py-2 rounded-lg text-[13px]"
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      color: '#FCA5A5',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="E-Mail"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[14px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  />
                </div>

                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  />
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Passwort"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[14px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.92)',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #D97706, #F59E0B)',
                    color: '#fff',
                  }}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Wird angemeldet…</>
                  ) : (
                    'Anmelden'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 px-6 py-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>oder</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
              </div>

              {/* Google + full page */}
              <div className="px-6 pb-6 space-y-2">
                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Mit Google fortfahren
                </button>

                <button
                  type="button"
                  onClick={handleFullPage}
                  className="w-full py-2 text-[12px] transition-colors"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  Registrieren oder Passwort vergessen →
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
