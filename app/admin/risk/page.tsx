'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface RiskScore {
  id: string
  entity_type: string
  entity_id: string
  score: number
  level: string
  factors: Array<{ name: string; score: number; weight: number; weighted_score: number; detail: string }>
  action_taken: string
  reviewed_by: string | null
  review_notes: string | null
  created_at: string
}

interface FraudSignal {
  id: string
  signal_type: string
  ip_address: string | null
  fingerprint: string | null
  severity: string
  status: string
  details: Record<string, unknown>
  created_at: string
}

interface BlockedIP {
  id: string
  ip_address: string
  reason: string
  blocked_by: string
  expires_at: string | null
  created_at: string
}

export default function RiskDashboard() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<'scores' | 'signals' | 'blocked'>('scores')
  const [riskScores, setRiskScores] = useState<RiskScore[]>([])
  const [fraudSignals, setFraudSignals] = useState<FraudSignal[]>([])
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const userId = (session?.user as any)?.id

    if (tab === 'scores') {
      const params = new URLSearchParams({ view: 'risk_scores' })
      if (levelFilter) params.set('level', levelFilter)
      const res = await fetch(`/api/admin/risk?${params}`, {
        headers: { 'x-user-id': userId || '' },
      })
      const data = await res.json()
      setRiskScores(data.scores || [])
    } else if (tab === 'signals') {
      const res = await fetch('/api/admin/risk?view=fraud_signals', {
        headers: { 'x-user-id': userId || '' },
      })
      const data = await res.json()
      setFraudSignals(data.signals || [])
    } else {
      const res = await fetch('/api/admin/risk/block-ip', {
        headers: { 'x-user-id': userId || '' },
      })
      const data = await res.json()
      setBlockedIPs(data.blocked_ips || [])
    }

    setLoading(false)
  }, [session, tab, levelFilter])

  useEffect(() => {
    if (session) fetchData()
  }, [session, fetchData])

  const levelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Risk & Fraud Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {(['scores', 'signals', 'blocked'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              tab === t ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'scores' ? 'Risk Scores' : t === 'signals' ? 'Fraud Signals' : 'Blocked IPs'}
          </button>
        ))}
      </div>

      {/* Filters for scores */}
      {tab === 'scores' && (
        <div className="flex gap-2 mb-4">
          {['', 'low', 'medium', 'high', 'critical'].map(level => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1 rounded-full text-sm ${
                levelFilter === level
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {level || 'All'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Risk Scores */}
          {tab === 'scores' && (
            <div className="space-y-4">
              {riskScores.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No risk scores found</p>
              ) : (
                riskScores.map(score => (
                  <div key={score.id} className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColor(score.level)}`}>
                          {score.level.toUpperCase()} ({score.score})
                        </span>
                        <span className="text-sm font-medium">{score.entity_type}: {score.entity_id.substring(0, 12)}...</span>
                        <span className="text-xs text-gray-500">Action: {score.action_taken}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(score.created_at).toLocaleString('de-DE')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {score.factors.map((f, i) => (
                        <div key={i} className="text-xs bg-gray-50 rounded p-2">
                          <div className="font-medium">{f.name}</div>
                          <div className="text-gray-500">{f.detail}</div>
                          <div className="mt-1">Score: {f.weighted_score} (w:{f.weight})</div>
                        </div>
                      ))}
                    </div>
                    {score.reviewed_by && (
                      <div className="mt-2 text-xs text-green-600">
                        Reviewed by {score.reviewed_by}: {score.review_notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Fraud Signals */}
          {tab === 'signals' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Severity</th>
                    <th className="pb-2">IP</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudSignals.map(signal => (
                    <tr key={signal.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{signal.signal_type}</td>
                      <td className={`py-2 font-medium ${severityColor(signal.severity)}`}>
                        {signal.severity}
                      </td>
                      <td className="py-2 font-mono text-xs">{signal.ip_address || '-'}</td>
                      <td className="py-2">{signal.status}</td>
                      <td className="py-2 text-gray-400 text-xs">
                        {new Date(signal.created_at).toLocaleString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fraudSignals.length === 0 && (
                <p className="text-gray-500 text-center py-8">No fraud signals found</p>
              )}
            </div>
          )}

          {/* Blocked IPs */}
          {tab === 'blocked' && (
            <div className="space-y-2">
              {blockedIPs.map(ip => (
                <div key={ip.id} className="flex items-center justify-between bg-white rounded-lg border p-3">
                  <div>
                    <span className="font-mono font-medium">{ip.ip_address}</span>
                    <span className="ml-3 text-sm text-gray-500">{ip.reason}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {ip.expires_at
                      ? `Expires: ${new Date(ip.expires_at).toLocaleString('de-DE')}`
                      : 'Permanent'}
                  </div>
                </div>
              ))}
              {blockedIPs.length === 0 && (
                <p className="text-gray-500 text-center py-8">No blocked IPs</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
