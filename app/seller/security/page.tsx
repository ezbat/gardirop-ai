"use client"

import { useState } from "react"
import {
  Lock, Shield, ShieldCheck, Smartphone, Monitor, MapPin,
  Key, Wifi, Plus, Trash2, Eye, EyeOff, Clock,
  CheckCircle2, XCircle, AlertTriangle, Globe
} from "lucide-react"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const RED = "oklch(0.7 0.15 25)"
const GOLD = "oklch(0.78 0.14 85)"

interface Session { id: number; device: string; icon: any; location: string; ip: string; lastActive: string; current: boolean }
interface LoginEntry { id: number; date: string; ip: string; device: string; location: string; success: boolean }

const mockSessions: Session[] = [
  { id: 1, device: "Chrome auf Windows", icon: Monitor, location: "Berlin, DE", ip: "192.168.1.***", lastActive: "Jetzt aktiv", current: true },
  { id: 2, device: "Safari auf iPhone", icon: Smartphone, location: "Berlin, DE", ip: "10.0.0.***", lastActive: "Vor 2 Std.", current: false },
  { id: 3, device: "Firefox auf MacOS", icon: Monitor, location: "München, DE", ip: "172.16.0.***", lastActive: "Vor 1 Tag", current: false },
]

const mockLogins: LoginEntry[] = [
  { id: 1, date: "14.02.2026, 15:32", ip: "192.168.1.100", device: "Chrome / Windows", location: "Berlin", success: true },
  { id: 2, date: "14.02.2026, 09:15", ip: "10.0.0.55", device: "Safari / iOS", location: "Berlin", success: true },
  { id: 3, date: "13.02.2026, 22:41", ip: "85.214.132.45", device: "Firefox / MacOS", location: "München", success: true },
  { id: 4, date: "13.02.2026, 18:03", ip: "203.45.67.89", device: "Chrome / Linux", location: "Shanghai, CN", success: false },
  { id: 5, date: "12.02.2026, 11:22", ip: "192.168.1.100", device: "Chrome / Windows", location: "Berlin", success: true },
  { id: 6, date: "11.02.2026, 08:55", ip: "45.67.89.123", device: "Unknown", location: "Moskau, RU", success: false },
  { id: 7, date: "10.02.2026, 16:40", ip: "10.0.0.55", device: "Safari / iOS", location: "Berlin", success: true },
]

export default function SecurityPage() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(true)
  const [twoFAMethod, setTwoFAMethod] = useState<"app" | "sms">("app")
  const [sessions, setSessions] = useState(mockSessions)
  const [showPassword, setShowPassword] = useState(false)
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false)
  const [whitelistedIPs, setWhitelistedIPs] = useState(["192.168.1.0/24", "10.0.0.0/8"])
  const [newIP, setNewIP] = useState("")

  const securityScore = twoFAEnabled ? (ipWhitelistEnabled ? 95 : 75) : (ipWhitelistEnabled ? 60 : 40)
  const scoreColor = securityScore >= 80 ? GREEN : securityScore >= 60 ? GOLD : RED

  const revokeSession = (id: number) => setSessions(prev => prev.filter(s => s.id !== id))
  const addIP = () => {
    if (newIP.trim() && !whitelistedIPs.includes(newIP.trim())) {
      setWhitelistedIPs(prev => [...prev, newIP.trim()])
      setNewIP("")
    }
  }
  const removeIP = (ip: string) => setWhitelistedIPs(prev => prev.filter(i => i !== ip))

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${PURPLE} 15%, transparent)` }}>
              <Lock className="w-5 h-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sicherheitseinstellungen</h1>
              <p className="text-sm text-muted-foreground">Schützen Sie Ihr Konto mit erweiterten Sicherheitsfunktionen</p>
            </div>
          </div>
        </div>

        {/* Security Score + 2FA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="seller-card p-6 flex flex-col items-center justify-center">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">Sicherheitsscore</h2>
            <div className="relative w-32 h-32 mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.2 0 0)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeDasharray={`${securityScore * 2.64} ${264 - securityScore * 2.64}`}
                  strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: scoreColor }}>{securityScore}</span>
                <span className="text-xs text-muted-foreground">von 100</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: `color-mix(in oklch, ${scoreColor} 12%, transparent)`, color: scoreColor }}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {securityScore >= 80 ? "Sehr gut" : securityScore >= 60 ? "Gut" : "Verbesserungsbedarf"}
            </div>
          </div>

          <div className="seller-card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" style={{ color: PURPLE }} />
                <h2 className="text-base font-bold">Zwei-Faktor-Authentifizierung</h2>
              </div>
              <button onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                className="relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer"
                style={{ backgroundColor: twoFAEnabled ? GREEN : "oklch(0.35 0 0)" }}>
                <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300"
                  style={{ left: twoFAEnabled ? "26px" : "2px" }} />
              </button>
            </div>
            {twoFAEnabled ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">Wählen Sie Ihre bevorzugte 2FA-Methode:</p>
                {([{ key: "app" as const, label: "Authenticator App", desc: "Google Authenticator, Authy oder 1Password", icon: Smartphone },
                  { key: "sms" as const, label: "SMS-Verifizierung", desc: "Code per SMS an Ihre Handynummer", icon: Smartphone }]).map(method => (
                  <button key={method.key} onClick={() => setTwoFAMethod(method.key)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                    style={{
                      background: twoFAMethod === method.key ? `color-mix(in oklch, ${PURPLE} 10%, transparent)` : "oklch(0.15 0.01 260)",
                      border: `1px solid ${twoFAMethod === method.key ? PURPLE : "oklch(0.2 0 0)"}`,
                    }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklch, ${PURPLE} 15%, transparent)` }}>
                      <method.icon className="w-5 h-5" style={{ color: PURPLE }} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-semibold">{method.label}</p>
                      <p className="text-xs text-muted-foreground">{method.desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: twoFAMethod === method.key ? PURPLE : "oklch(0.3 0 0)" }}>
                      {twoFAMethod === method.key && <div className="w-2.5 h-2.5 rounded-full" style={{ background: PURPLE }} />}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl flex items-center gap-3"
                style={{ background: `color-mix(in oklch, ${RED} 8%, transparent)`, border: `1px solid color-mix(in oklch, ${RED} 20%, transparent)` }}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: RED }} />
                <p className="text-sm" style={{ color: RED }}>2FA ist deaktiviert. Wir empfehlen dringend, diese Funktion zu aktivieren.</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Sessions */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-5 h-5" style={{ color: GREEN }} />
            <h2 className="text-base font-bold">Aktive Sitzungen</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `color-mix(in oklch, ${GREEN} 12%, transparent)`, color: GREEN }}>{sessions.length}</span>
          </div>
          <div className="space-y-3">
            {sessions.map(session => {
              const Icon = session.icon
              return (
                <div key={session.id} className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200"
                  style={{ background: session.current ? `color-mix(in oklch, ${GREEN} 6%, transparent)` : "oklch(0.14 0.01 260)", border: `1px solid ${session.current ? `color-mix(in oklch, ${GREEN} 20%, transparent)` : "oklch(0.2 0 0)"}` }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklch, ${PURPLE} 12%, transparent)` }}>
                    <Icon className="w-5 h-5" style={{ color: PURPLE }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{session.device}</p>
                      {session.current && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: GREEN, color: "#fff" }}>Aktuell</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{session.location}</span>
                      <span>{session.ip}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.lastActive}</span>
                    </div>
                  </div>
                  {!session.current && (
                    <button onClick={() => revokeSession(session.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                      style={{ background: `color-mix(in oklch, ${RED} 10%, transparent)`, color: RED, border: `1px solid color-mix(in oklch, ${RED} 20%, transparent)` }}>
                      Widerrufen
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Login History + Password */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="seller-card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-5 h-5" style={{ color: PURPLE }} />
              <h2 className="text-base font-bold">Anmeldeverlauf</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b" style={{ borderColor: "oklch(0.2 0 0)" }}>
                    <th className="text-left py-3 pr-4">Datum</th>
                    <th className="text-left py-3 pr-4">IP</th>
                    <th className="text-left py-3 pr-4">Gerät</th>
                    <th className="text-left py-3 pr-4">Ort</th>
                    <th className="text-right py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockLogins.map(login => (
                    <tr key={login.id} className="border-b transition-colors duration-200 hover:bg-white/[0.02]" style={{ borderColor: "oklch(0.15 0 0)" }}>
                      <td className="py-3 pr-4 text-xs">{login.date}</td>
                      <td className="py-3 pr-4 text-xs font-mono">{login.ip}</td>
                      <td className="py-3 pr-4 text-xs">{login.device}</td>
                      <td className="py-3 pr-4 text-xs">{login.location}</td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: login.success ? `color-mix(in oklch, ${GREEN} 12%, transparent)` : `color-mix(in oklch, ${RED} 12%, transparent)`, color: login.success ? GREEN : RED }}>
                          {login.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {login.success ? "Erfolg" : "Fehlgeschlagen"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="seller-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Key className="w-5 h-5" style={{ color: GOLD }} />
              <h2 className="text-base font-bold">Passwort ändern</h2>
            </div>
            <div className="space-y-4">
              {["Aktuelles Passwort", "Neues Passwort", "Passwort bestätigen"].map((label, i) => (
                <div key={i}>
                  <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                      className="w-full px-3 py-2.5 rounded-lg text-sm border-0 outline-none pr-10"
                      style={{ background: "oklch(0.14 0.01 260)" }} />
                    {i === 0 && (
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity duration-200 hover:opacity-90"
                style={{ background: PURPLE, color: "#fff" }}>
                Passwort aktualisieren
              </button>
            </div>
          </div>
        </div>

        {/* IP Whitelist */}
        <div className="seller-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5" style={{ color: GREEN }} />
              <h2 className="text-base font-bold">IP-Whitelist</h2>
            </div>
            <button onClick={() => setIpWhitelistEnabled(!ipWhitelistEnabled)}
              className="relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer"
              style={{ backgroundColor: ipWhitelistEnabled ? GREEN : "oklch(0.35 0 0)" }}>
              <div className="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300"
                style={{ left: ipWhitelistEnabled ? "26px" : "2px" }} />
            </button>
          </div>
          {ipWhitelistEnabled ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-3">Nur die folgenden IP-Adressen haben Zugriff auf Ihr Konto:</p>
              {whitelistedIPs.map(ip => (
                <div key={ip} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: "oklch(0.14 0.01 260)" }}>
                  <span className="text-sm font-mono">{ip}</span>
                  <button onClick={() => removeIP(ip)} className="text-muted-foreground hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="flex gap-2 mt-3">
                <input value={newIP} onChange={e => setNewIP(e.target.value)} placeholder="z.B. 192.168.1.0/24"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm border-0 outline-none" style={{ background: "oklch(0.14 0.01 260)" }}
                  onKeyDown={e => e.key === "Enter" && addIP()} />
                <button onClick={addIP} className="px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ background: GREEN, color: "#fff" }}><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: `color-mix(in oklch, ${GOLD} 8%, transparent)`, border: `1px solid color-mix(in oklch, ${GOLD} 20%, transparent)` }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: GOLD }} />
              <p className="text-xs" style={{ color: GOLD }}>IP-Whitelist ist deaktiviert. Zugriff von jeder IP-Adresse möglich.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
