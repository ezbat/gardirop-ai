'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Megaphone, Zap, TrendingUp, Crown, Check, Loader2,
  ArrowLeft, ImagePlus, Clock, Eye,
} from 'lucide-react'

const BG = '#0B0D14'
const SURFACE = '#111520'
const ELEVATED = '#1A1E2E'
const BORDER = '#252A3C'
const TEXT1 = '#F1F1F4'
const TEXT2 = '#9BA3B5'
const ACCENT = '#D97706'

interface AdPackage {
  id: string
  name: string
  name_de: string
  description_de: string
  price_cents: number
  duration_days: number
  impressions_limit: number
  features: Record<string, any>
}

interface SellerPost {
  id: string
  caption: string
  image_url: string
  likes_count: number
  comments_count: number
  is_promoted: boolean
}

interface AdApplication {
  id: string
  status: string
  created_at: string
  ad_packages: { name: string; name_de: string; price_cents: number }
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ausstehend', color: '#F59E0B' },
  approved: { label: 'Genehmigt', color: '#22C55E' },
  rejected: { label: 'Abgelehnt', color: '#EF4444' },
  active: { label: 'Aktiv', color: '#3B82F6' },
  completed: { label: 'Abgeschlossen', color: '#8B5CF6' },
}

const PKG_ICONS: Record<string, React.ReactNode> = {
  Starter: <Zap className="w-5 h-5" />,
  Boost: <TrendingUp className="w-5 h-5" />,
  Spotlight: <Crown className="w-5 h-5" />,
}

const PKG_ACCENTS: Record<string, string> = {
  Starter: '#F59E0B',
  Boost: '#3B82F6',
  Spotlight: '#8B5CF6',
}

export default function SellerAdsPage() {
  const router = useRouter()
  const [packages, setPackages] = useState<AdPackage[]>([])
  const [posts, setPosts] = useState<SellerPost[]>([])
  const [applications, setApplications] = useState<AdApplication[]>([])
  const [loading, setLoading] = useState(true)

  // Selection state
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<string | null>(null)
  const [step, setStep] = useState<'packages' | 'select-post' | 'confirm'>('packages')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/seller/ads/packages').then(r => r.json()),
      fetch('/api/seller/posts?limit=20').then(r => r.json()),
      fetch('/api/seller/ads').then(r => r.json()),
    ])
      .then(([pkgData, postData, appData]) => {
        setPackages(pkgData.packages || [])
        setPosts((postData.posts || []).filter((p: SellerPost) => !p.is_promoted))
        setApplications(appData.applications || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const selectedPackage = packages.find(p => p.id === selectedPkg)
  const selectedPostData = posts.find(p => p.id === selectedPost)

  const handleSubmit = async () => {
    if (!selectedPkg) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/seller/ads/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPkg, postId: selectedPost || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        setTimeout(() => router.push('/seller/posts'), 2000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: ACCENT, animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: BG, color: TEXT1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check style={{ width: 32, height: 32, color: '#22C55E' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Anfrage eingereicht!</h2>
          <p style={{ color: TEXT2, fontSize: 14 }}>Dein Boost wird vom Team geprüft. Du wirst benachrichtigt.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT1 }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <Link href="/seller/posts" style={{ color: TEXT2, display: 'flex' }}>
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </Link>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone style={{ width: 22, height: 22, color: ACCENT }} /> Beitrag bewerben
            </h1>
            <p style={{ fontSize: 13, color: TEXT2, marginTop: 2 }}>Steigere deine Reichweite mit einer Promotion</p>
          </div>
        </div>

        {/* Step 1: Package Selection */}
        {step === 'packages' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
              {packages.map(pkg => {
                const accent = PKG_ACCENTS[pkg.name] || ACCENT
                const selected = selectedPkg === pkg.id
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg.id)}
                    style={{
                      background: selected ? `${accent}12` : SURFACE,
                      border: `2px solid ${selected ? accent : BORDER}`,
                      borderRadius: 16, padding: 24, textAlign: 'left',
                      cursor: 'pointer', color: TEXT1, transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ color: accent }}>{PKG_ICONS[pkg.name] || <Megaphone className="w-5 h-5" />}</div>
                      <span style={{ fontSize: 16, fontWeight: 800 }}>{pkg.name_de}</span>
                    </div>
                    <p style={{ fontSize: 12, color: TEXT2, lineHeight: 1.5, marginBottom: 16 }}>{pkg.description_de}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                      <span style={{ fontSize: 24, fontWeight: 800 }}>{'\u20AC'}{(pkg.price_cents / 100).toFixed(0)}</span>
                      <span style={{ fontSize: 12, color: TEXT2 }}>/ {pkg.duration_days} Tage</span>
                    </div>
                    <div style={{ fontSize: 11, color: TEXT2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <Eye style={{ width: 12, height: 12 }} />
                        {pkg.impressions_limit === -1 ? 'Unbegrenzte Impressionen' : `Bis zu ${(pkg.impressions_limit / 1000).toFixed(0)}K Impressionen`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        {pkg.duration_days} Tage Laufzeit
                      </div>
                    </div>
                    {selected && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: accent, fontSize: 12, fontWeight: 700 }}>
                        <Check style={{ width: 14, height: 14 }} /> Ausgewählt
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => selectedPkg && setStep('select-post')}
              disabled={!selectedPkg}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 12,
                background: selectedPkg ? ACCENT : ELEVATED,
                color: selectedPkg ? '#fff' : TEXT2,
                fontWeight: 700, fontSize: 15, border: 'none',
                cursor: selectedPkg ? 'pointer' : 'not-allowed',
                opacity: selectedPkg ? 1 : 0.5,
              }}
            >
              Weiter — Beitrag wählen
            </button>
          </>
        )}

        {/* Step 2: Select Post */}
        {step === 'select-post' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setStep('packages')}
                style={{ color: TEXT2, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ArrowLeft style={{ width: 14, height: 14 }} /> Zurück zu Paketen
              </button>
            </div>

            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Welchen Beitrag möchtest du bewerben?</h2>

            {posts.length === 0 ? (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <ImagePlus style={{ width: 32, height: 32, color: TEXT2, margin: '0 auto 12px' }} />
                <p style={{ color: TEXT2, fontSize: 14 }}>Du hast noch keine Beiträge.</p>
                <Link
                  href="/seller/posts/create"
                  style={{ display: 'inline-block', marginTop: 12, padding: '10px 20px', borderRadius: 10, background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
                >
                  Beitrag erstellen
                </Link>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                  {posts.map(post => {
                    const selected = selectedPost === post.id
                    return (
                      <button
                        key={post.id}
                        onClick={() => setSelectedPost(post.id)}
                        style={{
                          position: 'relative', borderRadius: 12, overflow: 'hidden',
                          border: `2px solid ${selected ? ACCENT : BORDER}`,
                          cursor: 'pointer', aspectRatio: '4/5', background: ELEVATED,
                          padding: 0,
                        }}
                      >
                        {post.image_url && (
                          <img src={post.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: selected ? 'rgba(217,119,6,0.2)' : 'rgba(0,0,0,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check style={{ width: 20, height: 20, color: '#fff' }} />
                            </div>
                          )}
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                          <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                            <span>{'❤'} {post.likes_count}</span>
                            <span>{'💬'} {post.comments_count}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => { setSelectedPost(null); setStep('confirm') }}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 12,
                      background: ELEVATED, border: `1px solid ${BORDER}`,
                      color: TEXT2, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    Ohne Beitrag (Store-Boost)
                  </button>
                  <button
                    onClick={() => selectedPost && setStep('confirm')}
                    disabled={!selectedPost}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 12,
                      background: selectedPost ? ACCENT : ELEVATED,
                      color: selectedPost ? '#fff' : TEXT2,
                      fontWeight: 700, fontSize: 14, border: 'none',
                      cursor: selectedPost ? 'pointer' : 'not-allowed',
                      opacity: selectedPost ? 1 : 0.5,
                    }}
                  >
                    Weiter
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && selectedPackage && (
          <>
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => setStep('select-post')}
                style={{ color: TEXT2, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ArrowLeft style={{ width: 14, height: 14 }} /> Zurück
              </button>
            </div>

            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Zusammenfassung</h2>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: TEXT2, fontSize: 13 }}>Paket</span>
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: PKG_ACCENTS[selectedPackage.name] }}>{PKG_ICONS[selectedPackage.name]}</span>
                  {selectedPackage.name_de}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: TEXT2, fontSize: 13 }}>Laufzeit</span>
                <span style={{ fontWeight: 600 }}>{selectedPackage.duration_days} Tage</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: TEXT2, fontSize: 13 }}>Impressionen</span>
                <span style={{ fontWeight: 600 }}>
                  {selectedPackage.impressions_limit === -1 ? 'Unbegrenzt' : `${(selectedPackage.impressions_limit / 1000).toFixed(0)}K`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ color: TEXT2, fontSize: 13 }}>Beitrag</span>
                <span style={{ fontWeight: 600 }}>
                  {selectedPostData ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={selectedPostData.image_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                      {selectedPostData.caption?.slice(0, 30) || 'Beitrag'}
                    </span>
                  ) : 'Store-Boost'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 0' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Gesamt</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>{'\u20AC'}{(selectedPackage.price_cents / 100).toFixed(2)}</span>
              </div>
            </div>

            <div style={{
              background: `${ACCENT}10`, border: `1px solid ${ACCENT}30`, borderRadius: 12,
              padding: 16, marginBottom: 24, fontSize: 13, color: TEXT2, lineHeight: 1.6,
            }}>
              <strong style={{ color: ACCENT }}>Hinweis:</strong> Deine Anfrage wird vom WEARO-Team geprüft.
              Nach Genehmigung wird dein Beitrag priorisiert im Feed und auf der Startseite angezeigt.
              Die Abrechnung erfolgt nach Freigabe.
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 12,
                background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? (
                <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Wird eingereicht...</>
              ) : (
                <><Megaphone style={{ width: 18, height: 18 }} /> Boost-Anfrage einreichen</>
              )}
            </button>
          </>
        )}

        {/* Previous Applications */}
        {step === 'packages' && applications.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Deine Anfragen</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {applications.slice(0, 10).map(app => {
                const st = STATUS_MAP[app.status] || { label: app.status, color: TEXT2 }
                return (
                  <div key={app.id} style={{
                    background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
                    padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{app.ad_packages?.name_de || app.ad_packages?.name}</span>
                      <span style={{ color: TEXT2, fontSize: 11, marginLeft: 8 }}>
                        {new Date(app.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: st.color, padding: '3px 8px', borderRadius: 6, background: `${st.color}15` }}>
                      {st.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
