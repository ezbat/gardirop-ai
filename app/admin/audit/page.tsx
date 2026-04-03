'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { getAdminToken } from '@/lib/admin-fetch'

interface AuditLog {
  id: string
  actor_id: string | null
  actor_type: string
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  severity: string
  request_id: string | null
  created_at: string
}

export default function AuditExplorer() {
  const { data: session } = useSession()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    severity: '',
  })

  const pageSize = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const userId = (session?.user as any)?.id

    const params = new URLSearchParams({
      limit: String(pageSize),
      offset: String(page * pageSize),
    })

    if (filters.action) params.set('action', filters.action)
    if (filters.resource_type) params.set('resource_type', filters.resource_type)
    if (filters.severity) params.set('severity', filters.severity)

    const res = await fetch(`/api/admin/audit?${params}`, {
      headers: { 'x-admin-token': getAdminToken() },
    })
    const data = await res.json()
    setLogs(data.logs || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [session, page, filters])

  useEffect(() => {
    if (session) fetchLogs()
  }, [session, fetchLogs])

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-500/15 text-blue-400'
      case 'warning': return 'bg-amber-500/15 text-amber-400'
      case 'error': return 'bg-red-500/15 text-red-400'
      case 'critical': return 'bg-red-500/25 text-red-300'
      default: return 'bg-gray-500/15 text-gray-400'
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ background: '#0B0D14', minHeight: '100vh' }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#F0F2F8' }}>Audit Log Explorer</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Filter by action..."
          value={filters.action}
          onChange={e => { setFilters({ ...filters, action: e.target.value }); setPage(0) }}
          className="px-3 py-2 border rounded-lg text-sm w-48 bg-[#1A1E2E] border-[#252A3C] text-[#F0F2F8] placeholder-[#515A72]"
        />
        <input
          type="text"
          placeholder="Filter by resource type..."
          value={filters.resource_type}
          onChange={e => { setFilters({ ...filters, resource_type: e.target.value }); setPage(0) }}
          className="px-3 py-2 border rounded-lg text-sm w-48 bg-[#1A1E2E] border-[#252A3C] text-[#F0F2F8] placeholder-[#515A72]"
        />
        <select
          value={filters.severity}
          onChange={e => { setFilters({ ...filters, severity: e.target.value }); setPage(0) }}
          className="px-3 py-2 border rounded-lg text-sm bg-[#1A1E2E] border-[#252A3C] text-[#F0F2F8]"
        >
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <span className="text-sm self-center" style={{ color: '#8B92A8' }}>
          {total} total entries
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: '#8B92A8' }}>Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid #252A3C' }}>
                  <th className="pb-2 pr-4" style={{ color: '#8B92A8' }}>Time</th>
                  <th className="pb-2 pr-4" style={{ color: '#8B92A8' }}>Severity</th>
                  <th className="pb-2 pr-4" style={{ color: '#8B92A8' }}>Actor</th>
                  <th className="pb-2 pr-4" style={{ color: '#8B92A8' }}>Action</th>
                  <th className="pb-2 pr-4" style={{ color: '#8B92A8' }}>Resource</th>
                  <th className="pb-2 pr-4" style={{ color: '#8B92A8' }}>IP</th>
                  <th className="pb-2" style={{ color: '#8B92A8' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #252A3C' }} className="hover:bg-[#111520]">
                    <td className="py-2 pr-4 text-xs whitespace-nowrap" style={{ color: '#8B92A8' }}>
                      {new Date(log.created_at).toLocaleString('de-DE')}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs" style={{ color: '#F0F2F8' }}>
                      <span style={{ color: '#515A72' }}>{log.actor_type}:</span>{' '}
                      {log.actor_id ? log.actor_id.substring(0, 12) : 'system'}
                    </td>
                    <td className="py-2 pr-4 font-medium" style={{ color: '#F0F2F8' }}>{log.action}</td>
                    <td className="py-2 pr-4 text-xs" style={{ color: '#F0F2F8' }}>
                      {log.resource_type}
                      {log.resource_id && <span style={{ color: '#515A72' }}>:{log.resource_id.substring(0, 8)}</span>}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs" style={{ color: '#515A72' }}>
                      {log.ip_address || '-'}
                    </td>
                    <td className="py-2 text-xs max-w-xs truncate" style={{ color: '#8B92A8' }}>
                      {log.details ? JSON.stringify(log.details).substring(0, 80) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <p className="text-center py-8" style={{ color: '#8B92A8' }}>No audit logs found</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 rounded text-sm disabled:opacity-50"
                style={{ border: '1px solid #252A3C', color: '#F0F2F8', background: '#1A1E2E' }}
              >
                Previous
              </button>
              <span className="text-sm" style={{ color: '#8B92A8' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 rounded text-sm disabled:opacity-50"
                style={{ border: '1px solid #252A3C', color: '#F0F2F8', background: '#1A1E2E' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
