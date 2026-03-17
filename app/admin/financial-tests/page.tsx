'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, CheckCircle, XCircle, Clock, Shield, RefreshCw, AlertTriangle } from 'lucide-react'

interface AssertionResult {
  label: string
  expected: string | number
  actual: string | number
  passed: boolean
}

interface TestResult {
  scenario: string
  description: string
  passed: boolean
  assertions: AssertionResult[]
  durationMs: number
  error?: string
}

interface FullTestReport {
  runId: string
  timestamp: string
  environment: {
    currency: string
    commissionRate: number
    payoutHoldDays: number
    cartReserveMin: number
  }
  scenarios: TestResult[]
  globalIntegrityCheck: {
    totalDebit: number
    totalCredit: number
    diff: number
    balanced: boolean
  }
  summary: {
    total: number
    passed: number
    failed: number
    passRate: string
  }
  proofs: {
    ledgerBalanced: boolean
    commissionCorrect: boolean
    noNegativeBalance: boolean
    duplicateWebhookSwallowed: boolean
  }
}

export default function FinancialTestsPage() {
  const [report, setReport] = useState<FullTestReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)

  const runTests = async () => {
    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const res = await fetch('/api/system/financial-tests')
      const data = await res.json()

      if (data.error && !data.scenarios) {
        setError(data.message || data.error)
      } else {
        setReport(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run tests')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1A1A2E', color: 'white', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Link href="/admin" style={{ color: '#ccc', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </Link>
          <Shield size={24} style={{ color: '#F59E0B' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Financial Integrity Tests</h1>
        </div>
        <p style={{ color: '#9CA3AF', fontSize: 14, margin: 0 }}>
          8 scenarios proving ledger balance, commission accuracy, refund safety, and webhook idempotency
        </p>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
        {/* Environment Card */}
        <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Test Environment
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {[
              { label: 'Mode', value: 'Stripe Test' },
              { label: 'Currency', value: 'EUR' },
              { label: 'Commission', value: 'Elektronik 8%' },
              { label: 'Payout Hold', value: '7 days' },
              { label: 'Cart Reserve', value: '15 min' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1F2937' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={runTests}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 24px', backgroundColor: loading ? '#9CA3AF' : '#1A1A2E',
            color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 10, marginBottom: 24, transition: 'background 0.2s',
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
              Running 8 scenarios...
            </>
          ) : (
            <>
              <Play size={20} />
              Run All Financial Tests
            </>
          )}
        </button>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', fontWeight: 600 }}>
              <XCircle size={18} /> Test Execution Failed
            </div>
            <p style={{ color: '#991B1B', marginTop: 8, fontSize: 14 }}>{error}</p>
          </div>
        )}

        {report && (
          <>
            {/* 4 Proofs */}
            <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #E5E7EB' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1F2937' }}>
                4 Proofs
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Double-Entry Balanced', ok: report.proofs.ledgerBalanced, desc: 'Every transaction SUM(D)=SUM(C)' },
                  { label: 'Commission Correct', ok: report.proofs.commissionCorrect, desc: '8% calculated and proportional' },
                  { label: 'No Negative Balance', ok: report.proofs.noNegativeBalance, desc: 'Refund/CB safe for sellers' },
                  { label: 'Webhook Idempotent', ok: report.proofs.duplicateWebhookSwallowed, desc: 'Duplicate events swallowed' },
                ].map(proof => (
                  <div
                    key={proof.label}
                    style={{
                      padding: 16, borderRadius: 10,
                      backgroundColor: proof.ok ? '#F0FDF4' : '#FEF2F2',
                      border: `1px solid ${proof.ok ? '#BBF7D0' : '#FECACA'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {proof.ok
                        ? <CheckCircle size={20} style={{ color: '#16A34A' }} />
                        : <XCircle size={20} style={{ color: '#DC2626' }} />
                      }
                      <span style={{ fontWeight: 700, fontSize: 14, color: proof.ok ? '#166534' : '#991B1B' }}>
                        {proof.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{proof.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Global Integrity */}
            <div style={{
              backgroundColor: report.globalIntegrityCheck.balanced ? '#F0FDF4' : '#FEF2F2',
              borderRadius: 12, padding: 20, marginBottom: 20,
              border: `1px solid ${report.globalIntegrityCheck.balanced ? '#BBF7D0' : '#FECACA'}`,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                {report.globalIntegrityCheck.balanced
                  ? <CheckCircle size={18} style={{ color: '#16A34A' }} />
                  : <AlertTriangle size={18} style={{ color: '#DC2626' }} />
                }
                Global Integrity Check
              </h3>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Total Debit</span>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{report.globalIntegrityCheck.totalDebit.toFixed(2)} EUR</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Total Credit</span>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{report.globalIntegrityCheck.totalCredit.toFixed(2)} EUR</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>Difference</span>
                  <div style={{ fontSize: 18, fontWeight: 700, color: report.globalIntegrityCheck.diff === 0 ? '#16A34A' : '#DC2626' }}>
                    {report.globalIntegrityCheck.diff.toFixed(2)} EUR
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>
                  Results: {report.summary.passed}/{report.summary.total} passed
                </h3>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  backgroundColor: report.summary.failed === 0 ? '#DCFCE7' : '#FEE2E2',
                  color: report.summary.failed === 0 ? '#166534' : '#991B1B',
                }}>
                  {report.summary.passRate}
                </span>
              </div>
            </div>

            {/* Scenario Details */}
            {report.scenarios.map(scenario => (
              <div
                key={scenario.scenario}
                style={{
                  backgroundColor: 'white', borderRadius: 12, marginBottom: 12,
                  border: `1px solid ${scenario.passed ? '#E5E7EB' : '#FECACA'}`,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setExpandedScenario(expandedScenario === scenario.scenario ? null : scenario.scenario)}
                  style={{
                    width: '100%', padding: '16px 20px', border: 'none', backgroundColor: 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  }}
                >
                  {scenario.passed
                    ? <CheckCircle size={20} style={{ color: '#16A34A', flexShrink: 0 }} />
                    : <XCircle size={20} style={{ color: '#DC2626', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1F2937' }}>{scenario.scenario}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{scenario.description}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Clock size={14} style={{ color: '#9CA3AF' }} />
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>{scenario.durationMs}ms</span>
                  </div>
                </button>

                {expandedScenario === scenario.scenario && (
                  <div style={{ borderTop: '1px solid #E5E7EB', padding: '16px 20px' }}>
                    {scenario.error && (
                      <div style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#991B1B' }}>
                        Error: {scenario.error}
                      </div>
                    )}
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <th style={{ textAlign: 'left', padding: '8px 0', color: '#6B7280', fontWeight: 600 }}>Assertion</th>
                          <th style={{ textAlign: 'right', padding: '8px 0', color: '#6B7280', fontWeight: 600 }}>Expected</th>
                          <th style={{ textAlign: 'right', padding: '8px 0', color: '#6B7280', fontWeight: 600 }}>Actual</th>
                          <th style={{ textAlign: 'center', padding: '8px 0', width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenario.assertions.map((a, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '8px 0', color: '#374151' }}>{a.label}</td>
                            <td style={{ textAlign: 'right', padding: '8px 0', color: '#6B7280', fontFamily: 'monospace' }}>
                              {String(a.expected)}
                            </td>
                            <td style={{ textAlign: 'right', padding: '8px 0', fontFamily: 'monospace', fontWeight: 600, color: a.passed ? '#16A34A' : '#DC2626' }}>
                              {String(a.actual)}
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0' }}>
                              {a.passed
                                ? <CheckCircle size={16} style={{ color: '#16A34A' }} />
                                : <XCircle size={16} style={{ color: '#DC2626' }} />
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* Timestamp */}
            <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 24 }}>
              Run ID: {report.runId} | {new Date(report.timestamp).toLocaleString()}
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
