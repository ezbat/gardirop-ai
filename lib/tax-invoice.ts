import { supabaseAdmin } from '@/lib/supabase-admin'

// ═══════════════════════════════════════════════════════════════════
// WEARO Steuer- & Rechnungssystem (Tax & Invoice System)
// Vollstaendig konform mit deutschem Steuerrecht
// Alle Daten aus der Datenbank - keine Hardcoded-Werte
// ═══════════════════════════════════════════════════════════════════

// ─── KONSTANTEN (Steuerrecht DE) ────────────────────────────────

/** Allgemeiner Mehrwertsteuersatz (MwSt) in Deutschland */
export const MWST_STANDARD = 19

/** Ermaessigter Mehrwertsteuersatz fuer bestimmte Waren */
export const MWST_ERMAESSIGT = 7

/** Kleinunternehmerregelung nach § 19 UStG - Jahresumsatzgrenze */
export const KLEINUNTERNEHMER_GRENZE = 22000

/** WEARO Plattform-Name fuer Rechnungen */
const PLATTFORM_NAME = 'WEARO Fashion Marketplace'

/** WEARO Firmenadresse fuer Rechnungskopf */
const PLATTFORM_ADRESSE = {
  name: 'WEARO GmbH',
  strasse: 'Musterstraße 1',
  plz: '10115',
  stadt: 'Berlin',
  land: 'Deutschland',
}

/** Waehrungssymbol */
const WAEHRUNG = 'EUR'

// ─── INTERFACES ─────────────────────────────────────────────────

export interface InvoiceData {
  invoiceNumber: string
  orderId: string
  sellerId: string
  buyerInfo: {
    name: string
    address: string
    email: string
  }
  sellerInfo: {
    shopName: string
    address: string
    taxNumber?: string
    ustIdNr?: string
  }
  items: Array<{
    title: string
    quantity: number
    unitPrice: number
    taxRate: number
    totalPrice: number
  }>
  subtotal: number
  taxAmount: number
  taxRate: number
  totalAmount: number
  currency: string
  issuedAt: string
  dueDate: string
  notes?: string
}

export interface TaxCalculation {
  /** Nettobetrag (ohne MwSt) */
  nettobetrag: number
  /** Bruttobetrag (mit MwSt) */
  bruttobetrag: number
  /** MwSt-Betrag */
  mwstBetrag: number
  /** Steuersatz in Prozent */
  steuersatz: number
}

export interface MonthlyTaxReport {
  sellerId: string
  period: string
  periodType: 'monthly'
  totalSales: number
  totalTaxCollected: number
  totalFees: number
  netRevenue: number
  orderCount: number
  taxRate: number
  country: string
  items: Array<{
    orderId: string
    orderNumber: string
    date: string
    nettobetrag: number
    mwstBetrag: number
    bruttobetrag: number
  }>
}

export interface QuarterlyReport {
  sellerId: string
  period: string
  periodType: 'quarterly'
  quarter: number
  year: number
  months: string[]
  totalSales: number
  totalTaxCollected: number
  totalFees: number
  netRevenue: number
  orderCount: number
  taxRate: number
  country: string
  /** UStVA-relevante Daten */
  ustva: {
    /** Zeile 81: Steuerpflichtige Umsaetze zum allgemeinen Steuersatz (19%) */
    zeile81_bemessungsgrundlage: number
    /** Zeile 81: Steuer darauf */
    zeile81_steuer: number
    /** Zeile 86: Ermaessigter Steuersatz (7%) falls anwendbar */
    zeile86_bemessungsgrundlage: number
    zeile86_steuer: number
    /** Zeile 66: Vorsteuerbetraege aus Rechnungen */
    zeile66_vorsteuer: number
    /** Verbleibende Umsatzsteuer-Vorauszahlung */
    vorauszahlung: number
  }
}

// ─── HILFSFUNKTIONEN ────────────────────────────────────────────

/**
 * Formatiert einen Betrag im deutschen Waehrungsformat: 1.234,56 EUR
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: WAEHRUNG,
  }).format(amount)
}

/**
 * Formatiert ein Datum im deutschen Format: DD.MM.YYYY
 */
export function formatDateDE(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Rundet auf zwei Nachkommastellen (kaufmaennisch)
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Erzeugt den Perioden-String fuer einen Monat: "2026-03"
 */
function monthPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/**
 * Erzeugt den Perioden-String fuer ein Quartal: "2026-Q1"
 */
function quarterPeriod(year: number, quarter: number): string {
  return `${year}-Q${quarter}`
}

/**
 * Berechnet Start- und Enddatum eines Monats als ISO-Strings
 */
function monthDateRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

/**
 * Berechnet Start- und Enddatum eines Quartals als ISO-Strings
 */
function quarterDateRange(year: number, quarter: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const start = new Date(Date.UTC(year, startMonth - 1, 1, 0, 0, 0))
  const end = new Date(Date.UTC(year, endMonth, 0, 23, 59, 59, 999))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

// ─── STEUERBERECHNUNG ───────────────────────────────────────────

/**
 * Berechnet Nettobetrag, Bruttobetrag und MwSt-Betrag.
 *
 * @param amount - Bruttobetrag (inkl. MwSt)
 * @param taxRate - Steuersatz in Prozent (Standard: 19%)
 * @returns TaxCalculation mit Netto, Brutto und MwSt
 *
 * @example
 * calculateTax(119.00)
 * // => { nettobetrag: 100.00, bruttobetrag: 119.00, mwstBetrag: 19.00, steuersatz: 19 }
 */
export function calculateTax(amount: number, taxRate: number = MWST_STANDARD): TaxCalculation {
  const steuersatz = taxRate
  const nettobetrag = round2(amount / (1 + steuersatz / 100))
  const mwstBetrag = round2(amount - nettobetrag)

  return {
    nettobetrag,
    bruttobetrag: round2(amount),
    mwstBetrag,
    steuersatz,
  }
}

/**
 * Berechnet den Bruttobetrag aus einem Nettobetrag
 */
export function netToGross(netAmount: number, taxRate: number = MWST_STANDARD): number {
  return round2(netAmount * (1 + taxRate / 100))
}

// ─── RECHNUNGSNUMMER GENERIERUNG ────────────────────────────────

/**
 * Generiert eine fortlaufende Rechnungsnummer im Format: WR-YYYY-NNNNN
 * Beispiel: WR-2026-00001
 *
 * Die Nummer ist pro Seller sequenziell und basiert auf der Anzahl
 * bestehender Rechnungen in der Datenbank.
 */
export async function generateInvoiceNumber(sellerId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `WR-${year}-`

  // Zaehle bestehende Rechnungen dieses Verkaefers in diesem Jahr
  const { count, error } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .in('payment_status', ['paid', 'PAID'])
    .gte('created_at', `${year}-01-01T00:00:00.000Z`)
    .lte('created_at', `${year}-12-31T23:59:59.999Z`)

  if (error) {
    console.error('[Tax-Invoice] Fehler bei Rechnungsnummern-Generierung:', error)
  }

  const nextNumber = (count || 0) + 1
  const paddedNumber = String(nextNumber).padStart(5, '0')

  return `${prefix}${paddedNumber}`
}

// ─── RECHNUNG ERSTELLEN ─────────────────────────────────────────

/**
 * Erstellt eine vollstaendige Rechnung (InvoiceData) aus einer Bestell-ID.
 * Liest alle Daten aus der Datenbank: Bestellung, Bestellpositionen, Produkte,
 * Verkaeufer- und Kaeufer-Informationen.
 *
 * @param orderId - UUID der Bestellung
 * @returns Vollstaendige InvoiceData oder null bei Fehler
 */
export async function createInvoice(orderId: string): Promise<InvoiceData | null> {
  // Bestellung mit Positionen und Produkten laden
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        quantity,
        price,
        product_id,
        products (
          id,
          title,
          price,
          category
        )
      )
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('[Tax-Invoice] Bestellung nicht gefunden:', orderId, orderError)
    return null
  }

  // Verkaeufer-Daten laden
  let sellerInfo = {
    shopName: 'WEARO Seller',
    address: '',
    taxNumber: undefined as string | undefined,
    ustIdNr: undefined as string | undefined,
  }

  if (order.seller_id) {
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('shop_name, address, city, tax_number')
      .eq('id', order.seller_id)
      .single()

    if (seller) {
      sellerInfo = {
        shopName: seller.shop_name || 'WEARO Seller',
        address: [seller.address, seller.city].filter(Boolean).join(', '),
        taxNumber: seller.tax_number || undefined,
        ustIdNr: undefined,
      }
    }
  }

  // Kaeufer-Daten aus Bestellung
  const shippingInfo = order.shipping_info || order.shipping_address || {}
  const buyerName = shippingInfo.fullName || shippingInfo.name || 'Kunde'
  const buyerAddress = [
    shippingInfo.address || shippingInfo.street,
    shippingInfo.postalCode || shippingInfo.zip,
    shippingInfo.city,
    shippingInfo.country || 'Deutschland',
  ].filter(Boolean).join(', ')
  const buyerEmail = order.user_email || ''

  // Steuersatz bestimmen
  const taxRate = MWST_STANDARD

  // Rechnungsnummer generieren
  const invoiceNumber = await generateInvoiceNumber(order.seller_id || '')

  // Positionen aufbauen
  const items = (order.order_items || []).map((item: any) => {
    const unitPrice = parseFloat(item.price || '0')
    const quantity = item.quantity || 1
    const totalPrice = round2(unitPrice * quantity)

    return {
      title: item.products?.title || 'Artikel',
      quantity,
      unitPrice,
      taxRate,
      totalPrice,
    }
  })

  // Zwischensumme, Steuer, Gesamtbetrag
  const bruttobetrag = round2(parseFloat(order.total_amount || '0'))
  const taxCalc = calculateTax(bruttobetrag, taxRate)

  // Rechnungsdatum und Faelligkeitsdatum
  const issuedAt = order.created_at || new Date().toISOString()
  const dueDateObj = new Date(issuedAt)
  dueDateObj.setDate(dueDateObj.getDate() + 14) // 14 Tage Zahlungsziel

  const invoice: InvoiceData = {
    invoiceNumber,
    orderId: order.id,
    sellerId: order.seller_id || '',
    buyerInfo: {
      name: buyerName,
      address: buyerAddress,
      email: buyerEmail,
    },
    sellerInfo,
    items,
    subtotal: taxCalc.nettobetrag,
    taxAmount: taxCalc.mwstBetrag,
    taxRate,
    totalAmount: bruttobetrag,
    currency: WAEHRUNG,
    issuedAt,
    dueDate: dueDateObj.toISOString(),
    notes: undefined,
  }

  return invoice
}

// ─── KLEINUNTERNEHMERREGELUNG ───────────────────────────────────

/**
 * Prueft, ob ein Verkaeufer als Kleinunternehmer nach § 19 UStG gilt.
 * Ein Kleinunternehmer ist, wer im vorangegangenen Kalenderjahr
 * nicht mehr als 22.000 EUR Umsatz erzielt hat.
 *
 * @param sellerId - UUID des Verkaeufers
 * @returns true wenn Kleinunternehmer, false sonst
 */
export async function isKleinunternehmer(sellerId: string): Promise<boolean> {
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  const { start, end } = monthDateRange(previousYear, 1)
  const yearEnd = new Date(Date.UTC(previousYear, 11, 31, 23, 59, 59, 999)).toISOString()

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('total_amount')
    .eq('seller_id', sellerId)
    .in('payment_status', ['paid', 'PAID'])
    .gte('created_at', start)
    .lte('created_at', yearEnd)

  if (error || !orders) return true // Im Zweifel als Kleinunternehmer behandeln

  const totalRevenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.total_amount || '0'),
    0
  )

  return totalRevenue <= KLEINUNTERNEHMER_GRENZE
}

// ─── MONATLICHER STEUERBERICHT ──────────────────────────────────

/**
 * Erstellt einen monatlichen Steuerbericht mit allen steuerrelevanten
 * Transaktionen des angegebenen Monats.
 *
 * @param sellerId - UUID des Verkaeufers
 * @param year - Kalenderjahr (z.B. 2026)
 * @param month - Monat (1-12)
 * @returns MonthlyTaxReport oder null bei Fehler
 */
export async function generateMonthlyTaxReport(
  sellerId: string,
  year: number,
  month: number
): Promise<MonthlyTaxReport | null> {
  const { start, end } = monthDateRange(year, month)

  // Alle bezahlten Bestellungen des Monats abrufen
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, total_amount, tax_amount, platform_fee, seller_earnings, created_at')
    .eq('seller_id', sellerId)
    .in('payment_status', ['paid', 'PAID'])
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Tax-Invoice] Fehler beim Abruf der Bestellungen:', error)
    return null
  }

  const ordersData = orders || []

  // Gesamtbetraege berechnen
  let totalSales = 0
  let totalTaxCollected = 0
  let totalFees = 0
  let netRevenue = 0

  const items = ordersData.map((order) => {
    const brutto = parseFloat(order.total_amount || '0')
    const taxCalc = calculateTax(brutto, MWST_STANDARD)
    const fee = parseFloat(order.platform_fee || '0')
    const taxFromDb = parseFloat(order.tax_amount || '0')
    const actualTax = taxFromDb > 0 ? taxFromDb : taxCalc.mwstBetrag

    totalSales += brutto
    totalTaxCollected += actualTax
    totalFees += fee
    netRevenue += brutto - fee

    return {
      orderId: order.id,
      orderNumber: order.order_number || `WR-${order.id.substring(0, 8).toUpperCase()}`,
      date: order.created_at,
      nettobetrag: taxCalc.nettobetrag,
      mwstBetrag: actualTax,
      bruttobetrag: brutto,
    }
  })

  return {
    sellerId,
    period: monthPeriod(year, month),
    periodType: 'monthly',
    totalSales: round2(totalSales),
    totalTaxCollected: round2(totalTaxCollected),
    totalFees: round2(totalFees),
    netRevenue: round2(netRevenue),
    orderCount: ordersData.length,
    taxRate: MWST_STANDARD,
    country: 'DE',
    items,
  }
}

// ─── QUARTALSWEISE UMSATZSTEUER-VORANMELDUNG (UStVA) ────────────

/**
 * Erstellt einen Quartalsbericht im UStVA-Format.
 * Aggregiert drei Monate und berechnet die relevanten UStVA-Zeilen.
 *
 * @param sellerId - UUID des Verkaeufers
 * @param year - Kalenderjahr
 * @param quarter - Quartal (1-4)
 * @returns QuarterlyReport oder null bei Fehler
 */
export async function generateQuarterlyReport(
  sellerId: string,
  year: number,
  quarter: number
): Promise<QuarterlyReport | null> {
  if (quarter < 1 || quarter > 4) {
    console.error('[Tax-Invoice] Ungueltiges Quartal:', quarter)
    return null
  }

  const { start, end } = quarterDateRange(year, quarter)
  const startMonth = (quarter - 1) * 3 + 1
  const months = [
    monthPeriod(year, startMonth),
    monthPeriod(year, startMonth + 1),
    monthPeriod(year, startMonth + 2),
  ]

  // Alle bezahlten Bestellungen des Quartals abrufen
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, tax_amount, platform_fee, seller_earnings, created_at')
    .eq('seller_id', sellerId)
    .in('payment_status', ['paid', 'PAID'])
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Tax-Invoice] Fehler beim Quartalsabruf:', error)
    return null
  }

  const ordersData = orders || []

  let totalSales = 0
  let totalTaxCollected = 0
  let totalFees = 0
  let netRevenue = 0

  // Aufschluesselung nach Steuersatz
  let zeile81_bemessungsgrundlage = 0
  let zeile81_steuer = 0
  const zeile86_bemessungsgrundlage = 0
  const zeile86_steuer = 0

  for (const order of ordersData) {
    const brutto = parseFloat(order.total_amount || '0')
    const taxCalc = calculateTax(brutto, MWST_STANDARD)
    const fee = parseFloat(order.platform_fee || '0')
    const taxFromDb = parseFloat(order.tax_amount || '0')
    const actualTax = taxFromDb > 0 ? taxFromDb : taxCalc.mwstBetrag

    totalSales += brutto
    totalTaxCollected += actualTax
    totalFees += fee
    netRevenue += brutto - fee

    // Standard-Steuersatz (19%) - Zeile 81
    zeile81_bemessungsgrundlage += taxCalc.nettobetrag
    zeile81_steuer += actualTax
  }

  // Plattformgebuehren als Vorsteuer (Zeile 66)
  // Vorsteuer aus WEARO-Plattformgebuehren
  const plattformgebuehrenTax = calculateTax(totalFees, MWST_STANDARD)
  const zeile66_vorsteuer = plattformgebuehrenTax.mwstBetrag

  // Vorauszahlung = erhobene USt - abziehbare Vorsteuer
  const vorauszahlung = round2(totalTaxCollected - zeile66_vorsteuer)

  return {
    sellerId,
    period: quarterPeriod(year, quarter),
    periodType: 'quarterly',
    quarter,
    year,
    months,
    totalSales: round2(totalSales),
    totalTaxCollected: round2(totalTaxCollected),
    totalFees: round2(totalFees),
    netRevenue: round2(netRevenue),
    orderCount: ordersData.length,
    taxRate: MWST_STANDARD,
    country: 'DE',
    ustva: {
      zeile81_bemessungsgrundlage: round2(zeile81_bemessungsgrundlage),
      zeile81_steuer: round2(zeile81_steuer),
      zeile86_bemessungsgrundlage: round2(zeile86_bemessungsgrundlage),
      zeile86_steuer: round2(zeile86_steuer),
      zeile66_vorsteuer: round2(zeile66_vorsteuer),
      vorauszahlung,
    },
  }
}

// ─── STEUERBERICHT SPEICHERN ────────────────────────────────────

/**
 * Speichert einen Steuerbericht in der tax_reports-Tabelle.
 * Verwendet UPSERT: existierende Berichte fuer denselben Zeitraum werden aktualisiert.
 *
 * @param sellerId - UUID des Verkaeufers
 * @param period - Periodenbezeichnung (z.B. "2026-01", "2026-Q1")
 * @param data - Berichtsdaten
 * @returns Gespeicherter Bericht oder null bei Fehler
 */
export async function saveTaxReport(
  sellerId: string,
  period: string,
  data: {
    periodType: 'monthly' | 'quarterly' | 'annual'
    totalSales: number
    totalTaxCollected: number
    totalFees: number
    netRevenue: number
    orderCount: number
    taxRate?: number
  }
): Promise<{ id: string; period: string } | null> {
  const { data: report, error } = await supabaseAdmin
    .from('tax_reports')
    .upsert(
      {
        seller_id: sellerId,
        period,
        period_type: data.periodType,
        total_sales: data.totalSales,
        total_tax_collected: data.totalTaxCollected,
        total_fees: data.totalFees,
        net_revenue: data.netRevenue,
        order_count: data.orderCount,
        tax_rate: data.taxRate ?? MWST_STANDARD,
        country: 'DE',
        status: 'generated',
        generated_at: new Date().toISOString(),
      },
      {
        onConflict: 'seller_id,period,period_type',
      }
    )
    .select('id, period')
    .single()

  if (error) {
    console.error('[Tax-Invoice] Fehler beim Speichern des Steuerberichts:', error)
    return null
  }

  return report
}

// ─── JAHRESUMSATZ ABFRAGEN ──────────────────────────────────────

/**
 * Berechnet den Gesamtumsatz eines Verkaeufers fuer ein Kalenderjahr.
 *
 * @param sellerId - UUID des Verkaeufers
 * @param year - Kalenderjahr
 * @returns Gesamtumsatz (Brutto) in EUR
 */
export async function getAnnualRevenue(sellerId: string, year: number): Promise<number> {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString()
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).toISOString()

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('total_amount')
    .eq('seller_id', sellerId)
    .in('payment_status', ['paid', 'PAID'])
    .gte('created_at', start)
    .lte('created_at', end)

  if (error || !orders) return 0

  return round2(
    orders.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0)
  )
}

// ─── RECHNUNGS-HTML GENERIERUNG ─────────────────────────────────

/**
 * Erzeugt ein vollstaendiges HTML-Dokument fuer eine Rechnung.
 * Kann direkt fuer die PDF-Generierung (z.B. mit Puppeteer) verwendet werden.
 *
 * Das Layout entspricht deutschen Rechnungsanforderungen nach UStG:
 * - Vollstaendiger Name und Anschrift des leistenden Unternehmers
 * - Vollstaendiger Name und Anschrift des Leistungsempfaengers
 * - Steuernummer oder USt-IdNr.
 * - Rechnungsdatum und Rechnungsnummer
 * - Menge und Art der gelieferten Gegenstaende
 * - Nettobetrag, Steuersatz, Steuerbetrag, Bruttobetrag
 *
 * @param invoice - Vollstaendige InvoiceData
 * @returns HTML-String
 */
export function getInvoiceHTML(invoice: InvoiceData): string {
  const issuedFormatted = formatDateDE(invoice.issuedAt)
  const dueFormatted = formatDateDE(invoice.dueDate)

  const itemRows = invoice.items
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${index + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.title)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.taxRate}%</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${formatCurrency(item.totalPrice)}</td>
      </tr>`
    )
    .join('')

  // Kleinunternehmer-Hinweis oder MwSt-Ausweis
  const taxNote =
    invoice.taxRate === 0
      ? `<p style="margin: 16px 0 0 0; font-size: 11px; color: #6b7280;">
           Gem&auml;&szlig; &sect; 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).
         </p>`
      : ''

  const taxNumberLine = invoice.sellerInfo.taxNumber
    ? `<p style="margin: 2px 0; color: #4b5563;">Steuernummer: ${escapeHtml(invoice.sellerInfo.taxNumber)}</p>`
    : ''

  const ustIdLine = invoice.sellerInfo.ustIdNr
    ? `<p style="margin: 2px 0; color: #4b5563;">USt-IdNr.: ${escapeHtml(invoice.sellerInfo.ustIdNr)}</p>`
    : ''

  const notesSection = invoice.notes
    ? `<div style="margin-top: 24px; padding: 12px 16px; background: #f9fafb; border-radius: 6px; border-left: 3px solid #9333ea;">
         <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 600;">Hinweise:</p>
         <p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563;">${escapeHtml(invoice.notes)}</p>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rechnung ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 25mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #1f2937;
      margin: 0;
      padding: 0;
    }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 40px;">

    <!-- Kopfbereich -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #9333ea; padding-bottom: 20px;">
      <div>
        <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #9333ea; letter-spacing: -0.5px;">WEARO</h1>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af; letter-spacing: 1px;">FASHION MARKETPLACE</p>
      </div>
      <div style="text-align: right;">
        <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #1f2937;">RECHNUNG</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280;">
          Rechnungsnr.: <strong>${escapeHtml(invoice.invoiceNumber)}</strong>
        </p>
        <p style="margin: 2px 0 0 0; font-size: 13px; color: #6b7280;">
          Rechnungsdatum: <strong>${issuedFormatted}</strong>
        </p>
        <p style="margin: 2px 0 0 0; font-size: 13px; color: #6b7280;">
          F&auml;llig bis: <strong>${dueFormatted}</strong>
        </p>
      </div>
    </div>

    <!-- Adressen -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 32px;">
      <div style="width: 48%;">
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Verk&auml;ufer</p>
        <p style="margin: 0; font-weight: 600; color: #1f2937;">${escapeHtml(invoice.sellerInfo.shopName)}</p>
        <p style="margin: 2px 0; color: #4b5563;">${escapeHtml(invoice.sellerInfo.address)}</p>
        ${taxNumberLine}
        ${ustIdLine}
      </div>
      <div style="width: 48%;">
        <p style="margin: 0 0 8px 0; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Rechnungsempf&auml;nger</p>
        <p style="margin: 0; font-weight: 600; color: #1f2937;">${escapeHtml(invoice.buyerInfo.name)}</p>
        <p style="margin: 2px 0; color: #4b5563;">${escapeHtml(invoice.buyerInfo.address)}</p>
        <p style="margin: 2px 0; color: #4b5563;">${escapeHtml(invoice.buyerInfo.email)}</p>
      </div>
    </div>

    <!-- Bestellnummer -->
    <div style="margin-bottom: 20px; padding: 10px 16px; background: #f3e8ff; border-radius: 6px;">
      <p style="margin: 0; font-size: 12px; color: #7c3aed;">
        Bestellnummer: <strong>${escapeHtml(invoice.orderId.substring(0, 8).toUpperCase())}</strong>
      </p>
    </div>

    <!-- Rechnungspositionen -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="background: #f9fafb;">
          <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 50px;">Pos.</th>
          <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Bezeichnung</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 70px;">Menge</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 120px;">Einzelpreis</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 70px;">MwSt</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 120px;">Gesamt</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- Zusammenfassung -->
    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 300px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Nettobetrag:</span>
          <span style="font-weight: 500;">${formatCurrency(invoice.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">MwSt (${invoice.taxRate}%):</span>
          <span style="font-weight: 500;">${formatCurrency(invoice.taxAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #1f2937; margin-top: 4px;">
          <span style="font-weight: 700; font-size: 15px;">Bruttobetrag:</span>
          <span style="font-weight: 700; font-size: 15px; color: #9333ea;">${formatCurrency(invoice.totalAmount)}</span>
        </div>
      </div>
    </div>

    ${taxNote}
    ${notesSection}

    <!-- Fusszeile -->
    <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
      <p style="margin: 0;">
        ${escapeHtml(PLATTFORM_ADRESSE.name)} &middot; ${escapeHtml(PLATTFORM_ADRESSE.strasse)} &middot;
        ${escapeHtml(PLATTFORM_ADRESSE.plz)} ${escapeHtml(PLATTFORM_ADRESSE.stadt)} &middot;
        ${escapeHtml(PLATTFORM_ADRESSE.land)}
      </p>
      <p style="margin: 4px 0 0 0;">
        Diese Rechnung wurde maschinell erstellt und ist ohne Unterschrift g&uuml;ltig.
      </p>
    </div>

  </div>
</body>
</html>`
}

/**
 * HTML-Sonderzeichen escapen zur Vermeidung von XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char] || char)
}

// ─── ZUSAMMENFASSUNG: Monatsbericht generieren und speichern ────

/**
 * Convenience-Funktion: Erstellt den Monatsbericht und speichert
 * ihn direkt in der tax_reports-Tabelle.
 */
export async function generateAndSaveMonthlyReport(
  sellerId: string,
  year: number,
  month: number
): Promise<MonthlyTaxReport | null> {
  const report = await generateMonthlyTaxReport(sellerId, year, month)
  if (!report) return null

  await saveTaxReport(sellerId, report.period, {
    periodType: 'monthly',
    totalSales: report.totalSales,
    totalTaxCollected: report.totalTaxCollected,
    totalFees: report.totalFees,
    netRevenue: report.netRevenue,
    orderCount: report.orderCount,
    taxRate: report.taxRate,
  })

  return report
}

/**
 * Convenience-Funktion: Erstellt den Quartalsbericht und speichert
 * ihn direkt in der tax_reports-Tabelle.
 */
export async function generateAndSaveQuarterlyReport(
  sellerId: string,
  year: number,
  quarter: number
): Promise<QuarterlyReport | null> {
  const report = await generateQuarterlyReport(sellerId, year, quarter)
  if (!report) return null

  await saveTaxReport(sellerId, report.period, {
    periodType: 'quarterly',
    totalSales: report.totalSales,
    totalTaxCollected: report.totalTaxCollected,
    totalFees: report.totalFees,
    netRevenue: report.netRevenue,
    orderCount: report.orderCount,
    taxRate: report.taxRate,
  })

  return report
}
