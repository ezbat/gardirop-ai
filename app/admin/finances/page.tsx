"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { getAdminToken } from '@/lib/admin-fetch'
import Link from "next/link"
import {
  Banknote, Shield, AlertTriangle, TrendingUp, Loader2,
  RefreshCw, Wallet, Scale, Globe, ArrowUpRight, ArrowDownRight,
  CheckCircle2, XCircle, Clock, ChevronRight, BarChart3,
  Eye, Lock, Unlock, FileCheck, AlertCircle, Landmark
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

// ─── Types ──────────────────────────────────────────────────────────

interface FinancialOverview {
  totalEscrow: number
  totalSellerLiability: number
  platformRevenue: number
  refundExposure: number
  paymentFees: number
  taxCollected: number
  chargebackRate: number
  chargebackCount: number
  chargebackAmount: number
  pendingPayoutAmount: number
  pendingPayoutCount: number
  riskDistribution: { low: number; medium: number; high: number; critical: number }
  vatByCountry: Array<{ country: string; totalTax: number; orderCount: number }>
  trialBalance: { balanced: boolean; totalDebit: number; totalCredit: number; accountCount: number }
}

interface PayoutBatch {
  id: string
  seller_id: string
  amount: number
  currency: string
  status: string
  scheduled_date: string
  hold_reason: string | null
  risk_score: number
  sellers?: { shop_name: string }
}

interface Chargeback {
  id: string
  orderId: string
  sellerId: string
  amount: number
  reasonCode: string
  status: string
  evidenceDeadline: string | null
  createdAt: string
}

interface ReconciliationRun {
  id: string
  runDate: string
  totalLedger: number
  totalProvider: number
  variance: number
  status: string
  matchedCount: number
  mismatchedCount: number
}

// ─── Component ──────────────────────────────────────────────────────

export default function AdminFinancesPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts' | 'chargebacks' | 'reconciliation' | 'ledger'>('overview')
  const [overview, setOverview] = useState<FinancialOverview | null>(null)
  const [payouts, setPayouts] = useState<PayoutBatch[]>([])
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([])
  const [chargebackStats, setChargebackStats] = useState<any>(null)
  const [reconciliationRuns, setReconciliationRuns] = useState<ReconciliationRun[]>([])

  const userId = 'm3000'

  useEffect(() => {
    loadOverview()
  }, [])

  useEffect(() => {
    if (activeTab === 'payouts') loadPayouts()
    if (activeTab === 'chargebacks') loadChargebacks()
    if (activeTab === 'reconciliation') loadReconciliation()
  }, [activeTab])

  const loadOverview = async () => {
    try {
      const response = await fetch('/api/admin/finances/overview', {
        headers: { 'x-admin-token': getAdminToken() }
      })
      const data = await response.json()
      if (response.ok) setOverview(data.overview)
    } catch (err) {
      console.error('Load overview error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPayouts = async () => {
    try {
      const response = await fetch('/api/admin/finances/payout-approve', {
        headers: { 'x-admin-token': getAdminToken() }
      })
      const data = await response.json()
      if (response.ok) setPayouts(data.batches || [])
    } catch (err) {
      console.error('Load payouts error:', err)
    }
  }

  const loadChargebacks = async () => {
    try {
      const response = await fetch('/api/admin/finances/chargebacks', {
        headers: { 'x-admin-token': getAdminToken() }
      })
      const data = await response.json()
      if (response.ok) {
        setChargebacks(data.chargebacks || [])
        setChargebackStats(data.stats || null)
      }
    } catch (err) {
      console.error('Load chargebacks error:', err)
    }
  }

  const loadReconciliation = async () => {
    try {
      const response = await fetch('/api/admin/finances/reconciliation', {
        headers: { 'x-admin-token': getAdminToken() }
      })
      const data = await response.json()
      if (response.ok) setReconciliationRuns(data.runs || [])
    } catch (err) {
      console.error('Load reconciliation error:', err)
    }
  }

  const handlePayoutAction = async (batchId: string, action: string) => {
    try {
      const response = await fetch('/api/admin/finances/payout-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
        body: JSON.stringify({ batchId, action }),
      })
      if (response.ok) loadPayouts()
    } catch (err) {
      console.error('Payout action error:', err)
    }
  }

  const handleRunReconciliation = async () => {
    try {
      await fetch('/api/admin/finances/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() },
        body: JSON.stringify({}),
      })
      loadReconciliation()
    } catch (err) {
      console.error('Run reconciliation error:', err)
    }
  }

  // ─── LOADING ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D97706' }} />
          <p className="text-sm" style={{ color: '#8B92A8' }}>Financial Integrity wird geladen...</p>
        </div>
      </div>
    )
  }

  // ─── RISK PIE DATA ────────────────────────────────────────────────

  const riskPieData = overview ? [
    { name: 'Low (0-30)', value: overview.riskDistribution.low, color: '#22C55E' },
    { name: 'Medium (31-60)', value: overview.riskDistribution.medium, color: '#D97706' },
    { name: 'High (61-80)', value: overview.riskDistribution.high, color: '#F97316' },
    { name: 'Critical (81-100)', value: overview.riskDistribution.critical, color: '#DC2626' },
  ].filter(d => d.value > 0) : []

  // ─── VAT BAR DATA ────────────────────────────────────────────────

  const vatBarData = (overview?.vatByCountry || []).slice(0, 10).map(v => ({
    country: v.country,
    tax: Math.round(v.totalTax * 100) / 100,
    orders: v.orderCount,
  }))

  // ─── TAB CONTENT ──────────────────────────────────────────────────

  const tabs = [
    { id: 'overview' as const, label: 'Übersicht', icon: BarChart3 },
    { id: 'payouts' as const, label: 'Auszahlungen', icon: Banknote },
    { id: 'chargebacks' as const, label: 'Chargebacks', icon: AlertTriangle },
    { id: 'reconciliation' as const, label: 'Abgleich', icon: Scale },
    { id: 'ledger' as const, label: 'Ledger', icon: Landmark },
  ]

  return (
    <div className="min-h-screen p-6" style={{ background: '#F5F5F5' }}>
      <div className="max-w-[1400px] mx-auto">

        {/* ─── HEADER ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-bold" style={{ color: '#1A1A1A' }}>
                Financial Integrity
              </h1>
              {overview?.trialBalance.balanced ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                  style={{ background: '#DCFCE7', color: '#16A34A' }}>
                  <CheckCircle2 className="w-3 h-3" /> Balanced
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                  style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  <AlertCircle className="w-3 h-3" /> Imbalance
                </span>
              )}
            </div>
            <p className="text-[13px] mt-1" style={{ color: '#8B92A8' }}>
              Double-Entry Ledger — Alle Finanzdaten verifiziert
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadOverview}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
              style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', color: '#555' }}>
              <RefreshCw className="w-4 h-4" /> Aktualisieren
            </button>
            <Link href="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
              style={{ background: '#131921', color: '#FFFFFF' }}>
              Admin Panel
            </Link>
          </div>
        </div>

        {/* ─── KPI CARDS (6-column) ──────────────── */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Escrow', value: overview?.totalEscrow ?? 0, icon: Lock, color: '#3B82F6', format: 'eur' },
            { label: 'Seller Liability', value: overview?.totalSellerLiability ?? 0, icon: Wallet, color: '#8B5CF6', format: 'eur' },
            { label: 'Platform Revenue', value: overview?.platformRevenue ?? 0, icon: TrendingUp, color: '#22C55E', format: 'eur' },
            { label: 'Refund Exposure', value: overview?.refundExposure ?? 0, icon: AlertTriangle, color: '#F97316', format: 'eur' },
            { label: 'Chargeback Rate', value: overview?.chargebackRate ?? 0, icon: Shield, color: overview?.chargebackRate && overview.chargebackRate > 1 ? '#DC2626' : '#22C55E', format: 'pct' },
            { label: 'Tax Collected', value: overview?.taxCollected ?? 0, icon: Globe, color: '#D97706', format: 'eur' },
          ].map((kpi) => {
            const Icon = kpi.icon
            const formatted = kpi.format === 'eur'
              ? `€${kpi.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `${kpi.value.toFixed(2)}%`
            return (
              <div key={kpi.label} className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-[10px] font-medium mb-1" style={{ color: '#8B92A8' }}>{kpi.label}</p>
                <p className="text-[18px] font-bold" style={{ color: '#1A1A1A' }}>{formatted}</p>
              </div>
            )
          })}
        </div>

        {/* ─── TAB BAR ───────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium flex-1 justify-center"
                style={{
                  background: activeTab === tab.id ? '#131921' : 'transparent',
                  color: activeTab === tab.id ? '#FFFFFF' : '#8B92A8',
                }}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ─── TAB: OVERVIEW ─────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                <h3 className="text-[16px] font-bold mb-1" style={{ color: '#1A1A1A' }}>
                  <Shield className="w-4 h-4 inline mr-2" style={{ color: '#D97706' }} />
                  Risk Distribution
                </h3>
                <p className="text-[11px] mb-4" style={{ color: '#8B92A8' }}>Seller Risk Score Verteilung</p>

                {riskPieData.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie data={riskPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                          paddingAngle={3} dataKey="value">
                          {riskPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {riskPieData.map(d => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                          <span className="text-[11px]" style={{ color: '#666' }}>{d.name}: <strong>{d.value}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center">
                    <p className="text-[12px]" style={{ color: '#8B92A8' }}>Keine Risiko-Daten vorhanden</p>
                  </div>
                )}
              </div>

              {/* VAT by Country */}
              <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                <h3 className="text-[16px] font-bold mb-1" style={{ color: '#1A1A1A' }}>
                  <Globe className="w-4 h-4 inline mr-2" style={{ color: '#D97706' }} />
                  VAT Collected by Country
                </h3>
                <p className="text-[11px] mb-4" style={{ color: '#8B92A8' }}>Steuereinnahmen nach Land</p>

                {vatBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={vatBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                      <XAxis dataKey="country" stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#FFF', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="tax" fill="#D97706" radius={[4, 4, 0, 0]} name="VAT (€)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[180px] flex items-center justify-center">
                    <p className="text-[12px]" style={{ color: '#8B92A8' }}>Keine Steuer-Daten vorhanden</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trial Balance Info */}
            <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
              <h3 className="text-[16px] font-bold mb-4" style={{ color: '#1A1A1A' }}>
                <Scale className="w-4 h-4 inline mr-2" style={{ color: '#D97706' }} />
                Trial Balance
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E0E0E0' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: '#8B92A8' }}>Total Debit</p>
                  <p className="text-[16px] font-bold" style={{ color: '#1A1A1A' }}>
                    €{(overview?.trialBalance.totalDebit ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E0E0E0' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: '#8B92A8' }}>Total Credit</p>
                  <p className="text-[16px] font-bold" style={{ color: '#1A1A1A' }}>
                    €{(overview?.trialBalance.totalCredit ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: '#F9FAFB', border: '1px solid #E0E0E0' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: '#8B92A8' }}>Accounts</p>
                  <p className="text-[16px] font-bold" style={{ color: '#1A1A1A' }}>
                    {overview?.trialBalance.accountCount ?? 0}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{
                  background: overview?.trialBalance.balanced ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${overview?.trialBalance.balanced ? '#BBF7D0' : '#FECACA'}`,
                }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: '#8B92A8' }}>Status</p>
                  <p className="text-[16px] font-bold" style={{
                    color: overview?.trialBalance.balanced ? '#16A34A' : '#DC2626'
                  }}>
                    {overview?.trialBalance.balanced ? 'Balanced' : 'IMBALANCE'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                <h4 className="text-[14px] font-bold mb-3" style={{ color: '#1A1A1A' }}>Pending Payouts</h4>
                <p className="text-[28px] font-black" style={{ color: '#D97706' }}>
                  {overview?.pendingPayoutCount ?? 0}
                </p>
                <p className="text-[12px]" style={{ color: '#8B92A8' }}>
                  €{(overview?.pendingPayoutAmount ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} total
                </p>
              </div>
              <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                <h4 className="text-[14px] font-bold mb-3" style={{ color: '#1A1A1A' }}>Chargebacks (30d)</h4>
                <p className="text-[28px] font-black" style={{
                  color: (overview?.chargebackRate ?? 0) > 1 ? '#DC2626' : '#22C55E'
                }}>
                  {overview?.chargebackCount ?? 0}
                </p>
                <p className="text-[12px]" style={{ color: '#8B92A8' }}>
                  €{(overview?.chargebackAmount ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} ({(overview?.chargebackRate ?? 0).toFixed(2)}%)
                </p>
              </div>
              <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                <h4 className="text-[14px] font-bold mb-3" style={{ color: '#1A1A1A' }}>Payment Fees</h4>
                <p className="text-[28px] font-black" style={{ color: '#8B5CF6' }}>
                  €{(overview?.paymentFees ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[12px]" style={{ color: '#8B92A8' }}>Stripe processing fees</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PAYOUTS ──────────────────────── */}
        {activeTab === 'payouts' && (
          <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: '#1A1A1A' }}>Payout Batches</h3>
                <p className="text-[11px]" style={{ color: '#8B92A8' }}>Risk-weighted Auszahlungskontrolle</p>
              </div>
            </div>

            {payouts.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                    {['Seller', 'Betrag', 'Risk Score', 'Status', 'Geplant', 'Hold Grund', 'Aktionen'].map(h => (
                      <th key={h} className="text-left py-2 px-2 text-[10px] font-bold uppercase"
                        style={{ color: '#8B92A8', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((batch) => {
                    const riskColor = batch.risk_score <= 30 ? '#22C55E' : batch.risk_score <= 60 ? '#D97706' : batch.risk_score <= 80 ? '#F97316' : '#DC2626'
                    const statusColors: Record<string, string> = {
                      pending: '#D97706', held: '#DC2626', approved: '#22C55E', processing: '#3B82F6', completed: '#22C55E', failed: '#DC2626',
                    }
                    const statusColor = statusColors[batch.status] || '#8B92A8'

                    return (
                      <tr key={batch.id} style={{ borderBottom: '1px solid #E5E5E5' }}>
                        <td className="py-3 px-2">
                          <span className="text-[12px] font-medium" style={{ color: '#1A1A1A' }}>
                            {(batch as any).sellers?.shop_name || batch.seller_id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-[12px] font-bold" style={{ color: '#1A1A1A' }}>
                            €{parseFloat(String(batch.amount)).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${riskColor}15`, color: riskColor }}>
                            {batch.risk_score}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                            style={{ background: `${statusColor}15`, color: statusColor }}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-[11px]" style={{ color: '#666' }}>
                            {new Date(batch.scheduled_date).toLocaleDateString('de-DE')}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-[11px]" style={{ color: '#8B92A8' }}>
                            {batch.hold_reason || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            {batch.status === 'held' && (
                              <button onClick={() => handlePayoutAction(batch.id, 'release')}
                                className="text-[10px] font-bold px-2 py-1 rounded"
                                style={{ background: '#DCFCE7', color: '#16A34A' }}>
                                <Unlock className="w-3 h-3 inline mr-1" />Release
                              </button>
                            )}
                            {batch.status === 'pending' && (
                              <>
                                <button onClick={() => handlePayoutAction(batch.id, 'hold')}
                                  className="text-[10px] font-bold px-2 py-1 rounded"
                                  style={{ background: '#FEE2E2', color: '#DC2626' }}>
                                  <Lock className="w-3 h-3 inline mr-1" />Hold
                                </button>
                                <button onClick={() => handlePayoutAction(batch.id, 'process')}
                                  className="text-[10px] font-bold px-2 py-1 rounded"
                                  style={{ background: '#DCFCE7', color: '#16A34A' }}>
                                  <CheckCircle2 className="w-3 h-3 inline mr-1" />Process
                                </button>
                              </>
                            )}
                            {batch.status === 'approved' && (
                              <button onClick={() => handlePayoutAction(batch.id, 'process')}
                                className="text-[10px] font-bold px-2 py-1 rounded"
                                style={{ background: '#DBEAFE', color: '#2563EB' }}>
                                <Banknote className="w-3 h-3 inline mr-1" />Execute
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <Banknote className="w-10 h-10 mx-auto mb-3" style={{ color: '#CCCCCC' }} />
                <p className="text-[13px]" style={{ color: '#8B92A8' }}>Keine ausstehenden Auszahlungen</p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: CHARGEBACKS ──────────────────── */}
        {activeTab === 'chargebacks' && (
          <div className="space-y-6">
            {chargebackStats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                  <p className="text-[10px] font-medium" style={{ color: '#8B92A8' }}>Total Orders (30d)</p>
                  <p className="text-[20px] font-bold" style={{ color: '#1A1A1A' }}>{chargebackStats.totalOrders}</p>
                </div>
                <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                  <p className="text-[10px] font-medium" style={{ color: '#8B92A8' }}>Chargebacks</p>
                  <p className="text-[20px] font-bold" style={{ color: '#DC2626' }}>{chargebackStats.totalChargebacks}</p>
                </div>
                <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                  <p className="text-[10px] font-medium" style={{ color: '#8B92A8' }}>Rate</p>
                  <p className="text-[20px] font-bold" style={{
                    color: chargebackStats.rate > 1 ? '#DC2626' : '#22C55E'
                  }}>{chargebackStats.rate.toFixed(2)}%</p>
                </div>
                <div className="rounded-lg p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
                  <p className="text-[10px] font-medium" style={{ color: '#8B92A8' }}>Total Amount</p>
                  <p className="text-[20px] font-bold" style={{ color: '#F97316' }}>
                    €{chargebackStats.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
              <h3 className="text-[16px] font-bold mb-4" style={{ color: '#1A1A1A' }}>Active Chargebacks</h3>

              {chargebacks.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                      {['Order', 'Seller', 'Betrag', 'Grund', 'Status', 'Deadline', 'Erstellt'].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-[10px] font-bold uppercase"
                          style={{ color: '#8B92A8', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chargebacks.map((cb) => {
                      const isUrgent = cb.evidenceDeadline && new Date(cb.evidenceDeadline) < new Date(Date.now() + 3 * 86400000)
                      return (
                        <tr key={cb.id} style={{
                          borderBottom: '1px solid #E5E5E5',
                          background: isUrgent ? '#FEF2F2' : 'transparent',
                        }}>
                          <td className="py-3 px-2">
                            <span className="text-[11px] font-mono" style={{ color: '#666' }}>
                              {cb.orderId.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[11px]" style={{ color: '#1A1A1A' }}>
                              {cb.sellerId.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[12px] font-bold" style={{ color: '#DC2626' }}>
                              €{cb.amount.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: '#FEF3C7', color: '#92400E' }}>
                              {cb.reasonCode || 'unknown'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                              style={{ background: '#FEE2E2', color: '#DC2626' }}>
                              {cb.status}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[11px]" style={{ color: isUrgent ? '#DC2626' : '#666' }}>
                              {cb.evidenceDeadline
                                ? new Date(cb.evidenceDeadline).toLocaleDateString('de-DE')
                                : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[11px]" style={{ color: '#8B92A8' }}>
                              {new Date(cb.createdAt).toLocaleDateString('de-DE')}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center">
                  <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: '#CCCCCC' }} />
                  <p className="text-[13px]" style={{ color: '#8B92A8' }}>Keine aktiven Chargebacks</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: RECONCILIATION ───────────────── */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-bold" style={{ color: '#1A1A1A' }}>Payment Reconciliation</h3>
                <p className="text-[11px]" style={{ color: '#8B92A8' }}>Ledger vs. Stripe Abgleich</p>
              </div>
              <button onClick={handleRunReconciliation}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium"
                style={{ background: '#D97706', color: '#FFFFFF' }}>
                <FileCheck className="w-4 h-4" /> Abgleich starten
              </button>
            </div>

            <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
              {reconciliationRuns.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E0E0E0' }}>
                      {['Datum', 'Ledger', 'Provider', 'Varianz', 'Matched', 'Mismatched', 'Status'].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-[10px] font-bold uppercase"
                          style={{ color: '#8B92A8', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliationRuns.map((run) => {
                      const statusColor = run.status === 'matched' ? '#22C55E' : run.status === 'mismatch' ? '#DC2626' : '#D97706'
                      return (
                        <tr key={run.id} style={{ borderBottom: '1px solid #E5E5E5' }}>
                          <td className="py-3 px-2">
                            <span className="text-[12px] font-medium" style={{ color: '#1A1A1A' }}>
                              {run.runDate}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[12px]" style={{ color: '#666' }}>
                              €{run.totalLedger.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[12px]" style={{ color: '#666' }}>
                              €{run.totalProvider.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[12px] font-bold" style={{
                              color: run.variance === 0 ? '#22C55E' : '#DC2626'
                            }}>
                              €{run.variance.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[12px]" style={{ color: '#22C55E' }}>
                              {run.matchedCount}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[12px]" style={{
                              color: run.mismatchedCount > 0 ? '#DC2626' : '#22C55E'
                            }}>
                              {run.mismatchedCount}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                              style={{ background: `${statusColor}15`, color: statusColor }}>
                              {run.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center">
                  <Scale className="w-10 h-10 mx-auto mb-3" style={{ color: '#CCCCCC' }} />
                  <p className="text-[13px]" style={{ color: '#8B92A8' }}>Keine Abgleich-Läufe vorhanden</p>
                  <p className="text-[11px] mt-1" style={{ color: '#888888' }}>Klicken Sie auf "Abgleich starten" oben</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: LEDGER ───────────────────────── */}
        {activeTab === 'ledger' && (
          <div className="rounded-lg p-6" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
            <h3 className="text-[16px] font-bold mb-1" style={{ color: '#1A1A1A' }}>
              <Landmark className="w-4 h-4 inline mr-2" style={{ color: '#D97706' }} />
              Double-Entry Ledger
            </h3>
            <p className="text-[11px] mb-4" style={{ color: '#8B92A8' }}>
              Immutable record — Jede Transaktion erzeugt balancierte Debit/Credit Einträge
            </p>

            <div className="grid grid-cols-2 gap-6">
              {[
                { type: 'platform_cash', label: 'Platform Cash', icon: Banknote, color: '#3B82F6', description: 'Eingehende Zahlungen' },
                { type: 'escrow', label: 'Escrow', icon: Lock, color: '#D97706', description: 'Bis Lieferung gehalten' },
                { type: 'seller_balance', label: 'Seller Balances', icon: Wallet, color: '#8B5CF6', description: 'Auszahlbare Guthaben' },
                { type: 'commission_revenue', label: 'Commission Revenue', icon: TrendingUp, color: '#22C55E', description: 'Plattform-Provisionen' },
                { type: 'refund_liability', label: 'Refund Liability', icon: AlertTriangle, color: '#F97316', description: 'Ausstehende Rückerstattungen' },
                { type: 'tax_collected', label: 'Tax Collected', icon: Globe, color: '#DC2626', description: 'USt. abzuführen' },
              ].map(account => {
                const Icon = account.icon
                return (
                  <div key={account.type} className="p-4 rounded-lg"
                    style={{ background: '#F9FAFB', border: '1px solid #E0E0E0' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${account.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: account.color }} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold" style={{ color: '#1A1A1A' }}>{account.label}</p>
                        <p className="text-[10px]" style={{ color: '#8B92A8' }}>{account.description}</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono px-2 py-1 rounded"
                      style={{ background: '#F0F0F0', color: '#666' }}>
                      account_type: {account.type}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 rounded-lg" style={{ background: '#FFF7ED', border: '1px solid #FDE68A' }}>
              <p className="text-[12px] font-medium" style={{ color: '#92400E' }}>
                Constraint: Jede Transaktion muss balanciert sein — SUM(Debit) = SUM(Credit).
                Entries sind immutable und werden nie gelöscht oder geändert.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
