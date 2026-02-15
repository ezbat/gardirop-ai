"use client"

import { useState } from "react"
import {
  Star,
  ThumbsUp,
  MessageCircle,
  Search,
  ChevronDown,
  Send,
  Filter,
  TrendingUp,
  Award,
  Users,
  X,
} from "lucide-react"

// ─── TYPES ─────────────────────────────────────────────
interface Review {
  id: number
  customerName: string
  customerInitials: string
  avatarColor: string
  rating: number
  date: string
  productName: string
  productImage: string
  text: string
  helpful: number
  reply?: string
  verified: boolean
}

// ─── MOCK DATA ─────────────────────────────────────────
const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    customerName: "Anna M.",
    customerInitials: "AM",
    avatarColor: "oklch(0.65 0.15 250)",
    rating: 5,
    date: "12. Feb 2026",
    productName: "Classic White T-Shirt",
    productImage: "",
    text: "Hervorragende Qualitat! Der Stoff ist super weich und die Passform ist perfekt. Werde definitiv wieder bestellen. Die Lieferung war auch blitzschnell.",
    helpful: 8,
    verified: true,
  },
  {
    id: 2,
    customerName: "Markus K.",
    customerInitials: "MK",
    avatarColor: "oklch(0.72 0.19 145)",
    rating: 4,
    date: "10. Feb 2026",
    productName: "Slim Fit Jeans Dark Blue",
    productImage: "",
    text: "Gute Jeans, sitzt gut und sieht toll aus. Einen Stern Abzug weil die Farbe nach dem ersten Waschen etwas heller geworden ist. Ansonsten top Qualitat.",
    helpful: 5,
    reply: "Vielen Dank fur Ihr Feedback, Markus! Wir empfehlen die Jeans beim ersten Mal separat und kalt zu waschen, damit die Farbe erhalten bleibt. Wir freuen uns, dass Ihnen die Passform gefallt!",
    verified: true,
  },
  {
    id: 3,
    customerName: "Lisa S.",
    customerInitials: "LS",
    avatarColor: "oklch(0.78 0.14 85)",
    rating: 5,
    date: "8. Feb 2026",
    productName: "Oversized Hoodie Grey",
    productImage: "",
    text: "Absolut mein neues Lieblingsstuck! Kuschelig warm und stylisch. Perfekt fur kalte Tage. Grosse passt wie angegeben.",
    helpful: 12,
    verified: true,
  },
  {
    id: 4,
    customerName: "Thomas R.",
    customerInitials: "TR",
    avatarColor: "oklch(0.55 0.2 300)",
    rating: 3,
    date: "6. Feb 2026",
    productName: "Cargo Pants Olive",
    productImage: "",
    text: "Die Hose ist okay, aber die Taschen sind kleiner als erwartet. Material fuhlt sich gut an. Lieferung hat etwas langer gedauert als angegeben.",
    helpful: 3,
    verified: true,
  },
  {
    id: 5,
    customerName: "Sophie W.",
    customerInitials: "SW",
    avatarColor: "oklch(0.7 0.18 55)",
    rating: 5,
    date: "4. Feb 2026",
    productName: "Summer Dress Floral",
    productImage: "",
    text: "Wunderschones Kleid! Die Blumen sehen in echt noch schoner aus als auf den Bildern. Habe viele Komplimente bekommen. Sehr zufrieden mit dem Kauf!",
    helpful: 15,
    verified: true,
  },
  {
    id: 6,
    customerName: "Jan P.",
    customerInitials: "JP",
    avatarColor: "oklch(0.63 0.24 25)",
    rating: 2,
    date: "2. Feb 2026",
    productName: "Leather Belt Brown",
    productImage: "",
    text: "Der Gurtel sieht zwar gut aus, aber die Schnalle hat nach zwei Wochen angefangen sich zu verfdrben. Fur den Preis hatte ich mehr erwartet.",
    helpful: 7,
    verified: false,
  },
  {
    id: 7,
    customerName: "Elena B.",
    customerInitials: "EB",
    avatarColor: "oklch(0.65 0.15 250)",
    rating: 4,
    date: "30. Jan 2026",
    productName: "Knit Sweater Beige",
    productImage: "",
    text: "Sehr schoner Pullover, hait gut warm und sieht elegant aus. Kleiner Tipp: Eine Nummer groser bestellen, fallt etwas kleiner aus.",
    helpful: 9,
    reply: "Danke fur den hilfreichen Tipp, Elena! Wir haben die Grossentabelle aktualisiert. Freut uns, dass Ihnen der Pullover gefallt!",
    verified: true,
  },
  {
    id: 8,
    customerName: "Felix D.",
    customerInitials: "FD",
    avatarColor: "oklch(0.72 0.19 145)",
    rating: 1,
    date: "28. Jan 2026",
    productName: "Canvas Sneakers White",
    productImage: "",
    text: "Leider sehr enttauscht. Die Sohle hat sich nach einer Woche gelost. Qualitat entspricht nicht dem Preis. Retoure eingeleitet.",
    helpful: 4,
    verified: true,
  },
  {
    id: 9,
    customerName: "Marie L.",
    customerInitials: "ML",
    avatarColor: "oklch(0.78 0.14 85)",
    rating: 5,
    date: "25. Jan 2026",
    productName: "Silk Scarf Multicolor",
    productImage: "",
    text: "Traumhafter Schal! Die Farben sind wunderschon und der Stoff fuhlt sich luxurios an. Kam wunderschon verpackt als Geschenk. Absolut empfehlenswert!",
    helpful: 18,
    verified: true,
  },
]

// ─── STAR RATING COMPONENT ────────────────────────────
function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={star <= rating ? "" : "opacity-30"}
          style={{
            width: size,
            height: size,
            color: star <= rating ? "oklch(0.78 0.14 85)" : "oklch(0.4 0.02 260)",
            fill: star <= rating ? "oklch(0.78 0.14 85)" : "none",
          }}
        />
      ))}
    </div>
  )
}

// ─── RATING DISTRIBUTION BAR ──────────────────────────
function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium w-12 text-right text-muted-foreground">
        {stars} <Star className="inline w-3 h-3 -mt-0.5" style={{ color: "oklch(0.78 0.14 85)", fill: "oklch(0.78 0.14 85)" }} />
      </span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${percentage}%`,
            background: stars >= 4
              ? "oklch(0.72 0.19 145)"
              : stars === 3
              ? "oklch(0.78 0.14 85)"
              : "oklch(0.63 0.24 25)",
          }}
        />
      </div>
      <span className="text-sm text-muted-foreground w-8">{count}</span>
    </div>
  )
}

// ─── REVIEW CARD COMPONENT ────────────────────────────
function ReviewCard({ review, onReply }: { review: Review; onReply: (id: number) => void }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [liked, setLiked] = useState(false)

  return (
    <div className="seller-card p-5">
      {/* Header: Customer info + rating + date */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: review.avatarColor }}
          >
            {review.customerInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{review.customerName}</span>
              {review.verified && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "oklch(0.72 0.19 145 / 0.15)",
                    color: "oklch(0.72 0.19 145)",
                  }}
                >
                  Verifiziert
                </span>
              )}
            </div>
            <StarRating rating={review.rating} size={14} />
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">{review.date}</span>
      </div>

      {/* Product name */}
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mb-3"
        style={{
          background: "oklch(0.65 0.15 250 / 0.1)",
          color: "oklch(0.65 0.15 250)",
        }}
      >
        Produkt: {review.productName}
      </div>

      {/* Review text */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{review.text}</p>

      {/* Existing reply */}
      {review.reply && (
        <div
          className="ml-4 p-3 rounded-xl mb-4"
          style={{
            background: "oklch(0.78 0.14 85 / 0.06)",
            borderLeft: "3px solid oklch(0.78 0.14 85 / 0.3)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageCircle className="w-3.5 h-3.5" style={{ color: "oklch(0.78 0.14 85)" }} />
            <span className="text-xs font-semibold" style={{ color: "oklch(0.78 0.14 85)" }}>
              Ihre Antwort
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{review.reply}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
        <button
          onClick={() => setLiked(!liked)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ThumbsUp
            className="w-3.5 h-3.5"
            style={liked ? { color: "oklch(0.65 0.15 250)", fill: "oklch(0.65 0.15 250)" } : undefined}
          />
          Hilfreich ({liked ? review.helpful + 1 : review.helpful})
        </button>

        {!review.reply && (
          <button
            onClick={() => setReplyOpen(!replyOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: replyOpen ? "oklch(0.78 0.14 85 / 0.15)" : "transparent",
              color: replyOpen ? "oklch(0.78 0.14 85)" : undefined,
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Antworten
          </button>
        )}
      </div>

      {/* Reply textarea */}
      {replyOpen && !review.reply && (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Schreiben Sie Ihre Antwort..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
            style={{
              background: "oklch(0.12 0.02 260)",
              border: "1px solid oklch(1 0 0 / 0.1)",
              color: "inherit",
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setReplyOpen(false)
                setReplyText("")
              }}
              className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={() => {
                if (replyText.trim()) {
                  onReply(review.id)
                  setReplyOpen(false)
                  setReplyText("")
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{
                background: replyText.trim()
                  ? "oklch(0.78 0.14 85)"
                  : "oklch(0.78 0.14 85 / 0.4)",
                cursor: replyText.trim() ? "pointer" : "not-allowed",
              }}
            >
              <Send className="w-3 h-3" />
              Senden
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────
export default function ReviewsPage() {
  const [activeFilter, setActiveFilter] = useState<"all" | number>("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  // ── Computed data ──
  const ratingCounts = [5, 4, 3, 2, 1].map(
    (stars) => MOCK_REVIEWS.filter((r) => r.rating === stars).length
  )
  const totalReviews = MOCK_REVIEWS.length
  const averageRating =
    totalReviews > 0
      ? MOCK_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0
  const responseRate = Math.round(
    (MOCK_REVIEWS.filter((r) => r.reply).length / totalReviews) * 100
  )

  // ── Filter & sort ──
  let filtered = MOCK_REVIEWS.filter((r) => {
    if (activeFilter !== "all" && r.rating !== activeFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        r.customerName.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q)
      )
    }
    return true
  })

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return b.id - a.id
      case "oldest":
        return a.id - b.id
      case "highest":
        return b.rating - a.rating
      case "lowest":
        return a.rating - b.rating
      default:
        return 0
    }
  })

  const sortLabels: Record<string, string> = {
    newest: "Neueste zuerst",
    oldest: "Alteste zuerst",
    highest: "Beste zuerst",
    lowest: "Schlechteste zuerst",
  }

  const filterTabs: { label: string; value: "all" | number }[] = [
    { label: "Alle", value: "all" },
    { label: "5 Sterne", value: 5 },
    { label: "4 Sterne", value: 4 },
    { label: "3 Sterne", value: 3 },
    { label: "2 Sterne", value: 2 },
    { label: "1 Stern", value: 1 },
  ]

  const handleReply = (reviewId: number) => {
    // In production, this would call an API
    console.log("Reply to review:", reviewId)
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* ─── HEADER ─────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Reviews & Ratings</h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "oklch(0.78 0.14 85 / 0.15)",
                color: "oklch(0.78 0.14 85)",
              }}
            >
              {totalReviews} Reviews
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Verwalten Sie Bewertungen, antworten Sie auf Feedback und verbessern Sie Ihre Reputation.
          </p>
        </div>

        {/* ─── OVERVIEW STATS ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Average Rating Card */}
          <div className="seller-card p-6 flex flex-col items-center justify-center">
            <div className="relative mb-3">
              <div
                className="text-5xl font-bold"
                style={{ color: "oklch(0.78 0.14 85)" }}
              >
                {averageRating.toFixed(1)}
              </div>
            </div>
            <StarRating rating={Math.round(averageRating)} size={20} />
            <p className="text-xs text-muted-foreground mt-2">
              Durchschnittsbewertung
            </p>
            <div
              className="flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                background: "oklch(0.72 0.19 145 / 0.12)",
                color: "oklch(0.72 0.19 145)",
              }}
            >
              <TrendingUp className="w-3 h-3" />
              +0.3 vs. letzten Monat
            </div>
          </div>

          {/* Rating Distribution Card */}
          <div className="seller-card p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: "oklch(0.78 0.14 85)" }} />
              Bewertungsverteilung
            </h3>
            <div className="space-y-2.5">
              {[5, 4, 3, 2, 1].map((stars, index) => (
                <RatingBar
                  key={stars}
                  stars={stars}
                  count={ratingCounts[index]}
                  total={totalReviews}
                />
              ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="seller-card p-6">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: "oklch(0.65 0.15 250)" }} />
              Schnellubersicht
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Gesamt Reviews</span>
                  <span className="text-sm font-bold">{totalReviews}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
                  <div className="h-full rounded-full" style={{ width: "100%", background: "oklch(0.65 0.15 250)" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Antwortrate</span>
                  <span className="text-sm font-bold">{responseRate}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${responseRate}%`,
                      background: responseRate >= 80 ? "oklch(0.72 0.19 145)" : "oklch(0.78 0.14 85)",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Positive (4-5 Sterne)</span>
                  <span className="text-sm font-bold">
                    {Math.round(
                      (MOCK_REVIEWS.filter((r) => r.rating >= 4).length / totalReviews) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(MOCK_REVIEWS.filter((r) => r.rating >= 4).length / totalReviews) * 100}%`,
                      background: "oklch(0.72 0.19 145)",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Verifiziert</span>
                  <span className="text-sm font-bold">
                    {Math.round(
                      (MOCK_REVIEWS.filter((r) => r.verified).length / totalReviews) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 260)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(MOCK_REVIEWS.filter((r) => r.verified).length / totalReviews) * 100}%`,
                      background: "oklch(0.55 0.2 300)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FILTER & SEARCH BAR ────────────────── */}
        <div className="seller-card p-4 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground mr-1" />
              {filterTabs.map((tab) => {
                const isActive = activeFilter === tab.value
                const count =
                  tab.value === "all"
                    ? totalReviews
                    : MOCK_REVIEWS.filter((r) => r.rating === tab.value).length

                return (
                  <button
                    key={String(tab.value)}
                    onClick={() => setActiveFilter(tab.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isActive ? "oklch(0.78 0.14 85 / 0.15)" : "transparent",
                      color: isActive ? "oklch(0.78 0.14 85)" : undefined,
                      border: isActive ? "1px solid oklch(0.78 0.14 85 / 0.3)" : "1px solid transparent",
                    }}
                  >
                    {tab.label}
                    <span
                      className="ml-1 text-[10px] opacity-60"
                    >
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 ml-auto w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Reviews durchsuchen..."
                  className="w-full md:w-56 pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none"
                  style={{
                    background: "oklch(0.12 0.02 260)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    color: "inherit",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: "oklch(0.12 0.02 260)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                  }}
                >
                  {sortLabels[sortBy]}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showSortDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortDropdown(false)}
                    />
                    <div
                      className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1 z-20 shadow-xl"
                      style={{
                        background: "oklch(0.14 0.02 260)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                      }}
                    >
                      {(Object.keys(sortLabels) as Array<keyof typeof sortLabels>).map((key) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSortBy(key as typeof sortBy)
                            setShowSortDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2 text-xs transition-colors hover:bg-white/[0.05]"
                          style={{
                            color: sortBy === key ? "oklch(0.78 0.14 85)" : undefined,
                            fontWeight: sortBy === key ? 600 : 400,
                          }}
                        >
                          {sortLabels[key]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── REVIEWS LIST ───────────────────────── */}
        <div className="space-y-4 mb-8">
          {filtered.length > 0 ? (
            filtered.map((review) => (
              <ReviewCard key={review.id} review={review} onReply={handleReply} />
            ))
          ) : (
            <div className="seller-card p-12 text-center">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-semibold mb-1">Keine Reviews gefunden</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? `Keine Ergebnisse fur "${searchQuery}"`
                  : `Keine Reviews mit ${activeFilter} ${activeFilter === 1 ? "Stern" : "Sternen"}`}
              </p>
              <button
                onClick={() => {
                  setActiveFilter("all")
                  setSearchQuery("")
                }}
                className="mt-4 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: "oklch(0.78 0.14 85 / 0.15)",
                  color: "oklch(0.78 0.14 85)",
                }}
              >
                Filter zurucksetzen
              </button>
            </div>
          )}
        </div>

        {/* ─── FOOTER INFO ────────────────────────── */}
        {filtered.length > 0 && (
          <div className="text-center pb-8">
            <p className="text-xs text-muted-foreground">
              {filtered.length} von {totalReviews} Reviews angezeigt
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
