import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#F5F5F5' }}>
      <div className="text-center max-w-md">
        <p className="text-[64px] font-black mb-2" style={{ color: '#D97706' }}>404</p>
        <h1 className="text-[20px] font-bold mb-2" style={{ color: '#1A1A1A' }}>
          Seite nicht gefunden
        </h1>
        <p className="text-[14px] mb-8" style={{ color: '#6B6B6B' }}>
          Die angeforderte Seite existiert nicht oder wurde verschoben.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="px-6 py-3 rounded-xl text-[14px] font-semibold text-white"
            style={{ background: '#D97706' }}>
            Zur Startseite
          </Link>
          <Link href="/explore"
            className="px-6 py-3 rounded-xl text-[14px] font-semibold"
            style={{ background: '#FFF', border: '1px solid #E5E5E5', color: '#1A1A1A' }}>
            Produkte entdecken
          </Link>
        </div>
      </div>
    </div>
  )
}
