import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminNotification } from '@/lib/notifications'
import { sendEmail, sendAdminEmail } from '@/lib/email'
import { getApplicationReceivedEmail, getAdminNewApplicationEmail } from '@/lib/email-templates'

// ── Supabase (service-role bypasses RLS so unauthenticated applicants can also submit) ──

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const isUrl = (v?: string) => {
  if (!v?.trim()) return true
  try { new URL(v.trim().startsWith('http') ? v.trim() : `https://${v.trim()}`); return true }
  catch { return false }
}
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

// ── Validation ────────────────────────────────────────────────────────────────

type Err = { field: string; message: string }

function validate(b: Record<string, unknown>): Err[] {
  const e: Err[] = []

  // Step 1 — Contact
  if (!str(b.full_name))
    e.push({ field: 'full_name', message: 'Vollständiger Name ist erforderlich' })
  if (!isEmail(str(b.email)))
    e.push({ field: 'email', message: 'Gültige E-Mail-Adresse erforderlich' })
  if (!str(b.country))
    e.push({ field: 'country', message: 'Land ist erforderlich' })
  if (!['individual', 'company'].includes(str(b.applicant_type)))
    e.push({ field: 'applicant_type', message: 'Anmeldetyp ist erforderlich' })

  // Step 2 — Identity
  if (b.applicant_type === 'individual') {
    if (!str(b.legal_full_name))
      e.push({ field: 'legal_full_name', message: 'Rechtlicher Vor- und Nachname ist erforderlich' })
    if (!str(b.residence_country))
      e.push({ field: 'residence_country', message: 'Wohnsitzland ist erforderlich' })
  } else if (b.applicant_type === 'company') {
    if (!str(b.company_name))
      e.push({ field: 'company_name', message: 'Firmenname ist erforderlich' })
    const addr = b.company_address as Record<string, unknown> | null | undefined
    if (!str(addr?.line1))
      e.push({ field: 'company_address.line1', message: 'Firmenadresse (Straße & Hausnummer) ist erforderlich' })
    if (!str(addr?.city))
      e.push({ field: 'company_address.city', message: 'Stadt der Firmenadresse ist erforderlich' })
    if (!str(addr?.country))
      e.push({ field: 'company_address.country', message: 'Registrierungsland ist erforderlich' })
    if (!str(b.business_type))
      e.push({ field: 'business_type', message: 'Unternehmensform ist erforderlich' })
  }

  // Step 3 — Store profile
  if (!str(b.store_name))
    e.push({ field: 'store_name', message: 'Shop-Name ist erforderlich' })
  if (!Array.isArray(b.product_categories) || b.product_categories.length === 0)
    e.push({ field: 'product_categories', message: 'Mindestens eine Produktkategorie auswählen' })
  if (str(b.store_description).length < 30)
    e.push({ field: 'store_description', message: 'Shop-Beschreibung muss mindestens 30 Zeichen lang sein' })
  if (!['own_brand', 'resale', 'handmade', 'other'].includes(str(b.product_origin)))
    e.push({ field: 'product_origin', message: 'Produktherkunft ist erforderlich' })
  if (b.website_url && !isUrl(str(b.website_url)))
    e.push({ field: 'website_url', message: 'Ungültige Website-URL' })

  // Step 4 — Operations
  if (!isEmail(str(b.support_email)))
    e.push({ field: 'support_email', message: 'Gültige Kunden-Support-E-Mail ist erforderlich' })
  if (!Array.isArray(b.shipping_countries) || b.shipping_countries.length === 0)
    e.push({ field: 'shipping_countries', message: 'Mindestens ein Versandland angeben' })
  if (!['self', 'warehouse', 'dropshipping'].includes(str(b.fulfillment_model)))
    e.push({ field: 'fulfillment_model', message: 'Versandmodell ist erforderlich' })
  const ret = b.return_address as Record<string, unknown> | null | undefined
  if (!str(ret?.line1))
    e.push({ field: 'return_address.line1', message: 'Rücksendeadresse (Straße) ist erforderlich' })
  if (!str(ret?.city))
    e.push({ field: 'return_address.city', message: 'Stadt der Rücksendeadresse ist erforderlich' })
  if (!str(ret?.country))
    e.push({ field: 'return_address.country', message: 'Land der Rücksendeadresse ist erforderlich' })

  // Declarations (all five must be true)
  const declChecks: [string, string][] = [
    ['decl_accurate_info',        'Bitte bestätige, dass deine Angaben korrekt sind'],
    ['decl_terms_agreed',         'Zustimmung zu den Nutzungsbedingungen ist erforderlich'],
    ['decl_verification_consent', 'Einwilligung zu Verifizierungsanfragen ist erforderlich'],
    ['decl_product_compliance',   'Produktkonformitätserklärung ist erforderlich'],
    ['decl_privacy_acknowledged', 'Datenschutzhinweis muss bestätigt werden'],
  ]
  for (const [field, message] of declChecks) {
    if (!b[field]) e.push({ field, message })
  }

  return e
}

// ── POST /api/seller/apply ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Ungültiges Anfrage-Format' }, { status: 400 })
    }

    const errors = validate(body)
    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 422 })
    }

    const supabase = getSupabase()

    const addr = body.company_address as Record<string, unknown> | null | undefined
    const ret  = body.return_address  as Record<string, unknown>
    const sl   = body.social_links    as Record<string, unknown> | null | undefined

    const { data, error } = await supabase
      .from('seller_applications')
      .insert({
        status:        'submitted',
        user_id:       body.user_id ?? null,

        // Step 1
        full_name:      str(body.full_name),
        email:          str(body.email).toLowerCase(),
        phone:          str(body.phone) || null,
        country:        str(body.country),
        applicant_type: str(body.applicant_type),

        // Step 2a
        legal_full_name:   str(body.legal_full_name)   || null,
        date_of_birth:     body.date_of_birth           || null,
        residence_country: str(body.residence_country)  || null,

        // Step 2b
        company_name:       str(body.company_name)       || null,
        company_reg_number: str(body.company_reg_number) || null,
        vat_id:             str(body.vat_id)              || null,
        company_address: addr ? {
          line1:       str(addr.line1),
          line2:       str(addr.line2)       || undefined,
          city:        str(addr.city),
          postal_code: str(addr.postal_code) || undefined,
          country:     str(addr.country),
        } : null,
        business_type: str(body.business_type) || null,

        // Step 3
        store_name:               str(body.store_name),
        brand_name:               str(body.brand_name)           || null,
        product_categories:       Array.isArray(body.product_categories) ? body.product_categories : [],
        store_description:        str(body.store_description),
        website_url:              str(body.website_url)           || null,
        social_links: sl ? {
          instagram: str(sl.instagram) || undefined,
          tiktok:    str(sl.tiktok)    || undefined,
          youtube:   str(sl.youtube)   || undefined,
        } : null,
        estimated_monthly_orders: str(body.estimated_monthly_orders) || null,
        avg_order_value:          str(body.avg_order_value)           || null,
        product_origin:           str(body.product_origin),
        product_origin_detail:    str(body.product_origin_detail)    || null,

        // Step 4
        return_address: {
          line1:       str(ret.line1),
          city:        str(ret.city),
          postal_code: str(ret.postal_code) || undefined,
          country:     str(ret.country),
        },
        support_email:      str(body.support_email).toLowerCase(),
        shipping_countries: Array.isArray(body.shipping_countries) ? body.shipping_countries : [],
        fulfillment_model:  str(body.fulfillment_model),

        // Declarations
        decl_accurate_info:        Boolean(body.decl_accurate_info),
        decl_terms_agreed:         Boolean(body.decl_terms_agreed),
        decl_verification_consent: Boolean(body.decl_verification_consent),
        decl_product_compliance:   Boolean(body.decl_product_compliance),
        decl_privacy_acknowledged: Boolean(body.decl_privacy_acknowledged),
        decl_is_trader:            Boolean(body.decl_is_trader),
      })
      .select('id, status, created_at')
      .maybeSingle()

    if (error || !data) {
      console.error('[api/seller/apply] db error:', error)
      return NextResponse.json(
        { success: false, error: 'Bewerbung konnte nicht gespeichert werden. Bitte erneut versuchen.' },
        { status: 500 },
      )
    }

    // Best-effort admin notification
    createAdminNotification('new_seller_application', {
      body: `Neue Bewerbung von ${str(body.full_name)} (${str(body.store_name)}) wartet auf Prüfung.`,
      link: '/admin/seller-applications',
    })

    // Best-effort email: applicant confirmation
    void (async () => {
      try {
        const email = getApplicationReceivedEmail({
          applicantName: str(body.full_name),
          storeName: str(body.store_name),
        })
        await sendEmail({
          to: str(body.email).toLowerCase(),
          subject: email.subject,
          html: email.html,
          tag: 'application_received',
        })
      } catch {}
    })()

    // Best-effort email: admin notification
    void (async () => {
      try {
        const adminEmail = getAdminNewApplicationEmail({
          applicantName: str(body.full_name),
          storeName: str(body.store_name),
          email: str(body.email).toLowerCase(),
        })
        await sendAdminEmail({
          subject: adminEmail.subject,
          html: adminEmail.html,
          tag: 'admin_new_application',
        })
      } catch {}
    })()

    return NextResponse.json({
      success: true,
      application: {
        id:           data.id,
        status:       data.status,
        submitted_at: data.created_at,
      },
      message: 'Deine Bewerbung wurde erfolgreich eingereicht. Wir melden uns innerhalb von 1–3 Werktagen.',
    })

  } catch (err) {
    console.error('[api/seller/apply] unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Interner Fehler' }, { status: 500 })
  }
}
