"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Lock, Mail, Eye, EyeOff, Shield } from "lucide-react"
import bcrypt from "bcryptjs"
import FloatingParticles from "@/components/floating-particles"
import { Input } from "@/components/ui/input"

// ADMIN CREDENTIALS - DO NOT SHARE!
const ADMIN_USERNAME = "m3000"
const ADMIN_PASSWORD_HASH = "$2b$10$Y7PerECbK1trMPzSjpiUWu9UKQI3a9OFGz./ipdzcZoDFu/R1Kklm"
export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: credentials, 2: email code, 3: PIN
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [emailCode, setEmailCode] = useState("")
  const [pin, setPin] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  // Step 1: Verify username & password
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (username !== ADMIN_USERNAME) {
        setError("Gecersiz kullanici adi veya sifre!")
        setLoading(false)
        return
      }

      const isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
      if (!isPasswordValid) {
        setError("Gecersiz kullanici adi veya sifre!")
        setLoading(false)
        return
      }

      // Send verification code to email
      const response = await fetch('/api/admin/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })

      if (!response.ok) {
        throw new Error('Failed to send verification code')
      }

      setSuccess("Dogrulama kodu email adresinize gonderildi!")
      setStep(2)
    } catch (error) {
      console.error("Step 1 error:", error)
      setError("Bir hata olustu!")
    }

    setLoading(false)
  }

  // Step 2: Verify email code
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch('/api/admin/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code: emailCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      setSuccess("Email dogrulamasi basarili!")
      setStep(3)
    } catch (error) {
      console.error("Step 2 error:", error)
      setError("Bir hata olustu!")
    }

    setLoading(false)
  }

  // Step 3: Verify PIN
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch('/api/admin/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      // All verifications passed - create session
      const token = btoa(JSON.stringify({
        username,
        timestamp: Date.now(),
        hash: await bcrypt.hash(username + Date.now(), 10)
      }))

      localStorage.setItem("admin_token", token)
      localStorage.setItem("admin_user", JSON.stringify({ username: ADMIN_USERNAME, role: 'admin' }))

      setSuccess("Giris basarili! Yonlendiriliyorsunuz...")
      setTimeout(() => router.push("/admin/dashboard"), 1000)
    } catch (error) {
      console.error("Step 3 error:", error)
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
            <p className="text-muted-foreground">
              {step === 1 && "Adim 1/3: Kimlik Dogrulama"}
              {step === 2 && "Adim 2/3: Email Dogrulama"}
              {step === 3 && "Adim 3/3: PIN Kodu"}
            </p>
          </div>

          {/* Step 1: Username & Password */}
          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Kullanici Adi
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoComplete="off"
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
                  autoComplete="off"
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

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center"
              >
                {success}
              </motion.div>
            )}

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
                  Devam Et
                </>
              )}
            </button>
          </form>
          )}

          {/* Step 2: Email Verification */}
          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Dogrulama Kodu
                </label>
                <Input
                  type="text"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="6 haneli kod"
                  required
                  maxLength={6}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Email adresinize gonderilen 6 haneli kodu girin
                </p>
              </div>

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center"
                >
                  {success}
                </motion.div>
              )}

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
                    Dogrulanıyor...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Kodu Dogrula
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 3: PIN Verification */}
          {step === 3 && (
            <form onSubmit={handleStep3} className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Guvenlik PIN Kodu
                </label>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="4 haneli PIN"
                  required
                  maxLength={4}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  4 haneli guvenlik PIN kodunuzu girin
                </p>
              </div>

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center"
                >
                  {success}
                </motion.div>
              )}

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
                    Dogrulanıyor...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Giris Tamamla
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm">
            <p className="text-blue-500 font-semibold mb-2">🔒 3 Katmanlı Güvenlik:</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• 1. Kullanıcı adı + Şifre (bcrypt)</li>
              <li>• 2. Email dogrulama kodu (5 dakika gecerli)</li>
              <li>• 3. 4 haneli PIN kodu</li>
              <li>• Otomatik session timeout (24 saat)</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}