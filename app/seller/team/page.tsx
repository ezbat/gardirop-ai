"use client"

import { useState } from "react"
import {
  UserCog, Users, UserPlus, Mail, Shield, ShieldCheck,
  Clock, Search, MoreVertical, CheckCircle2, XCircle,
  Package, Headphones, Truck, Calculator, Crown
} from "lucide-react"

const PURPLE = "oklch(0.65 0.15 250)"
const GREEN = "oklch(0.72 0.19 145)"
const GOLD = "oklch(0.78 0.14 85)"

type Role = "admin" | "produktmanager" | "kundenservice" | "versand" | "buchhaltung"

const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: any }> = {
  admin: { label: "Admin", color: PURPLE, icon: Crown },
  produktmanager: { label: "Produktmanager", color: GREEN, icon: Package },
  kundenservice: { label: "Kundenservice", color: GOLD, icon: Headphones },
  versand: { label: "Versand", color: "oklch(0.7 0.18 55)", icon: Truck },
  buchhaltung: { label: "Buchhaltung", color: "oklch(0.65 0.18 260)", icon: Calculator },
}

interface Member { id: number; name: string; email: string; avatar: string; role: Role; status: "active" | "pending"; lastActive: string; joinedDate: string }

const mockMembers: Member[] = [
  { id: 1, name: "Max Müller", email: "max@meinshop.de", avatar: "MM", role: "admin", status: "active", lastActive: "Jetzt aktiv", joinedDate: "01.01.2025" },
  { id: 2, name: "Sarah Schmidt", email: "sarah@meinshop.de", avatar: "SS", role: "produktmanager", status: "active", lastActive: "Vor 30 Min.", joinedDate: "15.03.2025" },
  { id: 3, name: "Tom Weber", email: "tom@meinshop.de", avatar: "TW", role: "kundenservice", status: "active", lastActive: "Vor 2 Std.", joinedDate: "01.06.2025" },
  { id: 4, name: "Lisa Fischer", email: "lisa@meinshop.de", avatar: "LF", role: "versand", status: "active", lastActive: "Vor 1 Tag", joinedDate: "15.08.2025" },
  { id: 5, name: "Anna Klein", email: "anna@meinshop.de", avatar: "AK", role: "buchhaltung", status: "pending", lastActive: "Einladung gesendet", joinedDate: "10.02.2026" },
]

const permissions = [
  { name: "Produkte verwalten", admin: true, produktmanager: true, kundenservice: false, versand: false, buchhaltung: false },
  { name: "Bestellungen ansehen", admin: true, produktmanager: true, kundenservice: true, versand: true, buchhaltung: true },
  { name: "Bestellungen bearbeiten", admin: true, produktmanager: false, kundenservice: true, versand: true, buchhaltung: false },
  { name: "Kunden kontaktieren", admin: true, produktmanager: false, kundenservice: true, versand: false, buchhaltung: false },
  { name: "Preise ändern", admin: true, produktmanager: true, kundenservice: false, versand: false, buchhaltung: false },
  { name: "Finanzen einsehen", admin: true, produktmanager: false, kundenservice: false, versand: false, buchhaltung: true },
  { name: "Team verwalten", admin: true, produktmanager: false, kundenservice: false, versand: false, buchhaltung: false },
  { name: "Einstellungen ändern", admin: true, produktmanager: false, kundenservice: false, versand: false, buchhaltung: false },
]

const activityLog = [
  { id: 1, user: "Sarah Schmidt", action: "Produkt hinzugefügt: Vintage Lederjacke", time: "Vor 15 Min.", color: GREEN },
  { id: 2, user: "Tom Weber", action: "Kundenanfrage #1847 beantwortet", time: "Vor 45 Min.", color: GOLD },
  { id: 3, user: "Lisa Fischer", action: "Bestellung #2891 als versendet markiert", time: "Vor 1 Std.", color: "oklch(0.7 0.18 55)" },
  { id: 4, user: "Max Müller", action: "Preisregel aktualisiert: Winterrabatt", time: "Vor 3 Std.", color: PURPLE },
  { id: 5, user: "Sarah Schmidt", action: "3 Produktbilder aktualisiert", time: "Vor 5 Std.", color: GREEN },
]

export default function TeamPage() {
  const [members, setMembers] = useState(mockMembers)
  const [search, setSearch] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("kundenservice")
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
  const activeCount = members.filter(m => m.status === "active").length
  const pendingCount = members.filter(m => m.status === "pending").length

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    const initials = inviteEmail.split("@")[0].slice(0, 2).toUpperCase()
    setMembers(prev => [...prev, { id: Date.now(), name: inviteEmail.split("@")[0], email: inviteEmail, avatar: initials, role: inviteRole, status: "pending", lastActive: "Einladung gesendet", joinedDate: "14.02.2026" }])
    setInviteEmail("")
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklch, ${PURPLE} 15%, transparent)` }}>
              <UserCog className="w-5 h-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Team & Rollen</h1>
              <p className="text-sm text-muted-foreground">Verwalten Sie Ihr Team mit rollenbasiertem Zugriff</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Aktive Mitglieder", value: activeCount, icon: Users, color: GREEN },
            { label: "Ausstehende Einladungen", value: pendingCount, icon: Mail, color: GOLD },
            { label: "Gesamt", value: members.length, icon: UserCog, color: PURPLE },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="seller-card p-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `color-mix(in oklch, ${stat.color} 12%, transparent)` }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Invite Section */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5" style={{ color: GREEN }} />
            <h2 className="text-base font-bold">Mitglied einladen</h2>
          </div>
          <div className="flex gap-3">
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@beispiel.de"
              className="flex-1 px-4 py-2.5 rounded-xl text-sm border-0 outline-none" style={{ background: "oklch(0.14 0.01 260)" }}
              onKeyDown={e => e.key === "Enter" && handleInvite()} />
            <div className="relative">
              <button onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 min-w-[160px] justify-between"
                style={{ background: "oklch(0.14 0.01 260)", border: showRoleDropdown ? `1px solid ${PURPLE}` : "1px solid transparent" }}>
                <span style={{ color: ROLE_CONFIG[inviteRole].color }}>{ROLE_CONFIG[inviteRole].label}</span>
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
              {showRoleDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 rounded-xl overflow-hidden z-10 py-1" style={{ background: "oklch(0.18 0.01 260)", border: `1px solid oklch(0.25 0 0)` }}>
                  {(Object.keys(ROLE_CONFIG) as Role[]).map(role => (
                    <button key={role} onClick={() => { setInviteRole(role); setShowRoleDropdown(false) }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 transition-colors flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: ROLE_CONFIG[role].color }} />
                      {ROLE_CONFIG[role].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleInvite} className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: GREEN, color: "#fff" }}>Einladen</button>
          </div>
        </div>

        {/* Members List */}
        <div className="seller-card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold">Teammitglieder</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..."
                className="pl-9 pr-4 py-2 rounded-xl text-sm border-0 outline-none w-56" style={{ background: "oklch(0.14 0.01 260)" }} />
            </div>
          </div>
          <div className="space-y-3">
            {filtered.map(member => {
              const roleConfig = ROLE_CONFIG[member.role]
              const RoleIcon = roleConfig.icon
              return (
                <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 hover:bg-white/[0.02]"
                  style={{ background: "oklch(0.14 0.01 260)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: `color-mix(in oklch, ${roleConfig.color} 15%, transparent)`, color: roleConfig.color }}>
                    {member.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{member.name}</p>
                      {member.status === "pending" && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `color-mix(in oklch, ${GOLD} 12%, transparent)`, color: GOLD }}>Ausstehend</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `color-mix(in oklch, ${roleConfig.color} 8%, transparent)` }}>
                    <RoleIcon className="w-3.5 h-3.5" style={{ color: roleConfig.color }} />
                    <span className="text-xs font-medium" style={{ color: roleConfig.color }}>{roleConfig.label}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{member.lastActive}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Seit {member.joinedDate}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Permissions Matrix + Activity Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="seller-card p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-5 h-5" style={{ color: PURPLE }} />
              <h2 className="text-base font-bold">Berechtigungsmatrix</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b" style={{ borderColor: "oklch(0.2 0 0)" }}>
                    <th className="text-left py-3 pr-4">Berechtigung</th>
                    {(Object.keys(ROLE_CONFIG) as Role[]).map(role => (
                      <th key={role} className="text-center py-3 px-2">
                        <span style={{ color: ROLE_CONFIG[role].color }}>{ROLE_CONFIG[role].label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm, i) => (
                    <tr key={i} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: "oklch(0.15 0 0)" }}>
                      <td className="py-3 pr-4 text-xs">{perm.name}</td>
                      {(Object.keys(ROLE_CONFIG) as Role[]).map(role => (
                        <td key={role} className="text-center py-3 px-2">
                          {perm[role as keyof typeof perm] ? (
                            <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: GREEN }} />
                          ) : (
                            <XCircle className="w-4 h-4 mx-auto" style={{ color: "oklch(0.35 0 0)" }} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="seller-card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Clock className="w-5 h-5" style={{ color: GOLD }} />
              <h2 className="text-base font-bold">Aktivitätslog</h2>
            </div>
            <div className="space-y-4">
              {activityLog.map(entry => (
                <div key={entry.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: entry.color }} />
                  <div>
                    <p className="text-xs"><span className="font-semibold">{entry.user}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.action}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{entry.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
