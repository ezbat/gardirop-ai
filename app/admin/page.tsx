'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, ShoppingCart, Users, Package,
  AlertTriangle, DollarSign, RefreshCw, Shield,
  Activity, Clock, Zap, ChevronRight, AlertCircle, Star,
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { getAdminToken } from '@/lib/admin-fetch'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG   = '#0B0D14'
const SURF = '#111520'
const ELEV = '#1A1E2E'
const BDR  = '#2E3448'
const T1   = '#F0F2F8'
const T2   = '#9EA5BB'
const T3   = '#7B83A0'
const ACC  = '#6366F1'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(2)}`
}

function formatNum(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`
  return v.toLocaleString()
}

function fmtChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const ORDER_STATE_CFG: Record<string, { bg: string; text: string }> = {
  CREATED:         { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' },
  PAYMENT_PENDING: { bg: 'rgba(245,158,11,0.15)',  text: '#FCD34D' },
  PAID:            { bg: 'rgba(59,130,246,0.15)',   text: '#93C5FD' },
  SHIPPED:         { bg: 'rgba(99,102,241,0.15)',   text: '#A5B4FC' },
  DELIVERED:       { bg: 'rgba(20,184,166,0.15)',   text: '#5EEAD4' },
  COMPLETED:       { bg: 'rgba(16,185,129,0.15)',   text: '#6EE7B7' },
  REFUNDED:        { bg: 'rgba(139,92,246,0.15)',   text: '#C4B5FD' },
  CANCELLED:       { bg: 'rgba(239,68,68,0.15)',    text: '#FCA5A5' },
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AlertData {
  type:     string
  severity: 'warning' | 'error' | 'info'
  message:  string
  count:    number
  href:     string
}

interface DashboardData {
  kpis: {
    totalRevenue:        number
    monthRevenue:        number
    totalOrders:         number
    monthOrders:         number
    paidOrders:          number
    refundedOrders:      number
    refundRate:          number
    avgOrderValue:       number
    totalSellers:        number
    approvedProducts:    number
    pendingModeration:   number
    pendingPayouts:      number
    failedPayouts:       number
    pendingApplications: number
    stuckOrders:         number
  }
  charts: {
    revenueByDay: { date: string; value: number }[]
    ordersByDay:  { date: string; value: number }[]
  }
  topProducts: {
    productId: string
    title:     string
    revenue:   number
    unitsSold: number
  }[]
  recentOrders: {
    id:             string
    state:          string
    payment_status: string
    total_amount:   number
    currency:       string
    created_at:     string
  }[]
  alerts: AlertData[]
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: (token: string) => void }) {
  const [tok, setTok]         = useState('')
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tok.trim()) return
    setLoading(true)
    setErr('')
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { 'x-admin-token': tok.trim() },
      })
      if (res.status === 401) {
        setErr('Invalid admin token')
        setLoading(false)
        return
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr((j as { error?: string }).error ?? 'Server error')
        setLoading(false)
        return
      }
      onAuth(tok.trim())
    } catch {
      setErr('Connection error — try again')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 420, background: SURF,
        border: `1px solid ${BDR}`, borderRadius: 16, padding: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Shield size={22} color={ACC} />
          </div>
          <div>
            <p style={{ color: T1, fontWeight: 700, fontSize: 19, margin: 0 }}>Admin Dashboard</p>
            <p style={{ color: T3, fontSize: 13, margin: 0 }}>Enter your admin token to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={tok}
            onChange={e => setTok(e.target.value)}
            placeholder="Admin token"
            style={{
              width: '100%', background: ELEV,
              border: `1px solid ${err ? 'rgba(239,68,68,0.5)' : BDR}`,
              borderRadius: 8, padding: '11px 14px',
              color: T1, fontSize: 14, outline: 'none',
              boxSizing: 'border-box',
              marginBottom: err ? 8 : 16,
            }}
            autoFocus
          />
          {err && (
            <p style={{ color: '#FCA5A5', fontSize: 13, margin: '0 0 14px' }}>{err}</p>
          )}
          <button
            type="submit"
            disabled={loading || !tok.trim()}
            style={{
              width: '100%', background: ACC, color: '#fff',
              border: 'none', borderRadius: 8, padding: '11px 0',
              fontSize: 14, fontWeight: 600,
              cursor: loading || !tok.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !tok.trim() ? 0.65 : 1,
            }}
          >
            {loading ? 'Verifying…' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  title:     string
  value:     string
  sub?:      string
  icon:      React.ElementType
  iconColor: string
  iconBg:    string
  alert?:    boolean
}

function KpiCard({ title, value, sub, icon: Icon, iconColor, iconBg, alert }: KpiCardProps) {
  return (
    <div style={{
      background: SURF,
      border: `1px solid ${alert ? 'rgba(239,68,68,0.35)' : BDR}`,
      borderRadius: 12, padding: '20px 22px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 14,
      }}>
        <p style={{ color: T2, fontSize: 12, margin: 0, fontWeight: 500, letterSpacing: '0.2px' }}>
          {title}
        </p>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={17} color={iconColor} />
        </div>
      </div>
      <p style={{
        color: alert ? '#FCA5A5' : T1,
        fontSize: 26, fontWeight: 700, margin: '0 0 5px',
        letterSpacing: '-0.5px', lineHeight: 1,
      }}>
        {value}
      </p>
      {sub && <p style={{ color: T3, fontSize: 11, margin: 0 }}>{sub}</p>}
    </div>
  )
}

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
interface ChartTooltipProps {
  active?:     boolean
  payload?:    { value: number }[]
  label?:      string
  isCurrency?: boolean
}

function ChartTooltip({ active, payload, label, isCurrency }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: ELEV, border: `1px solid ${BDR}`,
      borderRadius: 8, padding: '8px 14px',
    }}>
      <p style={{ color: T2, fontSize: 11, margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: T1, fontSize: 14, fontWeight: 700, margin: 0 }}>
        {isCurrency ? formatCurrency(payload[0].value) : formatNum(payload[0].value)}
      </p>
    </div>
  )
}

// ─── Alert Item ───────────────────────────────────────────────────────────────
function AlertItem({ alert }: { alert: AlertData }) {
  const cfg = {
    error:   { bg: 'rgba(239,68,68,0.1)',  text: '#FCA5A5', border: 'rgba(239,68,68,0.25)' },
    warning: { bg: 'rgba(245,158,11,0.1)', text: '#FCD34D', border: 'rgba(245,158,11,0.25)' },
    info:    { bg: 'rgba(99,102,241,0.1)', text: '#A5B4FC', border: 'rgba(99,102,241,0.25)' },
  }[alert.severity]

  return (
    <a
      href={alert.href}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 10, textDecoration: 'none', cursor: 'pointer',
      }}
    >
      <AlertTriangle size={15} color={cfg.text} style={{ flexShrink: 0 }} />
      <p style={{ color: T1, fontSize: 13, margin: 0, flex: 1, lineHeight: 1.4 }}>
        {alert.message}
      </p>
      <ChevronRight size={13} color={T3} />
    </a>
  )
}

// ─── Order State Badge ────────────────────────────────────────────────────────
function StateBadge({ state }: { state: string }) {
  const col = ORDER_STATE_CFG[state] ?? { bg: 'rgba(107,114,128,0.15)', text: '#9CA3AF' }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      background: col.bg, color: col.text,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap',
    }}>
      {state}
    </span>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{
      width: 40, height: 40,
      border: `3px solid ${BDR}`, borderTopColor: ACC,
      borderRadius: '50%', animation: 'adm-spin 0.8s linear infinite',
    }} />
  )
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [data,      setData]      = useState<DashboardData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    const tok = getAdminToken()
    if (!tok) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/admin/dashboard', {
        headers: { 'x-admin-token': tok },
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Failed to load dashboard')
        return
      }
      setData(json as DashboardData)
      setLastFetch(new Date())
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Initial loading (no data yet) ──────────────────────────────────────────
  if (loading && !data) {
    return (
      <div style={{
        minHeight: '100vh', background: BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <style>{`@keyframes adm-spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <Spinner />
          </div>
          <p style={{ color: T2, fontSize: 14 }}>Loading dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Fatal error (no cached data) ───────────────────────────────────────────
  if (error && !data) {
    return (
      <div style={{
        minHeight: '100vh', background: BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <style>{`@keyframes adm-spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertCircle size={40} color="#FCA5A5" style={{ marginBottom: 16 }} />
          <p style={{ color: T1, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Failed to load</p>
          <p style={{ color: T2, fontSize: 14, marginBottom: 24 }}>{error}</p>
          <button
            onClick={() => fetchData()}
            style={{
              background: ACC, color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 28px',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { kpis, charts, topProducts, recentOrders, alerts } = data
  const hasErrorAlerts = alerts.some(a => a.severity === 'error')

  // Prepare chart series with readable x-axis labels
  const revChart = charts.revenueByDay.map(d => ({ ...d, label: fmtChartDate(d.date) }))
  const ordChart = charts.ordersByDay.map(d => ({ ...d, label: fmtChartDate(d.date) }))

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '32px 40px' }}>
      <style>{`@keyframes adm-spin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 32,
      }}>
        <div>
          <h1 style={{
            color: T1, fontSize: 24, fontWeight: 700,
            margin: '0 0 5px', letterSpacing: '-0.5px',
          }}>
            Admin Dashboard
          </h1>
          <p style={{ color: T3, fontSize: 13, margin: 0 }}>
            {lastFetch
              ? `Last updated ${fmtDateTime(lastFetch.toISOString())}`
              : 'Global marketplace overview'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Seller Applications quick-link with pending badge */}
          <a
            href="/admin/seller-applications"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: SURF, border: `1px solid ${BDR}`,
              borderRadius: 8, padding: '8px 14px',
              color: T2, fontSize: 13, textDecoration: 'none',
            }}
          >
            Applications
            {kpis.pendingApplications > 0 && (
              <span style={{
                background: 'rgba(245,158,11,0.2)', color: '#FCD34D',
                borderRadius: 20, padding: '1px 7px',
                fontSize: 11, fontWeight: 700,
              }}>
                {kpis.pendingApplications}
              </span>
            )}
          </a>

          {/* Notifications bell */}
          <div style={{ position: 'relative' }}>
            <NotificationBell
              apiBase="/api/admin/notifications"
              viewAllHref="/admin/notifications"
              fetchInit={{ headers: { 'x-admin-token': getAdminToken() } }}
              color={T2}
            />
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchData()}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: SURF, border: `1px solid ${BDR}`,
              borderRadius: 8, padding: '8px 14px',
              color: T2, fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={13}
              style={{ animation: loading ? 'adm-spin 0.8s linear infinite' : 'none' }}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stale-data error banner ───────────────────────────────────────────── */}
      {error && data && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle size={15} color="#FCA5A5" />
          <p style={{ color: '#FCA5A5', fontSize: 13, margin: 0 }}>
            Refresh failed: {error} — showing cached data
          </p>
        </div>
      )}

      {/* ── KPI Row 1 — Revenue & Orders ─────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14, marginBottom: 14,
      }}>
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          sub="All time · paid orders"
          icon={DollarSign}
          iconColor="#6EE7B7"
          iconBg="rgba(16,185,129,0.15)"
        />
        <KpiCard
          title="30-Day Revenue"
          value={formatCurrency(kpis.monthRevenue)}
          sub={`Avg ${formatCurrency(kpis.avgOrderValue)} / order`}
          icon={TrendingUp}
          iconColor="#93C5FD"
          iconBg="rgba(59,130,246,0.15)"
        />
        <KpiCard
          title="Total Orders"
          value={formatNum(kpis.totalOrders)}
          sub={`${kpis.refundRate}% refund rate`}
          icon={ShoppingCart}
          iconColor="#C4B5FD"
          iconBg="rgba(139,92,246,0.15)"
        />
        <KpiCard
          title="30-Day Orders"
          value={formatNum(kpis.monthOrders)}
          sub={`${formatNum(kpis.paidOrders)} paid all time`}
          icon={Activity}
          iconColor="#A5B4FC"
          iconBg="rgba(99,102,241,0.15)"
        />
      </div>

      {/* ── KPI Row 2 — Marketplace Health ───────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14, marginBottom: 28,
      }}>
        <KpiCard
          title="Active Sellers"
          value={formatNum(kpis.totalSellers)}
          sub="Approved seller accounts"
          icon={Users}
          iconColor="#5EEAD4"
          iconBg="rgba(20,184,166,0.15)"
        />
        <KpiCard
          title="Live Products"
          value={formatNum(kpis.approvedProducts)}
          sub={
            kpis.pendingModeration > 0
              ? `${kpis.pendingModeration} pending review`
              : 'All reviewed'
          }
          icon={Package}
          iconColor="#67E8F9"
          iconBg="rgba(6,182,212,0.15)"
        />
        <KpiCard
          title="Pending Applications"
          value={formatNum(kpis.pendingApplications)}
          sub="Awaiting admin review"
          icon={Clock}
          iconColor="#FCD34D"
          iconBg="rgba(245,158,11,0.15)"
          alert={kpis.pendingApplications > 0}
        />
        <KpiCard
          title="Pending Payouts"
          value={formatNum(kpis.pendingPayouts)}
          sub={kpis.failedPayouts > 0 ? `${kpis.failedPayouts} failed` : 'No failures'}
          icon={Zap}
          iconColor="#FBB85F"
          iconBg="rgba(249,115,22,0.15)"
          alert={kpis.failedPayouts > 0}
        />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 14, marginBottom: 14,
      }}>
        {/* Revenue — area chart */}
        <div style={{
          background: SURF, border: `1px solid ${BDR}`,
          borderRadius: 12, padding: 24,
        }}>
          <p style={{ color: T1, fontSize: 15, fontWeight: 600, margin: '0 0 3px' }}>
            Revenue — last 30 days
          </p>
          <p style={{ color: T3, fontSize: 12, margin: '0 0 20px' }}>Daily paid-order revenue</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ACC} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={ACC} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BDR} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: T3, fontSize: 10 }}
                tickLine={false} axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: T3, fontSize: 10 }}
                tickLine={false} axisLine={false}
                tickFormatter={v => v === 0 ? '0' : `$${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                content={(props: unknown) => (
                  <ChartTooltip {...(props as ChartTooltipProps)} isCurrency />
                )}
              />
              <Area
                type="monotone" dataKey="value"
                stroke={ACC} strokeWidth={2}
                fill="url(#revGrad)" dot={false}
                activeDot={{ r: 4, fill: ACC }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders — bar chart */}
        <div style={{
          background: SURF, border: `1px solid ${BDR}`,
          borderRadius: 12, padding: 24,
        }}>
          <p style={{ color: T1, fontSize: 15, fontWeight: 600, margin: '0 0 3px' }}>
            Orders — last 30 days
          </p>
          <p style={{ color: T3, fontSize: 12, margin: '0 0 20px' }}>Daily order volume</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ordChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BDR} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: T3, fontSize: 10 }}
                tickLine={false} axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: T3, fontSize: 10 }}
                tickLine={false} axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={(props: unknown) => (
                  <ChartTooltip {...(props as ChartTooltipProps)} />
                )}
              />
              <Bar dataKey="value" fill={ACC} radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Top Products + Operational Alerts ────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 14, marginBottom: 14,
      }}>

        {/* Top Products */}
        <div style={{
          background: SURF, border: `1px solid ${BDR}`,
          borderRadius: 12, padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Star size={15} color={ACC} />
            <p style={{ color: T1, fontSize: 15, fontWeight: 600, margin: 0 }}>Top Products</p>
            <p style={{ color: T3, fontSize: 11, margin: '0 0 0 auto' }}>by revenue</p>
          </div>

          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <Package size={28} color={T3} style={{ marginBottom: 10 }} />
              <p style={{ color: T3, fontSize: 13, margin: 0 }}>No sales data yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topProducts.map((p, i) => {
                const rankBg  = i === 0
                  ? 'rgba(251,191,36,0.18)'
                  : i === 1
                  ? 'rgba(156,163,175,0.14)'
                  : 'rgba(107,114,128,0.1)'
                const rankCol = i === 0 ? '#FCD34D' : i === 1 ? '#D1D5DB' : T3
                return (
                  <div key={p.productId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, background: rankBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: rankCol }}>#{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: T1, fontSize: 13, fontWeight: 500, margin: 0,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {p.title}
                      </p>
                      <p style={{ color: T3, fontSize: 11, margin: 0 }}>
                        {formatNum(p.unitsSold)} units sold
                      </p>
                    </div>
                    <p style={{
                      color: '#6EE7B7', fontSize: 13, fontWeight: 600,
                      margin: 0, whiteSpace: 'nowrap',
                    }}>
                      {formatCurrency(p.revenue)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Operational Alerts */}
        <div style={{
          background: SURF, border: `1px solid ${BDR}`,
          borderRadius: 12, padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <AlertTriangle
              size={15}
              color={
                hasErrorAlerts
                  ? '#FCA5A5'
                  : alerts.length > 0
                  ? '#FCD34D'
                  : '#6EE7B7'
              }
            />
            <p style={{ color: T1, fontSize: 15, fontWeight: 600, margin: 0 }}>
              Operational Alerts
            </p>
            {alerts.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: hasErrorAlerts
                  ? 'rgba(239,68,68,0.15)'
                  : 'rgba(245,158,11,0.15)',
                color: hasErrorAlerts ? '#FCA5A5' : '#FCD34D',
                borderRadius: 20, padding: '2px 9px',
                fontSize: 11, fontWeight: 700,
              }}>
                {alerts.length}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'rgba(16,185,129,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <Shield size={20} color="#6EE7B7" />
              </div>
              <p style={{ color: '#6EE7B7', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>
                All systems normal
              </p>
              <p style={{ color: T3, fontSize: 12, margin: 0 }}>No active alerts</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Orders table ───────────────────────────────────────────────── */}
      <div style={{
        background: SURF, border: `1px solid ${BDR}`,
        borderRadius: 12, padding: 24,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 20,
        }}>
          <p style={{ color: T1, fontSize: 15, fontWeight: 600, margin: 0 }}>Recent Orders</p>
          <p style={{ color: T3, fontSize: 12, margin: 0 }}>Last 10 orders</p>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <ShoppingCart size={28} color={T3} style={{ marginBottom: 10 }} />
            <p style={{ color: T3, fontSize: 13, margin: 0 }}>No orders yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Order ID', 'State', 'Payment', 'Amount', 'Date'].map(h => (
                    <th
                      key={h}
                      style={{
                        color: T3, fontSize: 10, fontWeight: 600,
                        textAlign: 'left', padding: '0 14px 12px',
                        textTransform: 'uppercase', letterSpacing: '0.6px',
                        borderBottom: `1px solid ${BDR}`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o, i) => (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: i < recentOrders.length - 1
                        ? `1px solid ${BDR}`
                        : 'none',
                    }}
                  >
                    <td style={{
                      padding: '13px 14px', color: T2,
                      fontSize: 12, fontFamily: 'monospace',
                    }}>
                      {o.id.slice(0, 8).toUpperCase()}
                    </td>

                    <td style={{ padding: '13px 14px' }}>
                      <StateBadge state={o.state} />
                    </td>

                    <td style={{ padding: '13px 14px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px',
                        borderRadius: 20,
                        background:
                          o.payment_status === 'paid'
                            ? 'rgba(16,185,129,0.15)'
                            : o.payment_status === 'failed'
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(245,158,11,0.15)',
                        color:
                          o.payment_status === 'paid'
                            ? '#6EE7B7'
                            : o.payment_status === 'failed'
                            ? '#FCA5A5'
                            : '#FCD34D',
                        fontSize: 11, fontWeight: 600,
                        textTransform: 'capitalize',
                      }}>
                        {o.payment_status}
                      </span>
                    </td>

                    <td style={{ padding: '13px 14px' }}>
                      <span style={{ color: T1, fontSize: 13, fontWeight: 600 }}>
                        {formatCurrency(Number(o.total_amount ?? 0))}
                      </span>
                      {o.currency && o.currency.toUpperCase() !== 'USD' && (
                        <span style={{ color: T3, fontSize: 11, marginLeft: 5 }}>
                          {o.currency.toUpperCase()}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '13px 14px', color: T3, fontSize: 12 }}>
                      {fmtDateTime(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div style={{ height: 40 }} />
    </div>
  )
}
