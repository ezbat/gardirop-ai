// ─── Request Context Extraction ──────────────────────────
// Extracts request metadata for logging and audit trail

export interface RequestContext {
  requestId: string
  ip: string
  userAgent: string
}

export function extractRequestContext(request: Request): RequestContext {
  const requestId = crypto.randomUUID()

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'unknown'

  const userAgent = request.headers.get('user-agent') || 'unknown'

  return { requestId, ip, userAgent }
}
