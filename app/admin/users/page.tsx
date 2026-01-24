"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, Ban, CheckCircle, Shield, Search, Mail, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"

interface User {
  id: string
  email: string
  full_name?: string
  role: string
  is_banned?: boolean
  ban_reason?: string
  banned_at?: string
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'user' | 'admin' | 'banned'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [filter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const url = filter === 'all' || filter === 'banned'
        ? '/api/admin/users'
        : `/api/admin/users?role=${filter}`

      const response = await fetch(url, {
        headers: {
          'x-user-id': 'm3000'
        }
      })

      if (response.ok) {
        const data = await response.json()
        let filteredUsers = data.users || []

        if (filter === 'banned') {
          filteredUsers = filteredUsers.filter((u: User) => u.is_banned)
        }

        setUsers(filteredUsers)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (userId: string, action: 'ban' | 'unban' | 'make_admin' | 'make_user', notes?: string) => {
    try {
      setActionLoading(true)
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'm3000'
        },
        body: JSON.stringify({
          targetUserId: userId,
          action,
          notes
        })
      })

      if (response.ok) {
        await fetchUsers()
      }
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Users className="w-10 h-10 text-primary" />
            Kullanici Yonetimi
          </h1>
          <p className="text-muted-foreground">
            Kullaniciları yonetin, roller atayın ve yasak islemleri gerceklestirin
          </p>
        </div>

        {/* Filters */}
        <div className="glass border border-border rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Role Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Tumu ({users.length})
              </button>
              <button
                onClick={() => setFilter('user')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Kullanicilar
              </button>
              <button
                onClick={() => setFilter('admin')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'admin'
                    ? 'bg-purple-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Adminler
              </button>
              <button
                onClick={() => setFilter('banned')}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                  filter === 'banned'
                    ? 'bg-red-500 text-white'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Yasaklananlar
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Email, isim veya ID ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"
            />
            <p className="text-muted-foreground mt-4">Yukleniyor...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 glass border border-border rounded-2xl">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Kullanici bulunamadi</p>
          </div>
        ) : (
          <div className="glass border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Kullanici</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Rol</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Durum</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Kayit Tarihi</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || 'Isimsiz'}</p>
                            <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        }`}>
                          {user.role === 'admin' && <Shield className="w-3 h-3" />}
                          {user.role === 'admin' ? 'Admin' : 'Kullanici'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_banned ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                              <Ban className="w-3 h-3" />
                              Yasaklandi
                            </span>
                            {user.ban_reason && (
                              <p className="text-xs text-muted-foreground mt-1">{user.ban_reason}</p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                            <CheckCircle className="w-3 h-3" />
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(user.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {user.is_banned ? (
                            <button
                              onClick={() => handleAction(user.id, 'unban')}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Yasagi Kaldir
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(user.id, 'ban', 'Admin tarafindan yasaklandi')}
                              disabled={actionLoading || user.id === 'm3000'}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Yasakla
                            </button>
                          )}
                          {user.role === 'admin' ? (
                            <button
                              onClick={() => handleAction(user.id, 'make_user')}
                              disabled={actionLoading || user.id === 'm3000'}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Kullanici Yap
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(user.id, 'make_admin')}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Admin Yap
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
