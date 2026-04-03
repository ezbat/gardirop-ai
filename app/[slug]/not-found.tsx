import Link from 'next/link'

export default function StoreNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0E0E10' }}>
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: '#1A1A1E' }}
        >
          <span className="text-2xl">🏪</span>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#F0F0F0' }}>
          Store nicht gefunden
        </h1>
        <p className="text-sm mb-6" style={{ color: '#777' }}>
          Dieser Store existiert nicht oder ist derzeit nicht verfügbar.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold transition-all"
          style={{ background: '#D97706', color: '#FFF' }}
        >
          Zu WEARO
        </Link>
      </div>
    </div>
  )
}
