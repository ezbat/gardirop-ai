'use client'

/**
 * /admin/dashboard — Stats Overview
 *
 * Dark admin design system:
 *   page bg     inherited #0B0D14 (from layout)
 *   surface     #111520
 *   elevated    #1A1E2E
 *   border      #252A3C / #1E2235
 *   text-1      #F0F2F8
 *   text-2      #8B92A8
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
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

// Chart palette optimised for dark backgrounds
const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444']

// ─── Status badge ─────────────────────────────────────────────────────────────
function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    paid:    { bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7' },
    pending: { bg: 'rgba(245,158,11,0.15)', color: '#FCD34D' },
    failed:  { bg: 'rgba(239,68,68,0.15)',  color: '#FCA5A5' },
  }
  const cfg = map[status] ?? { bg: 'rgba(139,146,168,0.15)', color: '#8B92A8' }
  return (
    <span
      className="inline-block px-[7px] py-[2px] rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {status || '—'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    completed: { bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7'  },
    pending:   { bg: 'rgba(245,158,11,0.15)', color: '#FCD34D'  },
    paid:      { bg: 'rgba(16,185,129,0.15)', color: '#6EE7B7'  },
    cancelled: { bg: 'rgba(239,68,68,0.15)',  color: '#FCA5A5'  },
  }
  const cfg = map[status] ?? { bg: 'rgba(139,146,168,0.15)', color: '#8B92A8' }
  return (
    <span
      className="inline-block px-[7px] py-[2px] rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {status || '—'}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, iconBg, iconColor, children, href,
}: {
  label: string
  value: string | number
  sub?: React.ReactNode
  iconBg: string
  iconColor: string
  children: React.ReactNode   // icon SVG
  href?: string
}) {
  const inner = (
    <div
      className="rounded-xl p-5 flex items-start justify-between gap-3"
      style={{ background: '#111520', border: '1px solid #252A3C' }}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-[6px]" style={{ color: '#8B92A8' }}>
          {label}
        </p>
        <p className="text-[28px] font-extrabold tabular-nums leading-none" style={{ color: '#F0F2F8' }}>
          {value}
        </p>
        {sub && <div className="mt-[5px]">{sub}</div>}
      </div>
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: iconBg, color: iconColor }}
      >
        {children}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">
        {inner}
      </Link>
    )
  }
  return inner
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { 'x-user-id': 'm3000' },
      })
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="h-9 w-9 rounded-full animate-spin"
          style={{ border: '2px solid #252A3C', borderTopColor: '#6366F1' }}
        />
      </div>
    )
  }

  const sellerPieData = [
    { name: 'Approved', value: stats?.sellers.approved || 0 },
    { name: 'Pending',  value: stats?.sellers.pending  || 0 },
    { name: 'Rejected', value: stats?.sellers.rejected || 0 },
  ]
  const productPieData = [
    { name: 'Approved', value: stats?.products.approved || 0 },
    { name: 'Pending',  value: stats?.products.pending  || 0 },
    { name: 'Rejected', value: stats?.products.rejected || 0 },
  ]

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold" style={{ color: '#F0F2F8' }}>
          Admin Dashboard
        </h1>
        <p className="text-[13px] mt-[4px]" style={{ color: '#8B92A8' }}>
          Real-time platform analytics and statistics
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          label="Total Users"
          value={stats?.users.total || 0}
          iconBg="rgba(99,102,241,0.18)"
          iconColor="#818CF8"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </StatCard>

        <StatCard
          label="Sellers"
          value={stats?.sellers.total || 0}
          sub={
            (stats?.sellers.pending || 0) > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: '#FCD34D' }}>
                {stats?.sellers.pending} pending
              </span>
            )
          }
          iconBg="rgba(16,185,129,0.18)"
          iconColor="#34D399"
          href="/admin/sellers?status=pending"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </StatCard>

        <StatCard
          label="Products"
          value={stats?.products.total || 0}
          sub={
            (stats?.products.pending || 0) > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: '#FCD34D' }}>
                {stats?.products.pending} pending
              </span>
            )
          }
          iconBg="rgba(168,85,247,0.18)"
          iconColor="#C084FC"
          href="/admin/products?status=pending"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </StatCard>

        <StatCard
          label="Total Revenue"
          value={`€${(stats?.orders.totalRevenue || 0).toFixed(2)}`}
          sub={
            <span className="text-[11px]" style={{ color: '#8B92A8' }}>
              {stats?.orders.total || 0} orders
            </span>
          }
          iconBg="rgba(245,158,11,0.18)"
          iconColor="#FBBf24"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </StatCard>

      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Seller status pie */}
        <div
          className="rounded-xl p-5"
          style={{ background: '#111520', border: '1px solid #252A3C' }}
        >
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: '#F0F2F8' }}>
            Seller Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={sellerPieData}
                cx="50%" cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {sellerPieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1A1E2E', border: '1px solid #252A3C', borderRadius: 8, color: '#F0F2F8' }}
                labelStyle={{ color: '#8B92A8' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Product status pie */}
        <div
          className="rounded-xl p-5"
          style={{ background: '#111520', border: '1px solid #252A3C' }}
        >
          <h2 className="text-[15px] font-semibold mb-4" style={{ color: '#F0F2F8' }}>
            Product Status Distribution
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={productPieData}
                cx="50%" cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {productPieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1A1E2E', border: '1px solid #252A3C', borderRadius: 8, color: '#F0F2F8' }}
                labelStyle={{ color: '#8B92A8' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily stats line chart */}
        {stats?.dailyStats && stats.dailyStats.length > 0 && (
          <div
            className="rounded-xl p-5 lg:col-span-2"
            style={{ background: '#111520', border: '1px solid #252A3C' }}
          >
            <h2 className="text-[15px] font-semibold mb-4" style={{ color: '#F0F2F8' }}>
              Daily Statistics (Last 7 Days)
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2235" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B92A8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8B92A8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1A1E2E', border: '1px solid #252A3C', borderRadius: 8, color: '#F0F2F8' }}
                  labelStyle={{ color: '#8B92A8' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#8B92A8' }}
                />
                <Line type="monotone" dataKey="users"   stroke="#6366F1" strokeWidth={2} dot={false} name="New Users"    />
                <Line type="monotone" dataKey="orders"  stroke="#10B981" strokeWidth={2} dot={false} name="Orders"       />
                <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} dot={false} name="Revenue (€)"  />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Recent orders table ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: '#111520', border: '1px solid #252A3C' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #1E2235' }}>
          <h2 className="text-[15px] font-semibold" style={{ color: '#F0F2F8' }}>
            Recent Orders
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: '#1A1E2E', borderBottom: '1px solid #252A3C' }}>
                {['Order ID', 'Customer', 'Amount', 'Payment', 'Status', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: '#8B92A8' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.orders.recent ?? []).map((order, i) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: '1px solid #1E2235',
                    background: i % 2 === 1 ? 'rgba(26,30,46,0.4)' : 'transparent',
                  }}
                  className="hover:bg-[#1A1E2E]/70 transition-colors"
                >
                  <td className="px-5 py-3 font-mono" style={{ color: '#8B92A8' }}>
                    {order.id.substring(0, 8)}…
                  </td>
                  <td className="px-5 py-3" style={{ color: '#C8CDE0' }}>
                    {order.user?.name || order.user?.email || 'N/A'}
                  </td>
                  <td className="px-5 py-3 font-semibold" style={{ color: '#F0F2F8' }}>
                    €{order.total_amount.toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <PaymentBadge status={order.payment_status} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3" style={{ color: '#8B92A8' }}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!stats?.orders.recent?.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-[13px]" style={{ color: '#515A72' }}>
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
