'use client'

/**
 * Global React Error Boundary.
 *
 * Catches unhandled React render errors, shows a fallback UI,
 * and logs the error. Prevents full-page white screens.
 *
 * Usage in layout.tsx:
 *   <ErrorBoundary>
 *     {children}
 *   </ErrorBoundary>
 */

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught React error:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      componentStack: errorInfo.componentStack?.split('\n').slice(0, 5).join('\n'),
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: 480,
            textAlign: 'center',
            padding: '2rem',
            borderRadius: 12,
            background: 'var(--lux-bg, #0B0D14)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 8,
              color: 'var(--text-primary, #F0F2F8)',
            }}>
              Etwas ist schiefgelaufen
            </h2>
            <p style={{
              fontSize: 14,
              color: 'var(--text-secondary, #8B92A8)',
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#6366F1',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
