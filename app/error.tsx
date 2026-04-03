'use client'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#F5F5F5' }}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: '#FEE2E2' }}>
          <svg className="w-8 h-8" style={{ color: '#DC2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-[20px] font-bold mb-2" style={{ color: '#1A1A1A' }}>
          Etwas ist schiefgelaufen
        </h1>
        <p className="text-[14px] mb-8" style={{ color: '#6B6B6B' }}>
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset}
            className="px-6 py-3 rounded-xl text-[14px] font-semibold text-white"
            style={{ background: '#D97706' }}>
            Erneut versuchen
          </button>
          <a href="/"
            className="px-6 py-3 rounded-xl text-[14px] font-semibold"
            style={{ background: '#FFF', border: '1px solid #E5E5E5', color: '#1A1A1A' }}>
            Zur Startseite
          </a>
        </div>
      </div>
    </div>
  )
}
