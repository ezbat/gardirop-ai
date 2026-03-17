'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface Stats {
  users: { total: number }
  sellers: { total: number; pending: number; approved: number; rejected: number }
  products: { total: number; pending: number; approved: number; rejected: number }
  outfits: { total: number; pending: number; approved: number; rejected: number }
  orders: { total: number; totalRevenue: number; recent: any[] }
  dailyStats: { date: string; users: number; orders: number; revenue: number }[]
}

/**
 * Design tokens (same as admin layout):
 *   page bg  #0B0D14   surface  #111520   elevated  #1A1E2E
 *   border   #252A3C   subtle   #1E2235
 *   text-1   #F0F2F8   text-2   #8B92A8   text-3    #515A72
 *   accent   #6366F1
 */

const PIE_COLORS = ['#6366F1', '#10B981', '#EF4444', '#F59E0B']

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  subWarning,
  iconBg,
  iconColor,
  iconPath,
  href,
}: {
  label: string
  value: string | number
  sub?: string
  subWarning?: boolean
  iconBg: string
  iconColor: string
  iconPath: string
  href?: string
}) {
  const inner = (
    <div
      className="rounded-xl p-[22px] flex items-start justify-between gap-[12px]
        transition-shadow duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
      style={{
        background: '#111520',
        border: '1px solid #252A3C',
      }}
    >
      <div>
        <p className="text-[12px] font-medium" style={{ color: '#8B92A8' }}>{label}</p>
        <p className="text-[28px] font-bold mt-[6px]" style={{ color: '#F0F2F8' }}>{value}</p>
        {sub && (
          <p
            className="text-[12px] mt-[4px] font-medium"
            style={{ color: subWarning ? '#FCD34D' : '#515A72' }}
          >
            {sub}
          </p>
        )}
      </div>
      <div
        className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d={iconPath} />
        </svg>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">
        {inner}
      </Link>
    )
  }
  return inner
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const darkTooltip = {
  contentStyle: {
    background: '#1A1E2E',
    border: '1px solid #252A3C',
    borderRadius: '8px',
    color: '#F0F2F8',
    fontSize: '12px',
  },
  itemStyle: { color: '#F0F2F8' },
  labelStyle: { color: '#8B92A8' },
}

// ── Badge helper ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    completed: { bg: 'rgba(16,185,129,0.15)',  color: '#6EE7B7' },
    paid:       { bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7' },
    pending:   { bg: 'rgba(245,158,11,0.15)',  color: '#FCD34D' },
    cancelled: { bg: 'rgba(239,68,68,0.15)',   color: '#FCA5A5' },
    failed:    { bg: 'rgba(239,68,68,0.15)',   color: '#FCA5A5' },
  }
  const cfg = map[status] ?? { bg: 'rgba(107,114,128,0.2)', color: '#9CA3AF' }
  return (
    <span
      className="px-[7px] py-[2px] rounded-full text-[10px] font-semibold capitalize"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {status}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-user-id': 'm3000' },
      })
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="w-[40px] h-[40px] rounded-full animate-spin"
          style={{ border: '2px solid #252A3C', borderTopColor: '#6366F1' }}
        />
      </div>
    )
  }

  const sellerStatusData = [
    { name: 'Approved', value: stats?.sellers.approved || 0 },
    { name: 'Pending',  value: stats?.sellers.pending  || 0 },
    { name: 'Rejected', value: stats?.sellers.rejected || 0 },
  ]

  const productStatusData = [
    { name: 'Approved', value: stats?.products.approved || 0 },
    { name: 'Pending',  value: stats?.products.pending  || 0 },
    { name: 'Rejected', value: stats?.products.rejected || 0 },
  ]

  return (
    <div className="space-y-[28px]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-bold" style={{ color: '#F0F2F8' }}>
          Admin Dashboard
        </h1>
        <p className="text-[13px] mt-[4px]" style={{ color: '#515A72' }}>
          Real-time platform analytics and statistics
        </p>
      </div>

      {/* ── KPI Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <StatCard
          label="Total Users"
          value={stats?.users.total || 0}
          iconBg="rgba(99,102,241,0.15)"
          iconColor="#818CF8"
          iconPath="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
        <StatCard
          label="Sellers"
          value={stats?.sellers.total || 0}
          sub={(stats?.sellers.pending || 0) > 0 ? `${stats?.sellers.pending} pending` : undefined}
          subWarning={(stats?.sellers.pending || 0) > 0}
          iconBg="rgba(16,185,129,0.15)"
          iconColor="#34D399"
          iconPath="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          href="/admin/sellers?status=pending"
        />
        <StatCard
          label="Products"
          value={stats?.products.total || 0}
          sub={(stats?.products.pending || 0) > 0 ? `${stats?.products.pending} pending` : undefined}
          subWarning={(stats?.products.pending || 0) > 0}
          iconBg="rgba(168,85,247,0.15)"
          iconColor="#C084FC"
          iconPath="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          href="/admin/products?status=pending"
        />
        <StatCard
          label="Total Revenue"
          value={`€${(stats?.orders.totalRevenue || 0).toFixed(2)}`}
          sub={`${stats?.orders.total || 0} orders`}
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#FCD34D"
          iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </div>

      {/* ── Charts Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">

        {/* Seller Status Pie */}
        <div
          className="rounded-xl p-[22px]"
          style={{ background: '#111520', border: '1px solid #252A3C' }}
        >
          <h2 className="text-[14px] font-semibold mb-[16px]" style={{ color: '#F0F2F8' }}>
            Seller Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={sellerStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {sellerStatusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...darkTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Product Status Pie */}
        <div
          className="rounded-xl p-[22px]"
          style={{ background: '#111520', border: '1px solid #252A3C' }}
        >
          <h2 className="text-[14px] font-semibold mb-[16px]" style={{ color: '#F0F2F8' }}>
            Product Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={productStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {productStatusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...darkTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Stats Line Chart */}
        {stats?.dailyStats && stats.dailyStats.length > 0 && (
          <div
            className="rounded-xl p-[22px] lg:col-span-2"
            style={{ background: '#111520', border: '1px solid #252A3C' }}
          >
            <h2 className="text-[14px] font-semibold mb-[16px]" style={{ color: '#F0F2F8' }}>
              Daily Statistics (Last 7 Days)
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2235" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#515A72', fontSize: 11 }}
                  axisLine={{ stroke: '#252A3C' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#515A72', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip {...darkTooltip} />
                <Legend
                  wrapperStyle={{ color: '#8B92A8', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="users"   stroke="#6366F1" strokeWidth={2} dot={false} name="New Users" />
                <Line type="monotone" dataKey="orders"  stroke="#10B981" strokeWidth={2} dot={false} name="Orders" />
                <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} dot={false} name="Revenue (€)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Recent Orders ───────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#111520', border: '1px solid #252A3C' }}
      >
        <div
          className="px-[22px] py-[14px]"
          style={{ borderBottom: '1px solid #1E2235' }}
        >
          <h2 className="text-[14px] font-semibold" style={{ color: '#F0F2F8' }}>
            Recent Orders
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1A1E2E', borderBottom: '1px solid #252A3C' }}>
                {['Order ID', 'Customer', 'Amount', 'Payment', 'Status', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="px-[18px] py-[10px] text-left text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: '#515A72', whiteSpace: 'nowrap' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.orders.recent ?? []).map((order, idx) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: '1px solid #1E2235',
                    background: idx % 2 === 1 ? 'rgba(26,30,46,0.35)' : 'transparent',
                  }}
                >
                  <td className="px-[18px] py-[12px] font-mono" style={{ color: '#8B92A8' }}>
                    {order.id.substring(0, 8)}…
                  </td>
                  <td className="px-[18px] py-[12px]" style={{ color: '#F0F2F8' }}>
                    {order.user?.name || order.user?.email || 'N/A'}
                  </td>
                  <td className="px-[18px] py-[12px] font-semibold" style={{ color: '#F0F2F8' }}>
                    €{Number(order.total_amount).toFixed(2)}
                  </td>
                  <td className="px-[18px] py-[12px]">
                    <StatusBadge status={order.payment_status} />
                  </td>
                  <td className="px-[18px] py-[12px]">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-[18px] py-[12px]" style={{ color: '#515A72', whiteSpace: 'nowrap' }}>
                    {new Date(order.created_at).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
              {!stats?.orders.recent?.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-[18px] py-[32px] text-center text-[12px]"
                    style={{ color: '#515A72' }}
                  >
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
