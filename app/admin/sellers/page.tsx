"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { CheckCircle, XCircle, Loader2, Store, User, Phone, MapPin } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"

export default function AdminSellersPage() {
  const { data: session } = useSession()
  const adminId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)

  useEffect(() => {
    if (adminId) loadApplications()
  }, [adminId, filter])

  const loadApplications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/sellers/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminId, 
          status: filter === 'all' ? null : filter 
        })
      })
      const data = await response.json()
      setApplications(data.applications || [])
    } catch (error) {
      console.error('Load applications error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (applicationId: string) => {
    if (!confirm('Bu başvuruyu onaylamak istediğinize emin misiniz?')) return
    
    setProcessingId(applicationId)
    try {
      const response = await fetch('/api/admin/sellers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, adminId, action: 'approve' })
      })

      if (!response.ok) throw new Error('Approval failed')
      
      alert('✅ Başvuru onaylandı! Satıcı hesabı oluşturuldu.')
      loadApplications()
    } catch (error) {
      console.error('Approve error:', error)
      alert('Onaylama başarısız!')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (applicationId: string) => {
    if (!rejectionReason.trim()) {
      alert('Lütfen red sebebini yazın!')
      return
    }

    setProcessingId(applicationId)
    try {
      const response = await fetch('/api/admin/sellers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId, 
          adminId, 
          action: 'reject',
          rejectionReason 
        })
      })

      if (!response.ok) throw new Error('Rejection failed')
      
      alert('❌ Başvuru reddedildi.')
      setShowRejectModal(null)
      setRejectionReason('')
      loadApplications()
    } catch (error) {
      console.error('Reject error:', error)
      alert('Reddetme başarısız!')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">Satıcı Başvuruları</h1>
            <p className="text-muted-foreground">Başvuruları incele, onayla veya reddet</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-xl font-semibold text-sm ${filter === 'pending' ? 'bg-primary text-primary-foreground' : 'glass border border-border'}`}>
              Bekleyen ({applications.filter(a => a.status === 'pending').length})
            </button>
            <button onClick={() => setFilter('approved')} className={`px-4 py-2 rounded-xl font-semibold text-sm ${filter === 'approved' ? 'bg-primary text-primary-foreground' : 'glass border border-border'}`}>
              Onaylanan
            </button>
            <button onClick={() => setFilter('rejected')} className={`px-4 py-2 rounded-xl font-semibold text-sm ${filter === 'rejected' ? 'bg-primary text-primary-foreground' : 'glass border border-border'}`}>
              Reddedilen
            </button>
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl font-semibold text-sm ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'glass border border-border'}`}>
              Tümü
            </button>
          </div>

          {/* Applications List */}
          {applications.length === 0 ? (
            <div className="text-center py-20 glass border border-border rounded-2xl">
              <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Başvuru Yok</h3>
              <p className="text-muted-foreground">Bu kategoride başvuru bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass border border-border rounded-2xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary flex-shrink-0">
                      {app.user?.avatar_url ? (
                        <img src={app.user.avatar_url} alt={app.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold">
                          {app.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="w-5 h-5 text-primary" />
                        <h3 className="text-xl font-bold">{app.shop_name}</h3>
                        {app.status === 'pending' && <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-semibold rounded-full">Bekliyor</span>}
                        {app.status === 'approved' && <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-semibold rounded-full">Onaylandı</span>}
                        {app.status === 'rejected' && <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs font-semibold rounded-full">Reddedildi</span>}
                      </div>

                      {app.shop_description && (
                        <p className="text-sm text-muted-foreground mb-3">{app.shop_description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{app.user?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{app.phone}</span>
                        </div>
                        {app.city && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{app.city}</span>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {app.business_type === 'company' ? 'Şirket' : 'Bireysel'}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Başvuru Tarihi: {new Date(app.applied_at).toLocaleDateString('tr-TR')}
                      </p>

                      {app.status === 'rejected' && app.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-sm text-red-500">Red Sebebi: {app.rejection_reason}</p>
                        </div>
                      )}

                      {app.status === 'pending' && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={processingId === app.id}
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {processingId === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Onayla
                          </button>
                          <button
                            onClick={() => setShowRejectModal(app.id)}
                            disabled={processingId === app.id}
                            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRejectModal(null)}>
          <div className="glass border border-border rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Başvuruyu Reddet</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Red sebebini yazın..."
              rows={4}
              className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary resize-none mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowRejectModal(null)} className="flex-1 px-4 py-2 glass border border-border rounded-xl font-semibold hover:bg-secondary transition-colors">
                İptal
              </button>
              <button onClick={() => handleReject(showRejectModal)} disabled={!rejectionReason.trim()} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}