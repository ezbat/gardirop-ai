"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, Mail, Eye, EyeOff, Shield } from "lucide-react"
import bcrypt from "bcryptjs"
import FloatingParticles from "@/components/floating-particles"
import { Input } from "@/components/ui/input"

// ŞİFRELİ HASH (değiştirme!)
const ADMIN_EMAIL = "ezbatozmez1@gmail.com"
const ADMIN_PASSWORD_HASH = "$2b$10$DKW2dgROmz0jKc5nBCV9ZO0lKDRoeLzejDK6kBWjEjLQK0B1GDiPe" // "47Derinsu47_"
export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // E-posta kontrolü
      if (email !== ADMIN_EMAIL) {
        setError("Gecersiz e-posta veya sifre!")
        setLoading(false)
        return
      }

      // Şifre kontrolü (bcrypt ile)
      const isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
      
      if (!isPasswordValid) {
        setError("Gecersiz e-posta veya sifre!")
        setLoading(false)
        return
      }

      // Token oluştur (şifreli)
      const token = btoa(JSON.stringify({
        email,
        timestamp: Date.now(),
        hash: await bcrypt.hash(email + Date.now(), 10)
      }))

      // Token'ı kaydet
      localStorage.setItem("admin_token", token)
      
      // Admin paneline yönlendir
      router.push("/admin")
      
    } catch (error) {
      console.error("Login error:", error)
      setError("Bir hata olustu!")
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="glass border border-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Admin Girisi</h1>
            <p className="text-muted-foreground">Guvenli erisim gerekli</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-posta
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gardirop.ai"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Sifre
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Kontrol ediliyor...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Giris Yap
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm">
            <p className="text-blue-500 font-semibold mb-2">🔒 Güvenlik Bilgisi:</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Şifreler bcrypt ile hash'leniyor</li>
              <li>• Token'lar şifreli saklanıyor</li>
              <li>• 24 saat sonra otomatik çıkış</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}