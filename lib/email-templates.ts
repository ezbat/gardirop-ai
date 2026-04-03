/**
 * lib/email-templates.ts
 *
 * All transactional email templates for WEARO marketplace.
 * German copy, mobile-friendly HTML, inline styles.
 * Brand: WEARO — accent #D97706 (amber).
 */

import { appUrl } from '@/lib/email'

// ─── Shared layout ───────────────────────────────────────────────────────────

const BRAND   = '#D97706'
const BRAND2  = '#B45309'
const TEXT     = '#1A1A1A'
const MUTED    = '#6B7280'
const BG       = '#F9FAFB'
const WHITE    = '#FFFFFF'
const RED      = '#DC2626'
const GREEN    = '#16A34A'
const YEAR     = new Date().getFullYear()

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:${TEXT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${WHITE};border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
        <!-- Header -->
        <tr><td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #F0F0F0;">
          <span style="font-size:24px;font-weight:800;color:${TEXT};letter-spacing:-0.5px;">WEARO</span>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:${BG};border-top:1px solid #F0F0F0;text-align:center;">
          <p style="margin:0;font-size:12px;color:${MUTED};">&copy; ${YEAR} WEARO. Alle Rechte vorbehalten.</p>
          <p style="margin:4px 0 0;font-size:11px;color:#9CA3AF;">Diese E-Mail wurde automatisch versendet. Bitte nicht direkt antworten.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function btn(text: string, href: string, color = BRAND): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
    <a href="${href}" style="display:inline-block;padding:14px 32px;background:${color};color:${WHITE};font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">${text}</a>
  </td></tr></table>`
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${TEXT};">${text}</h2>`
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;color:${MUTED};line-height:1.6;">${text}</p>`
}

function infoBox(content: string, borderColor = BRAND): string {
  return `<div style="background:${BG};border-left:4px solid ${borderColor};padding:16px;border-radius:0 8px 8px 0;margin:16px 0;">${content}</div>`
}

function fmtEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount)
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Order Confirmed ──────────────────────────────────────────────────────────

export function getOrderConfirmationEmail(order: {
  id: string
  user: { full_name?: string; email: string }
  total_amount: number
  items: Array<{
    product: { title: string; price: number; images: string[] }
    quantity: number
    size: string
  }>
  shipping_address?: any
}): { subject: string; html: string } {
  const shortId = order.id.slice(0, 8).toUpperCase()

  const itemRows = order.items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #F0F0F0;vertical-align:top;">
        ${item.product.images?.[0] ? `<img src="${item.product.images[0]}" alt="" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;" />` : ''}
      </td>
      <td style="padding:12px 12px;border-bottom:1px solid #F0F0F0;vertical-align:top;">
        <span style="font-size:14px;font-weight:600;color:${TEXT};">${item.product.title}</span><br/>
        <span style="font-size:12px;color:${MUTED};">Menge: ${item.quantity}${item.size ? ` · Größe: ${item.size}` : ''}</span>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #F0F0F0;text-align:right;vertical-align:top;white-space:nowrap;">
        <span style="font-size:14px;font-weight:600;color:${TEXT};">${fmtEur(item.product.price * item.quantity)}</span>
      </td>
    </tr>
  `).join('')

  const content = `
    ${heading('Bestellbestätigung')}
    ${p(`Hallo ${order.user.full_name || 'Kunde'},`)}
    ${p('Vielen Dank für deine Bestellung! Wir haben sie erfolgreich erhalten und bearbeiten sie jetzt.')}

    ${infoBox(`
      <p style="margin:0;font-size:13px;color:${MUTED};">Bestellnummer</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${TEXT};">#${shortId}</p>
    `)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      ${itemRows}
      <tr>
        <td colspan="2" style="padding:14px 0;font-size:15px;font-weight:700;color:${TEXT};">Gesamt</td>
        <td style="padding:14px 0;text-align:right;font-size:16px;font-weight:800;color:${BRAND};">${fmtEur(order.total_amount)}</td>
      </tr>
    </table>

    ${p('Sobald dein Paket verschickt wird, erhältst du eine weitere Benachrichtigung.')}
    ${btn('Bestellung ansehen', appUrl(`/orders/${order.id}`))}
  `

  return {
    subject: `Bestellbestätigung #${shortId} — WEARO`,
    html: layout(content),
  }
}

// ─── Order Shipped ────────────────────────────────────────────────────────────

export function getOrderShippedEmail(params: {
  orderId: string
  customerName: string
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
}): { subject: string; html: string } {
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  const trackingInfo = params.trackingNumber
    ? infoBox(`
      <p style="margin:0;font-size:13px;color:${MUTED};">Sendungsnummer</p>
      <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${TEXT};">${params.trackingNumber}</p>
      ${params.carrier ? `<p style="margin:4px 0 0;font-size:13px;color:${MUTED};">Versand über ${params.carrier}</p>` : ''}
    `)
    : ''

  const content = `
    ${heading('Dein Paket ist unterwegs!')}
    ${p(`Hallo ${params.customerName},`)}
    ${p(`Gute Nachrichten — deine Bestellung #${shortId} wurde versandt und ist auf dem Weg zu dir.`)}
    ${trackingInfo}
    ${params.trackingUrl
      ? btn('Sendung verfolgen', params.trackingUrl)
      : btn('Bestellung ansehen', appUrl(`/orders/${params.orderId}`))}
  `

  return {
    subject: `Dein Paket ist unterwegs — #${shortId}`,
    html: layout(content),
  }
}

// ─── Order Delivered ──────────────────────────────────────────────────────────

export function getOrderDeliveredEmail(params: {
  orderId: string
  customerName: string
}): { subject: string; html: string } {
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  const content = `
    ${heading('Deine Bestellung wurde zugestellt')}
    ${p(`Hallo ${params.customerName},`)}
    ${p(`Deine Bestellung #${shortId} wurde erfolgreich zugestellt. Wir hoffen, du bist zufrieden!`)}
    ${p('Falls du Fragen hast oder etwas nicht stimmt, kontaktiere bitte den Verkäufer direkt über die Nachrichtenfunktion.')}
    ${btn('Bestellung ansehen', appUrl(`/orders/${params.orderId}`))}
  `

  return {
    subject: `Bestellung zugestellt — #${shortId}`,
    html: layout(content),
  }
}

// ─── Refund Processed ─────────────────────────────────────────────────────────

export function getRefundProcessedEmail(params: {
  orderId: string
  customerName: string
  refundAmount: number
}): { subject: string; html: string } {
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  const content = `
    ${heading('Erstattung bearbeitet')}
    ${p(`Hallo ${params.customerName},`)}
    ${p(`Für deine Bestellung #${shortId} wurde eine Erstattung in Höhe von <strong>${fmtEur(params.refundAmount)}</strong> veranlasst.`)}
    ${p('Die Gutschrift erscheint je nach Zahlungsanbieter innerhalb von 5–10 Werktagen auf deinem Konto.')}
    ${btn('Bestellung ansehen', appUrl(`/orders/${params.orderId}`))}
  `

  return {
    subject: `Erstattung bearbeitet — #${shortId}`,
    html: layout(content),
  }
}

// ─── Return Request Received ──────────────────────────────────────────────────

export function getReturnRequestReceivedEmail(params: {
  customerName: string
  orderId: string
  reason: string
}): { subject: string; html: string } {
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  const content = `
    ${heading('Rückgabe-Anfrage eingegangen')}
    ${p(`Hallo ${params.customerName},`)}
    ${p(`Deine Rückgabe-Anfrage für Bestellung <strong>#${shortId}</strong> wurde erfolgreich eingereicht.`)}
    ${infoBox(`<strong>Grund:</strong> ${params.reason}`)}
    ${p('Der Verkäufer wird deine Anfrage innerhalb von 48 Stunden prüfen. Du wirst per E-Mail über das Ergebnis informiert.')}
    ${btn('Rückgabe ansehen', appUrl(`/returns`))}
  `

  return {
    subject: `Rückgabe-Anfrage eingegangen — #${shortId}`,
    html: layout(content),
  }
}

// ─── Return Approved ─────────────────────────────────────────────────────────

export function getReturnApprovedEmail(params: {
  customerName: string
  orderId: string
  refundAmount: number
}): { subject: string; html: string } {
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  const content = `
    ${heading('Rückgabe genehmigt')}
    ${p(`Hallo ${params.customerName},`)}
    ${p(`Deine Rückgabe für Bestellung <strong>#${shortId}</strong> wurde genehmigt.`)}
    ${infoBox(`<strong>Erstattungsbetrag:</strong> ${fmtEur(params.refundAmount)}`)}
    ${p('Bitte sende das Produkt innerhalb von 7 Tagen an den Verkäufer zurück. Sobald es eingegangen ist, wird die Erstattung veranlasst.')}
    ${btn('Details ansehen', appUrl(`/returns`))}
  `

  return {
    subject: `Rückgabe genehmigt — #${shortId}`,
    html: layout(content),
  }
}

// ─── Return Rejected ─────────────────────────────────────────────────────────

export function getReturnRejectedEmail(params: {
  customerName: string
  orderId: string
  rejectionReason?: string
}): { subject: string; html: string } {
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  const content = `
    ${heading('Rückgabe abgelehnt')}
    ${p(`Hallo ${params.customerName},`)}
    ${p(`Deine Rückgabe-Anfrage für Bestellung <strong>#${shortId}</strong> wurde leider abgelehnt.`)}
    ${params.rejectionReason ? infoBox(`<strong>Begründung:</strong> ${params.rejectionReason}`) : ''}
    ${p('Wenn du Fragen hast, kannst du den Verkäufer über das Nachrichtensystem kontaktieren.')}
    ${btn('Bestellung ansehen', appUrl(`/orders/${params.orderId}`))}
  `

  return {
    subject: `Rückgabe abgelehnt — #${shortId}`,
    html: layout(content),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELLER EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Application Received ─────────────────────────────────────────────────────

export function getApplicationReceivedEmail(params: {
  applicantName: string
  storeName: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Bewerbung eingegangen')}
    ${p(`Hallo ${params.applicantName},`)}
    ${p(`Vielen Dank für deine Bewerbung als Verkäufer auf WEARO mit dem Shop <strong>${params.storeName}</strong>.`)}
    ${p('Wir prüfen deine Angaben sorgfältig. Du erhältst innerhalb von 1–3 Werktagen eine Rückmeldung per E-Mail.')}
    ${infoBox(`
      <p style="margin:0;font-size:13px;color:${MUTED};">Was passiert als nächstes?</p>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:${MUTED};">
        <li>Prüfung deiner Angaben durch unser Team</li>
        <li>Benachrichtigung über Genehmigung oder Rückfragen</li>
        <li>Bei Genehmigung: sofortiger Zugang zum Verkäufer-Dashboard</li>
      </ul>
    `)}
  `

  return {
    subject: 'Bewerbung eingegangen — WEARO',
    html: layout(content),
  }
}

// ─── Application Approved ─────────────────────────────────────────────────────

export function getSellerApprovalEmail(seller: {
  shop_name: string
  email: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Herzlichen Glückwunsch!')}
    ${p('Deine Bewerbung als Verkäufer auf WEARO wurde genehmigt.')}
    ${infoBox(`
      <p style="margin:0;font-size:13px;color:${MUTED};">Dein Shop</p>
      <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${TEXT};">${seller.shop_name}</p>
    `, GREEN)}
    ${p('Du kannst jetzt Produkte einstellen, Bestellungen verwalten und deinen Shop einrichten.')}
    ${infoBox(`
      <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT};">Erste Schritte:</p>
      <ol style="margin:8px 0 0;padding-left:20px;font-size:13px;color:${MUTED};">
        <li>Seller-Dashboard öffnen</li>
        <li>Dein erstes Produkt hinzufügen</li>
        <li>Shop-Profil vervollständigen</li>
        <li>Auf Bestellungen warten!</li>
      </ol>
    `)}
    ${btn('Zum Seller-Dashboard', appUrl('/seller/dashboard'), GREEN)}
  `

  return {
    subject: 'Bewerbung genehmigt — Willkommen bei WEARO!',
    html: layout(content),
  }
}

// ─── Application Rejected ─────────────────────────────────────────────────────

export function getSellerRejectionEmail(seller: {
  shop_name: string
  email: string
  reason?: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Bewerbung nicht genehmigt')}
    ${p('Vielen Dank für dein Interesse an WEARO. Nach sorgfältiger Prüfung können wir deine Bewerbung zum jetzigen Zeitpunkt leider nicht genehmigen.')}
    ${seller.reason ? infoBox(`
      <p style="margin:0;font-size:13px;font-weight:600;color:${RED};">Grund:</p>
      <p style="margin:4px 0 0;font-size:13px;color:${MUTED};">${seller.reason}</p>
    `, RED) : ''}
    ${p('Du kannst deine Angaben überarbeiten und dich erneut bewerben.')}
    ${btn('Erneut bewerben', appUrl('/sell/apply'))}
  `

  return {
    subject: 'Rückmeldung zu deiner Bewerbung — WEARO',
    html: layout(content),
  }
}

// ─── New Order (for seller) ───────────────────────────────────────────────────

export function getSellerNewOrderEmail(params: {
  shopName: string
  orderId: string
  totalAmount: number
  itemCount: number
}): { subject: string; html: string } {
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  const content = `
    ${heading('Neue Bestellung erhalten!')}
    ${p(`Hallo ${params.shopName},`)}
    ${p('Du hast eine neue Bestellung erhalten.')}
    ${infoBox(`
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="font-size:13px;color:${MUTED};padding:4px 0;">Bestellnummer</td>
          <td style="font-size:14px;font-weight:700;color:${TEXT};text-align:right;">#${shortId}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:${MUTED};padding:4px 0;">Artikel</td>
          <td style="font-size:14px;font-weight:600;color:${TEXT};text-align:right;">${params.itemCount}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:${MUTED};padding:4px 0;">Bestellwert</td>
          <td style="font-size:16px;font-weight:800;color:${BRAND};text-align:right;">${fmtEur(params.totalAmount)}</td>
        </tr>
      </table>
    `)}
    ${p('Bitte bearbeite die Bestellung zeitnah.')}
    ${btn('Bestellungen ansehen', appUrl('/seller/orders'))}
  `

  return {
    subject: `Neue Bestellung #${shortId} — WEARO`,
    html: layout(content),
  }
}

// ─── Payout Paid ──────────────────────────────────────────────────────────────

export function getPayoutPaidEmail(params: {
  shopName: string
  amount: number
  currency?: string
  payoutId: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Auszahlung überwiesen')}
    ${p(`Hallo ${params.shopName},`)}
    ${p('Deine angeforderte Auszahlung wurde erfolgreich überwiesen.')}
    ${infoBox(`
      <p style="margin:0;font-size:13px;color:${MUTED};">Betrag</p>
      <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:${GREEN};">${fmtEur(params.amount)}</p>
    `, GREEN)}
    ${p('Die Gutschrift sollte innerhalb von 1–3 Werktagen auf deinem Konto erscheinen.')}
    ${btn('Dashboard öffnen', appUrl('/seller/dashboard'))}
  `

  return {
    subject: `Auszahlung überwiesen — ${fmtEur(params.amount)}`,
    html: layout(content),
  }
}

// ─── Payout Failed / Rejected ─────────────────────────────────────────────────

export function getPayoutFailedEmail(params: {
  shopName: string
  amount: number
  reason?: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Auszahlung fehlgeschlagen')}
    ${p(`Hallo ${params.shopName},`)}
    ${p(`Deine Auszahlung über <strong>${fmtEur(params.amount)}</strong> konnte leider nicht bearbeitet werden.`)}
    ${params.reason ? infoBox(`
      <p style="margin:0;font-size:13px;font-weight:600;color:${RED};">Grund:</p>
      <p style="margin:4px 0 0;font-size:13px;color:${MUTED};">${params.reason}</p>
    `, RED) : ''}
    ${p('Bitte überprüfe deine Kontodaten und versuche es erneut oder kontaktiere den Support.')}
    ${btn('Dashboard öffnen', appUrl('/seller/dashboard'))}
  `

  return {
    subject: 'Auszahlung fehlgeschlagen — WEARO',
    html: layout(content),
  }
}

// ─── Product Approved ─────────────────────────────────────────────────────────

export function getProductApprovedEmail(params: {
  shopName: string
  productTitle: string
  productId: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Produkt genehmigt')}
    ${p(`Hallo ${params.shopName},`)}
    ${p(`Dein Produkt <strong>"${params.productTitle}"</strong> wurde genehmigt und ist jetzt im Shop sichtbar.`)}
    ${btn('Produkt ansehen', appUrl(`/products/${params.productId}`), GREEN)}
  `

  return {
    subject: `Produkt genehmigt: "${params.productTitle}" — WEARO`,
    html: layout(content),
  }
}

// ─── Product Rejected ─────────────────────────────────────────────────────────

export function getProductRejectedEmail(params: {
  shopName: string
  productTitle: string
  productId: string
  reason?: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Produkt nicht genehmigt')}
    ${p(`Hallo ${params.shopName},`)}
    ${p(`Dein Produkt <strong>"${params.productTitle}"</strong> konnte leider nicht genehmigt werden.`)}
    ${params.reason ? infoBox(`
      <p style="margin:0;font-size:13px;font-weight:600;color:${RED};">Grund:</p>
      <p style="margin:4px 0 0;font-size:13px;color:${MUTED};">${params.reason}</p>
    `, RED) : ''}
    ${p('Du kannst das Produkt überarbeiten und erneut zur Prüfung einreichen.')}
    ${btn('Produkt bearbeiten', appUrl(`/seller/products/${params.productId}/edit`))}
  `

  return {
    subject: `Produkt nicht genehmigt: "${params.productTitle}" — WEARO`,
    html: layout(content),
  }
}

// ─── Seller New Return Request ────────────────────────────────────────────────

export function getSellerNewReturnEmail(params: {
  shopName: string
  orderId: string
  reason: string
  refundAmount: number
}): { subject: string; html: string } {
  const shortId = params.orderId.slice(0, 8).toUpperCase()

  const content = `
    ${heading('Neue Rückgabe-Anfrage')}
    ${p(`Hallo ${params.shopName},`)}
    ${p(`Ein Kunde hat eine Rückgabe für Bestellung <strong>#${shortId}</strong> beantragt.`)}
    ${infoBox(`
      <strong>Grund:</strong> ${params.reason}<br/>
      <strong>Betrag:</strong> ${fmtEur(params.refundAmount)}
    `)}
    ${p('Bitte prüfe die Anfrage innerhalb von 48 Stunden.')}
    ${btn('Rückgaben verwalten', appUrl('/seller/returns'))}
  `

  return {
    subject: `Neue Rückgabe-Anfrage — #${shortId}`,
    html: layout(content),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── New Seller Application ───────────────────────────────────────────────────

export function getAdminNewApplicationEmail(params: {
  applicantName: string
  storeName: string
  email: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Neue Seller-Bewerbung')}
    ${infoBox(`
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="font-size:13px;color:${MUTED};padding:4px 0;">Name</td>
          <td style="font-size:14px;font-weight:600;color:${TEXT};text-align:right;">${params.applicantName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:${MUTED};padding:4px 0;">Shop</td>
          <td style="font-size:14px;font-weight:600;color:${TEXT};text-align:right;">${params.storeName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:${MUTED};padding:4px 0;">E-Mail</td>
          <td style="font-size:14px;color:${TEXT};text-align:right;">${params.email}</td>
        </tr>
      </table>
    `)}
    ${btn('Bewerbung prüfen', appUrl('/admin/seller-applications'))}
  `

  return {
    subject: `Neue Seller-Bewerbung: ${params.storeName}`,
    html: layout(content),
  }
}

// ─── Payout Requested ─────────────────────────────────────────────────────────

export function getAdminPayoutRequestedEmail(params: {
  shopName: string
  amount: number
  payoutId: string
}): { subject: string; html: string } {
  const content = `
    ${heading('Auszahlung beantragt')}
    ${infoBox(`
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="font-size:13px;color:${MUTED};padding:4px 0;">Seller</td>
          <td style="font-size:14px;font-weight:600;color:${TEXT};text-align:right;">${params.shopName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:${MUTED};padding:4px 0;">Betrag</td>
          <td style="font-size:16px;font-weight:800;color:${BRAND};text-align:right;">${fmtEur(params.amount)}</td>
        </tr>
      </table>
    `)}
    ${btn('Auszahlungen verwalten', appUrl('/admin/payouts'))}
  `

  return {
    subject: `Auszahlung beantragt: ${fmtEur(params.amount)} — ${params.shopName}`,
    html: layout(content),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORT TICKET EMAILS
// ═══════════════════════════════════════════════════════════════════════════════

export function getSupportTicketCreatedEmail(params: {
  name: string
  ticketId: string
  subject: string
  scope: string
}): { subject: string; html: string } {
  const shortId = params.ticketId.slice(0, 8).toUpperCase()
  const content = `
    ${heading('Support-Ticket erstellt')}
    ${p(`Hallo ${params.name},`)}
    ${p(`Dein Support-Ticket <strong>#${shortId}</strong> wurde erfolgreich erstellt.`)}
    ${infoBox(`<strong>Betreff:</strong> ${params.subject}<br/><strong>Kategorie:</strong> ${params.scope}`)}
    ${p('Unser Team wird sich so schnell wie möglich bei dir melden.')}
    ${btn('Ticket ansehen', appUrl(`/support`))}
  `
  return { subject: `Support-Ticket #${shortId} erstellt`, html: layout(content) }
}

export function getSupportTicketReplyEmail(params: {
  name: string
  ticketId: string
  ticketSubject: string
}): { subject: string; html: string } {
  const shortId = params.ticketId.slice(0, 8).toUpperCase()
  const content = `
    ${heading('Neue Antwort auf dein Ticket')}
    ${p(`Hallo ${params.name},`)}
    ${p(`Es gibt eine neue Antwort auf dein Support-Ticket <strong>#${shortId}</strong>:`)}
    ${infoBox(`<strong>${params.ticketSubject}</strong>`)}
    ${btn('Antwort lesen', appUrl(`/support`))}
  `
  return { subject: `Neue Antwort — Ticket #${shortId}`, html: layout(content) }
}

export function getSupportTicketResolvedEmail(params: {
  name: string
  ticketId: string
  ticketSubject: string
}): { subject: string; html: string } {
  const shortId = params.ticketId.slice(0, 8).toUpperCase()
  const content = `
    ${heading('Ticket gelöst')}
    ${p(`Hallo ${params.name},`)}
    ${p(`Dein Support-Ticket <strong>#${shortId}</strong> wurde als gelöst markiert.`)}
    ${infoBox(`<strong>${params.ticketSubject}</strong>`)}
    ${p('Falls du weitere Fragen hast, kannst du jederzeit ein neues Ticket erstellen.')}
    ${btn('Ticket ansehen', appUrl(`/support`))}
  `
  return { subject: `Ticket #${shortId} gelöst`, html: layout(content) }
}
