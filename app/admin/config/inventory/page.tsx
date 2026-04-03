'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Package, Tag, RefreshCw, Save, Trash2,
  Plus, Search, ChevronRight, AlertTriangle, X, Check,
} from 'lucide-react'

// ── Design tokens (match admin panel) ─────────────────────────────────────────
const BG   = '#0B0D14'
const SURF = '#111520'
const ELEV = '#1A1E2E'
const BDR  = '#2E3448'
const T1   = '#F0F2F8'
const T2   = '#9EA5BB'
const T3   = '#7B83A0'
const ACC  = '#6366F1'
const GRN  = '#10B981'
const RED  = '#EF4444'
const AMB  = '#F59E0B'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryConfig {
  id: string
  category_slug: string
  low_stock_threshold: number
  updated_at: string
}

interface ProductOverride {
  id: string
  title: string
  category: string | null
  stock_quantity: number | null
  low_stock_threshold: number | null
}

interface ConfigData {
  globalThreshold: number
  categoryConfigs: CategoryConfig[]
  productOverrides: {
    items: ProductOverride[]
    total: number
    page: number
    limit: number
  }
  stats: { categoryCount: number; productCount: number }
}

// ── Admin token helper ────────────────────────────────────────────────────────

function getAdminToken(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('adminToken') || localStorage.getItem('adminToken') || ''
}

async function apiCall(body: Record<string, unknown>): Promise<{ success: boolean; error?: string; [k: string]: unknown }> {
  const res = await fetch('/api/admin/config/inventory', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-admin-token': getAdminToken(),
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color = ACC }: {
  label: string; value: string | number; icon: React.ComponentType<{ size?: number; color?: string }>; color?: string
}) {
  return (
    <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ color: T2, fontSize: 13 }}>{label}</span>
      </div>
      <div style={{ color: T1, fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

// ── Inline number input ───────────────────────────────────────────────────────

function ThresholdInput({ value, onSave, disabled }: {
  value: number; onSave: (v: number) => Promise<void>; disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(String(value)) }, [value])

  async function handleSave() {
    const n = parseInt(draft, 10)
    if (isNaN(n) || n < 0) return
    setSaving(true)
    await onSave(n)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: T1, fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ color: T3, fontSize: 13 }}>Stück</span>
        <button
          onClick={() => setEditing(true)}
          disabled={disabled}
          style={{ marginLeft: 8, padding: '4px 12px', background: `${ACC}22`, border: `1px solid ${ACC}55`, borderRadius: 6, color: ACC, fontSize: 12, cursor: 'pointer' }}
        >
          Bearbeiten
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="number"
        min={0}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
        autoFocus
        style={{
          width: 80, padding: '6px 10px', background: ELEV, border: `1px solid ${ACC}`,
          borderRadius: 6, color: T1, fontSize: 18, fontWeight: 700, outline: 'none',
        }}
      />
      <span style={{ color: T3, fontSize: 13 }}>Stück</span>
      <button
        onClick={handleSave}
        disabled={saving}
        style={{ padding: '6px 14px', background: ACC, border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Save size={13} /> {saving ? '…' : 'Speichern'}
      </button>
      <button
        onClick={() => { setEditing(false); setDraft(String(value)) }}
        style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, color: T2, cursor: 'pointer' }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── Add Category Override Row ─────────────────────────────────────────────────

function AddCategoryRow({ onAdd }: { onAdd: (slug: string, threshold: number) => Promise<void> }) {
  const [open, setOpen]         = useState(false)
  const [slug, setSlug]         = useState('')
  const [thr, setThr]           = useState('5')
  const [saving, setSaving]     = useState(false)

  async function handleAdd() {
    if (!slug.trim() || isNaN(parseInt(thr)) || parseInt(thr) < 0) return
    setSaving(true)
    await onAdd(slug.trim(), parseInt(thr, 10))
    setSaving(false)
    setOpen(false)
    setSlug('')
    setThr('5')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: `${ACC}22`, border: `1px dashed ${ACC}55`, borderRadius: 8, color: ACC, fontSize: 13, cursor: 'pointer', marginTop: 8 }}
      >
        <Plus size={14} /> Kategorie-Override hinzufügen
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '10px 14px', background: ELEV, border: `1px solid ${BDR}`, borderRadius: 8 }}>
      <input
        placeholder="Kategorie-Slug (z.B. Kleidung)"
        value={slug}
        onChange={e => setSlug(e.target.value)}
        style={{ flex: 1, padding: '6px 10px', background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, color: T1, fontSize: 13, outline: 'none' }}
      />
      <input
        type="number"
        min={0}
        placeholder="Schwelle"
        value={thr}
        onChange={e => setThr(e.target.value)}
        style={{ width: 90, padding: '6px 10px', background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, color: T1, fontSize: 13, outline: 'none' }}
      />
      <button
        onClick={handleAdd}
        disabled={saving}
        style={{ padding: '6px 14px', background: ACC, border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <Check size={13} /> {saving ? '…' : 'Hinzufügen'}
      </button>
      <button
        onClick={() => setOpen(false)}
        style={{ padding: '6px 10px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, color: T2, cursor: 'pointer' }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminInventoryConfigPage() {
  const [data, setData]         = useState<ConfigData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)

  // Product search
  const [productSearch, setProductSearch]       = useState('')
  const [productPage, setProductPage]           = useState(1)

  // Edit category inline
  const [editCatId, setEditCatId]               = useState<string | null>(null)
  const [editCatVal, setEditCatVal]             = useState('')

  // Set product threshold modal
  const [setProdId, setSetProdId]               = useState<string | null>(null)
  const [setProdVal, setSetProdVal]             = useState('')

  // Product search for setting threshold
  const [prodSearchQuery, setProdSearchQuery]   = useState('')
  const [prodSearchResults, setProdSearchResults] = useState<ProductOverride[]>([])
  const [prodSearchLoading, setProdSearchLoading] = useState(false)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = useCallback(async (search = productSearch, page = productPage) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25', search })
      const res = await fetch(`/api/admin/config/inventory?${params}`, {
        headers: { 'x-admin-token': getAdminToken() },
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [productSearch, productPage])

  useEffect(() => { loadData() }, [loadData])

  // Product search for "add override"
  useEffect(() => {
    if (!prodSearchQuery.trim()) { setProdSearchResults([]); return }
    const timer = setTimeout(async () => {
      setProdSearchLoading(true)
      const params = new URLSearchParams({ search: prodSearchQuery, limit: '10', page: '1' })
      // Fetch all products matching search (not just ones with overrides)
      const res = await fetch(`/api/admin/config/inventory?${params}&includeAll=1`, {
        headers: { 'x-admin-token': getAdminToken() },
      }).catch(() => null)
      if (res?.ok) {
        const j = await res.json()
        // We'll use the admin products API for search — fall back to product overrides list
        setProdSearchResults(j.productOverrides?.items ?? [])
      }
      setProdSearchLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [prodSearchQuery])

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleSetGlobal(threshold: number) {
    const r = await apiCall({ action: 'set_global', threshold })
    if (r.success) { showToast(`Global-Standard auf ${threshold} gesetzt`); loadData() }
    else showToast(r.error ?? 'Fehler', false)
  }

  async function handleSetCategory(category_slug: string, threshold: number) {
    const r = await apiCall({ action: 'set_category', category_slug, threshold })
    if (r.success) { showToast(`Kategorie "${category_slug}" → ${threshold}`); loadData() }
    else showToast(r.error ?? 'Fehler', false)
  }

  async function handleClearCategory(category_slug: string) {
    const r = await apiCall({ action: 'clear_category', category_slug })
    if (r.success) { showToast(`Override für "${category_slug}" entfernt`); loadData() }
    else showToast(r.error ?? 'Fehler', false)
  }

  async function handleSetProduct(product_id: string, threshold: number) {
    const r = await apiCall({ action: 'set_product', product_id, threshold })
    if (r.success) { showToast('Produkt-Override gespeichert'); setSetProdId(null); loadData() }
    else showToast(r.error ?? 'Fehler', false)
  }

  async function handleClearProduct(product_id: string) {
    const r = await apiCall({ action: 'clear_product', product_id })
    if (r.success) { showToast('Produkt-Override entfernt'); loadData() }
    else showToast(r.error ?? 'Fehler', false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: BG, color: T1, padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10,
          background: toast.ok ? `${GRN}22` : `${RED}22`,
          border: `1px solid ${toast.ok ? GRN : RED}55`,
          color: toast.ok ? GRN : RED,
          fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.ok ? <Check size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Settings size={22} color={ACC} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: T1 }}>Lagerbestand-Konfiguration</h1>
        </div>
        <p style={{ margin: 0, color: T2, fontSize: 14 }}>
          Dreistufige Schwellenwert-Konfiguration: global → Kategorie → Produkt
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', background: `${RED}15`, border: `1px solid ${RED}44`, borderRadius: 10, color: RED, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => loadData()} style={{ marginLeft: 'auto', color: RED, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', gap: 4 }}>
            <RefreshCw size={14} /> Erneut laden
          </button>
        </div>
      )}

      {loading && !data && (
        <div style={{ color: T2, fontSize: 14 }}>Lade Konfiguration…</div>
      )}

      {data && (
        <>
          {/* KPI Strip */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
            <KpiCard label="Global-Standardschwelle" value={`${data.globalThreshold} Stück`} icon={Settings} color={ACC} />
            <KpiCard label="Kategorie-Overrides" value={data.stats.categoryCount} icon={Tag} color={AMB} />
            <KpiCard label="Produkt-Overrides" value={data.stats.productCount} icon={Package} color={GRN} />
          </div>

          {/* ── Section A: Global Default ─────────────────────────────────────── */}
          <section style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Settings size={18} color={ACC} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T1 }}>A — Globaler Standard</h2>
            </div>
            <p style={{ color: T2, fontSize: 13, marginTop: 0, marginBottom: 20 }}>
              Greift für alle Produkte, die keine Kategorie- oder Produkt-Override haben.
              Die Auflösungsreihenfolge ist: <strong style={{ color: T1 }}>Produkt → Kategorie → Global</strong>.
            </p>
            <ThresholdInput value={data.globalThreshold} onSave={handleSetGlobal} />
          </section>

          {/* ── Section B: Category Overrides ────────────────────────────────── */}
          <section style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Tag size={18} color={AMB} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T1 }}>B — Kategorie-Overrides</h2>
              <span style={{ marginLeft: 'auto', background: `${AMB}22`, color: AMB, fontSize: 12, padding: '2px 10px', borderRadius: 20 }}>
                {data.categoryConfigs.length} aktiv
              </span>
            </div>

            {data.categoryConfigs.length === 0 ? (
              <p style={{ color: T3, fontSize: 13, margin: 0 }}>Noch keine Kategorie-Overrides. Füge einen unten hinzu.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BDR}` }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: T3, fontWeight: 500 }}>Kategorie</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: T3, fontWeight: 500 }}>Schwelle (Stück)</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: T3, fontWeight: 500 }}>Zuletzt geändert</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: T3, fontWeight: 500 }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryConfigs.map(cat => (
                    <tr key={cat.id} style={{ borderBottom: `1px solid ${BDR}22` }}>
                      <td style={{ padding: '10px 12px', color: T1 }}>
                        <span style={{ background: `${AMB}18`, color: AMB, padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>
                          {cat.category_slug}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {editCatId === cat.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <input
                              type="number" min={0} value={editCatVal}
                              onChange={e => setEditCatVal(e.target.value)}
                              autoFocus
                              style={{ width: 70, padding: '4px 8px', background: ELEV, border: `1px solid ${ACC}`, borderRadius: 5, color: T1, fontSize: 13, outline: 'none', textAlign: 'right' }}
                            />
                            <button
                              onClick={async () => {
                                const n = parseInt(editCatVal, 10)
                                if (!isNaN(n) && n >= 0) await handleSetCategory(cat.category_slug, n)
                                setEditCatId(null)
                              }}
                              style={{ padding: '4px 10px', background: ACC, border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer', fontSize: 12 }}
                            >
                              OK
                            </button>
                            <button onClick={() => setEditCatId(null)} style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: T2, cursor: 'pointer', fontSize: 12 }}>
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: T1, fontWeight: 600 }}>{cat.low_stock_threshold}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: T3 }}>
                        {new Date(cat.updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setEditCatId(cat.id); setEditCatVal(String(cat.low_stock_threshold)) }}
                            style={{ padding: '4px 10px', background: `${ACC}22`, border: `1px solid ${ACC}44`, borderRadius: 5, color: ACC, cursor: 'pointer', fontSize: 12 }}
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleClearCategory(cat.category_slug)}
                            style={{ padding: '4px 8px', background: `${RED}15`, border: `1px solid ${RED}44`, borderRadius: 5, color: RED, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <AddCategoryRow onAdd={handleSetCategory} />
          </section>

          {/* ── Section C: Product Overrides ──────────────────────────────────── */}
          <section style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Package size={18} color={GRN} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: T1 }}>C — Produkt-Overrides</h2>
              <span style={{ marginLeft: 'auto', background: `${GRN}22`, color: GRN, fontSize: 12, padding: '2px 10px', borderRadius: 20 }}>
                {data.productOverrides.total} aktiv
              </span>
            </div>
            <p style={{ color: T2, fontSize: 13, marginTop: 0, marginBottom: 16 }}>
              Produkte mit individuellen Schwellenwerten. Override löschen = Kategorie/Global-Wert greift wieder.
            </p>

            {/* Search + Add product override */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T3 }} />
                <input
                  placeholder="Produkte mit Override suchen…"
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); setProductPage(1); loadData(e.target.value, 1) }}
                  style={{ width: '100%', paddingLeft: 32, padding: '8px 12px 8px 32px', background: ELEV, border: `1px solid ${BDR}`, borderRadius: 8, color: T1, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={() => setSetProdId('__new__')}
                style={{ padding: '8px 16px', background: `${GRN}22`, border: `1px solid ${GRN}55`, borderRadius: 8, color: GRN, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Produkt-Override setzen
              </button>
            </div>

            {/* Product override modal */}
            {setProdId && (
              <div style={{ padding: 20, background: ELEV, border: `1px solid ${BDR}`, borderRadius: 10, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Package size={16} color={GRN} />
                  <span style={{ color: T1, fontSize: 14, fontWeight: 600 }}>Produkt-Schwelle setzen</span>
                  <button onClick={() => { setSetProdId(null); setProdSearchQuery('') }} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: T3, cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: T3 }} />
                  <input
                    placeholder="Produktname suchen…"
                    value={prodSearchQuery}
                    onChange={e => setProdSearchQuery(e.target.value)}
                    autoFocus
                    style={{ width: '100%', paddingLeft: 28, padding: '7px 10px 7px 28px', background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, color: T1, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {prodSearchLoading && <div style={{ color: T3, fontSize: 12, padding: '4px 0' }}>Suche…</div>}
                {prodSearchResults.length > 0 && (
                  <div style={{ border: `1px solid ${BDR}`, borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
                    {prodSearchResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => { setSetProdId(p.id); setProdSearchQuery(p.title); setProdSearchResults([]) }}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${BDR}22`, display: 'flex', justifyContent: 'space-between' }}
                        onMouseEnter={e => (e.currentTarget.style.background = ELEV)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ color: T1, fontSize: 13 }}>{p.title}</span>
                        <span style={{ color: T3, fontSize: 12 }}>{p.category ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {setProdId !== '__new__' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <input
                      type="number" min={0} placeholder="Schwelle (Stück)"
                      value={setProdVal}
                      onChange={e => setSetProdVal(e.target.value)}
                      style={{ width: 130, padding: '7px 10px', background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, color: T1, fontSize: 13, outline: 'none' }}
                    />
                    <button
                      onClick={async () => {
                        const n = parseInt(setProdVal, 10)
                        if (!isNaN(n) && n >= 0 && setProdId !== '__new__') await handleSetProduct(setProdId, n)
                      }}
                      style={{ padding: '7px 16px', background: GRN, border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer' }}
                    >
                      Speichern
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Product overrides table */}
            {data.productOverrides.items.length === 0 ? (
              <p style={{ color: T3, fontSize: 13, margin: 0 }}>
                {productSearch ? 'Keine Ergebnisse für diese Suche.' : 'Noch keine Produkt-Overrides gesetzt.'}
              </p>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BDR}` }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: T3, fontWeight: 500 }}>Produkt</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: T3, fontWeight: 500 }}>Kategorie</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: T3, fontWeight: 500 }}>Lagerbestand</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: T3, fontWeight: 500 }}>Override-Schwelle</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: T3, fontWeight: 500 }}>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.productOverrides.items.map(p => {
                      const stock = p.stock_quantity ?? 0
                      const thr   = p.low_stock_threshold ?? data.globalThreshold
                      const isLow = stock > 0 && stock <= thr
                      const isOut = stock === 0
                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${BDR}22` }}>
                          <td style={{ padding: '10px 12px', color: T1, maxWidth: 240 }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.title}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: T2 }}>{p.category ?? '—'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <span style={{
                              color: isOut ? RED : isLow ? AMB : GRN,
                              fontWeight: 600,
                            }}>
                              {stock}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <span style={{ background: `${ACC}20`, color: ACC, padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>
                              {p.low_stock_threshold}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleClearProduct(p.id)}
                              style={{ padding: '4px 10px', background: `${RED}15`, border: `1px solid ${RED}44`, borderRadius: 5, color: RED, cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Trash2 size={11} /> Override löschen
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {data.productOverrides.total > data.productOverrides.limit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                    <span style={{ color: T3, fontSize: 12 }}>
                      {data.productOverrides.total} Einträge · Seite {data.productOverrides.page}
                    </span>
                    <button
                      disabled={productPage <= 1}
                      onClick={() => { setProductPage(p => p - 1); loadData(productSearch, productPage - 1) }}
                      style={{ padding: '5px 12px', background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6, color: productPage <= 1 ? T3 : T1, cursor: productPage <= 1 ? 'default' : 'pointer', fontSize: 12 }}
                    >
                      ← Zurück
                    </button>
                    <button
                      disabled={productPage * data.productOverrides.limit >= data.productOverrides.total}
                      onClick={() => { setProductPage(p => p + 1); loadData(productSearch, productPage + 1) }}
                      style={{ padding: '5px 12px', background: ELEV, border: `1px solid ${BDR}`, borderRadius: 6, color: productPage * data.productOverrides.limit >= data.productOverrides.total ? T3 : T1, cursor: 'pointer', fontSize: 12 }}
                    >
                      Weiter →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Precedence legend */}
          <div style={{ marginTop: 24, padding: '14px 20px', background: `${ACC}0C`, border: `1px solid ${ACC}22`, borderRadius: 10, fontSize: 13, color: T2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <ChevronRight size={14} color={ACC} />
              <strong style={{ color: T1 }}>Auflösungsreihenfolge</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ background: `${GRN}20`, color: GRN, padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>① Produkt-Override</span>
              <span style={{ color: T3 }}>→</span>
              <span style={{ background: `${AMB}20`, color: AMB, padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>② Kategorie-Override</span>
              <span style={{ color: T3 }}>→</span>
              <span style={{ background: `${ACC}20`, color: ACC, padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>③ Global-Standard</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
