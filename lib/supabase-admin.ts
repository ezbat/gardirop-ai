import { createClient } from '@supabase/supabase-js'

// SERVICE ROLE KEY — bypasses all RLS. Server-side only!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Startup validation — fail fast on missing config
if (!supabaseUrl) {
  console.error('[supabase-admin] NEXT_PUBLIC_SUPABASE_URL is not set')
}

if (!supabaseServiceKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is required in production')
  }
  console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not set — DB calls will fail')
}

// Guard: service role key must NEVER be a NEXT_PUBLIC_ var
if (
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY
) {
  throw new Error(
    '[supabase-admin] FATAL: Service role key found in a NEXT_PUBLIC_ variable! ' +
    'This exposes the key to the browser. Remove the NEXT_PUBLIC_ prefix immediately.'
  )
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
