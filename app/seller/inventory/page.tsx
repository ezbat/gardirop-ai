"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Package, Search, Filter, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Save, Loader2, ArrowUpDown,
  ChevronLeft, ChevronRight, Warehouse
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

// ─── TYPES ─────────────────────────────────────────────
interface Product {
  id: string
  title: string
  description: string
  price: number
  stock: number
  images: string[]
  category: string
  status: string
  sku?: string
  moderation_status?: string
  created_at: string
  updated_at?: string
}

type StockStatus = "all" | "in_stock" | "low_stock" | "out_of_stock"
type SortField = "title" | "stock" | "updated_at"
type SortDirection = "asc" | "desc"

// ─── HELPERS ───────────────────────────────────────────
function getStockStatus(stock: number): "in_stock" | "low_stock" | "out_of_stock" {
  if (stock <= 0) return "out_of_stock"
  if (stock < 5) return "low_stock"
  return "in_stock"
}

function getStockBadge(stock: number) {
  const status = getStockStatus(stock)
  switch (status) {
    case "in_stock":
      return {
        label: "In Stock",
        color: "oklch(0.72 0.19 145)",
        bg: "oklch(0.72 0.19 145 / 0.12)",
        icon: CheckCircle,
      }
    case "low_stock":
      return {
        label: "Low Stock",
        color: "oklch(0.82 0.17 85)",
        bg: "oklch(0.82 0.17 85 / 0.12)",
        icon: AlertTriangle,
      }
    case "out_of_stock":
      return {
        label: "Out of Stock",
        color: "oklch(0.63 0.24 25)",
        bg: "oklch(0.63 0.24 25 / 0.12)",
        icon: XCircle,
      }
  }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr))
  } catch {
    return "—"
  }
}

function generateSKU(product: Product): string {
  if (product.sku) return product.sku
  const prefix = (product.category || "GEN").slice(0, 3).toUpperCase()
  const suffix = product.id.slice(-6).toUpperCase()
  return `${prefix}-${suffix}`
}

// ─── STATUS OVERVIEW CARD ──────────────────────────────
function OverviewCard({
  label,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string
  value: number
  icon: any
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`seller-card p-5 text-left transition-all w-full ${
        active ? "ring-2" : "hover:ring-1"
      }`}
      style={{
        ringColor: color,
        borderColor: active ? color : undefined,
        boxShadow: active ? `0 0 0 2px ${color}` : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklch, ${color} 12%, transparent)` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
    </button>
  )
}

// ─── INVENTORY ROW ─────────────────────────────────────
function InventoryRow({
  product,
  editingStock,
  onStockChange,
  onUpdateStock,
  isUpdating,
}: {
  product: Product
  editingStock: number | null
  onStockChange: (value: number | null) => void
  onUpdateStock: () => void
  isUpdating: boolean
}) {
  const badge = getStockBadge(product.stock)
  const BadgeIcon = badge.icon
  const currentStock = editingStock !== null ? editingStock : product.stock
  const hasChanged = editingStock !== null && editingStock !== product.stock

  return (
    <tr className="border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors">
      {/* Image */}
      <td className="py-3 px-4">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/[0.04] flex-shrink-0">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </td>

      {/* Name */}
      <td className="py-3 px-4">
        <p className="text-sm font-medium truncate max-w-[200px]">{product.title}</p>
        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
          {product.category || "Uncategorized"}
        </p>
      </td>

      {/* SKU */}
      <td className="py-3 px-4">
        <code className="text-xs px-2 py-1 rounded-lg bg-white/[0.04] text-muted-foreground font-mono">
          {generateSKU(product)}
        </code>
      </td>

      {/* Current Stock - Editable */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={currentStock}
            onChange={(e) => {
              const val = e.target.value === "" ? null : parseInt(e.target.value, 10)
              onStockChange(val !== null && !isNaN(val) ? val : null)
            }}
            className="w-20 px-3 py-1.5 text-sm rounded-lg border border-white/[0.1] bg-white/[0.04] focus:outline-none focus:ring-2 text-center font-semibold"
            style={{
              focusRingColor: "oklch(0.78 0.14 85)",
            }}
          />
        </div>
      </td>

      {/* Status Badge */}
      <td className="py-3 px-4">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: badge.bg, color: badge.color }}
        >
          <BadgeIcon className="w-3 h-3" />
          {badge.label}
        </span>
      </td>

      {/* Last Updated */}
      <td className="py-3 px-4">
        <span className="text-xs text-muted-foreground">
          {formatDate(product.updated_at || product.created_at)}
        </span>
      </td>

      {/* Update Button */}
      <td className="py-3 px-4">
        <button
          onClick={onUpdateStock}
          disabled={!hasChanged || isUpdating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: hasChanged ? "oklch(0.78 0.14 85)" : "oklch(0.78 0.14 85 / 0.15)",
            color: hasChanged ? "#000" : "oklch(0.78 0.14 85 / 0.5)",
          }}
        >
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Update
        </button>
      </td>
    </tr>
  )
}

// ─── MOBILE INVENTORY CARD ─────────────────────────────
function InventoryCard({
  product,
  editingStock,
  onStockChange,
  onUpdateStock,
  isUpdating,
}: {
  product: Product
  editingStock: number | null
  onStockChange: (value: number | null) => void
  onUpdateStock: () => void
  isUpdating: boolean
}) {
  const badge = getStockBadge(product.stock)
  const BadgeIcon = badge.icon
  const currentStock = editingStock !== null ? editingStock : product.stock
  const hasChanged = editingStock !== null && editingStock !== product.stock

  return (
    <div className="seller-card p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/[0.04] flex-shrink-0">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{product.title}</p>
          <code className="text-[11px] text-muted-foreground font-mono">
            {generateSKU(product)}
          </code>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0"
          style={{ background: badge.bg, color: badge.color }}
        >
          <BadgeIcon className="w-3 h-3" />
          {badge.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Stock:</span>
          <input
            type="number"
            min={0}
            value={currentStock}
            onChange={(e) => {
              const val = e.target.value === "" ? null : parseInt(e.target.value, 10)
              onStockChange(val !== null && !isNaN(val) ? val : null)
            }}
            className="w-20 px-2 py-1 text-sm rounded-lg border border-white/[0.1] bg-white/[0.04] focus:outline-none focus:ring-2 text-center font-semibold"
          />
        </div>
        <button
          onClick={onUpdateStock}
          disabled={!hasChanged || isUpdating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: hasChanged ? "oklch(0.78 0.14 85)" : "oklch(0.78 0.14 85 / 0.15)",
            color: hasChanged ? "#000" : "oklch(0.78 0.14 85 / 0.5)",
          }}
        >
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          Update
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground/60 mt-2">
        Updated: {formatDate(product.updated_at || product.created_at)}
      </p>
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────
export default function InventoryManagementPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [seller, setSeller] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StockStatus>("all")
  const [sortField, setSortField] = useState<SortField>("title")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [editingStocks, setEditingStocks] = useState<Record<string, number>>({})
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 15

  // Load data
  useEffect(() => {
    if (userId) loadData()
  }, [userId])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // First get seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (sellerError || !sellerData) {
        router.push("/seller-application")
        return
      }

      setSeller(sellerData)

      // Fetch products via API
      const response = await fetch(
        `/api/seller/products/list?sellerId=${sellerData.id}`
      )
      const data = await response.json()

      if (response.ok && data.products) {
        setProducts(data.products)
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error("Load inventory error:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [userId, router])

  // Filter and sort products
  const filteredProducts = products
    .filter((p) => {
      // Status filter
      if (statusFilter !== "all") {
        const status = getStockStatus(p.stock)
        if (status !== statusFilter) return false
      }
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          p.title.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          generateSKU(p).toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1
      switch (sortField) {
        case "title":
          return dir * a.title.localeCompare(b.title)
        case "stock":
          return dir * (a.stock - b.stock)
        case "updated_at":
          return (
            dir *
            (new Date(a.updated_at || a.created_at).getTime() -
              new Date(b.updated_at || b.created_at).getTime())
          )
        default:
          return 0
      }
    })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage))
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * perPage,
    page * perPage
  )

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter])

  // Counts
  const totalCount = products.length
  const inStockCount = products.filter((p) => p.stock >= 5).length
  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock < 5
  ).length
  const outOfStockCount = products.filter((p) => p.stock <= 0).length

  // Stock update handler
  const handleUpdateStock = async (productId: string) => {
    const newStock = editingStocks[productId]
    if (newStock === undefined) return

    setUpdatingIds((prev) => new Set(prev).add(productId))

    try {
      const { error } = await supabase
        .from("products")
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", productId)

      if (error) throw error

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, stock: newStock, updated_at: new Date().toISOString() }
            : p
        )
      )

      // Clear editing state
      setEditingStocks((prev) => {
        const next = { ...prev }
        delete next[productId]
        return next
      })

      setSuccessMessage(`Stock updated for product successfully!`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error("Update stock error:", error)
      alert("Failed to update stock. Please try again.")
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(productId)
        return next
      })
    }
  }

  // Sort toggle
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // ─── LOADING STATE ──────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Skeleton header */}
          <div className="mb-8">
            <div className="skeleton w-64 h-8 rounded-lg mb-2" />
            <div className="skeleton w-40 h-4 rounded-lg" />
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="seller-card p-5 space-y-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="skeleton w-20 h-3 rounded" />
                <div className="skeleton w-16 h-7 rounded" />
              </div>
            ))}
          </div>
          {/* Skeleton table */}
          <div className="seller-card p-6">
            <div className="skeleton w-full h-4 rounded mb-4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton w-full h-12 rounded mb-2" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* ─── SUCCESS TOAST ───────────────────────── */}
        {successMessage && (
          <div
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg"
            style={{
              background: "oklch(0.72 0.19 145 / 0.15)",
              color: "oklch(0.72 0.19 145)",
              border: "1px solid oklch(0.72 0.19 145 / 0.3)",
            }}
          >
            <CheckCircle className="w-4 h-4" />
            {successMessage}
          </div>
        )}

        {/* ─── HEADER ──────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Inventory Management
              </h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "oklch(0.65 0.15 250 / 0.15)",
                  color: "oklch(0.65 0.15 250)",
                }}
              >
                {totalCount} Products
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Track stock levels, update quantities, and manage product
              availability
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
            title="Refresh inventory"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ─── STATUS OVERVIEW CARDS ───────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <OverviewCard
            label="Total Products"
            value={totalCount}
            icon={Package}
            color="oklch(0.65 0.15 250)"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
          <OverviewCard
            label="In Stock"
            value={inStockCount}
            icon={CheckCircle}
            color="oklch(0.72 0.19 145)"
            active={statusFilter === "in_stock"}
            onClick={() => setStatusFilter("in_stock")}
          />
          <OverviewCard
            label="Low Stock"
            value={lowStockCount}
            icon={AlertTriangle}
            color="oklch(0.82 0.17 85)"
            active={statusFilter === "low_stock"}
            onClick={() => setStatusFilter("low_stock")}
          />
          <OverviewCard
            label="Out of Stock"
            value={outOfStockCount}
            icon={XCircle}
            color="oklch(0.63 0.24 25)"
            active={statusFilter === "out_of_stock"}
            onClick={() => setStatusFilter("out_of_stock")}
          />
        </div>

        {/* ─── SEARCH & FILTER BAR ─────────────────── */}
        <div className="seller-card p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, category, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-white/[0.1] bg-white/[0.04] focus:outline-none focus:ring-2 placeholder:text-muted-foreground/50"
                style={{ focusRingColor: "oklch(0.78 0.14 85)" }}
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StockStatus)}
                className="px-3 py-2.5 text-sm rounded-xl border border-white/[0.1] bg-white/[0.04] focus:outline-none focus:ring-2 appearance-none cursor-pointer min-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── INVENTORY TABLE (DESKTOP) ───────────── */}
        {filteredProducts.length === 0 ? (
          <div className="seller-card py-20 text-center">
            <Warehouse
              className="w-14 h-14 mx-auto mb-4"
              style={{ color: "oklch(0.65 0.15 250 / 0.3)" }}
            />
            <h3 className="text-lg font-semibold mb-2">
              {products.length === 0
                ? "No products in your inventory"
                : "No products match your filters"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {products.length === 0
                ? "Start by adding products to your store. Once you have products listed, you can manage their stock levels here."
                : "Try adjusting your search query or status filter to find what you're looking for."}
            </p>
            {products.length === 0 && (
              <button
                onClick={() => router.push("/seller/products/create")}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "oklch(0.78 0.14 85)", color: "#000" }}
              >
                <Package className="w-4 h-4" />
                Add Your First Product
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="seller-card overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      className="border-b border-white/[0.08] text-left"
                      style={{ background: "oklch(0.15 0.02 260 / 0.5)" }}
                    >
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
                        Image
                      </th>
                      <th className="py-3 px-4">
                        <button
                          onClick={() => toggleSort("title")}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          Name
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="py-3 px-4">
                        <button
                          onClick={() => toggleSort("stock")}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          Stock
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="py-3 px-4">
                        <button
                          onClick={() => toggleSort("updated_at")}
                          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                        >
                          Last Updated
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product) => (
                      <InventoryRow
                        key={product.id}
                        product={product}
                        editingStock={
                          editingStocks[product.id] !== undefined
                            ? editingStocks[product.id]
                            : null
                        }
                        onStockChange={(value) =>
                          setEditingStocks((prev) => {
                            if (value === null) {
                              const next = { ...prev }
                              delete next[product.id]
                              return next
                            }
                            return { ...prev, [product.id]: value }
                          })
                        }
                        onUpdateStock={() => handleUpdateStock(product.id)}
                        isUpdating={updatingIds.has(product.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {paginatedProducts.map((product) => (
                <InventoryCard
                  key={product.id}
                  product={product}
                  editingStock={
                    editingStocks[product.id] !== undefined
                      ? editingStocks[product.id]
                      : null
                  }
                  onStockChange={(value) =>
                    setEditingStocks((prev) => {
                      if (value === null) {
                        const next = { ...prev }
                        delete next[product.id]
                        return next
                      }
                      return { ...prev, [product.id]: value }
                    })
                  }
                  onUpdateStock={() => handleUpdateStock(product.id)}
                  isUpdating={updatingIds.has(product.id)}
                />
              ))}
            </div>

            {/* ─── PAGINATION ────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * perPage + 1}–
                  {Math.min(page * perPage, filteredProducts.length)} of{" "}
                  {filteredProducts.length} products
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - page) <= 1
                    )
                    .map((p, idx, arr) => {
                      const showEllipsis =
                        idx > 0 && p - arr[idx - 1] > 1
                      return (
                        <span key={p} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-1 text-muted-foreground text-xs">
                              ...
                            </span>
                          )}
                          <button
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                              page === p
                                ? "text-black"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                            }`}
                            style={
                              page === p
                                ? { background: "oklch(0.78 0.14 85)" }
                                : undefined
                            }
                          >
                            {p}
                          </button>
                        </span>
                      )
                    })}
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── LOW STOCK ALERT BANNER ──────────────── */}
        {lowStockCount > 0 && statusFilter === "all" && (
          <div
            className="seller-card p-4 mt-6 flex items-center gap-3"
            style={{
              background: "oklch(0.82 0.17 85 / 0.06)",
              border: "1px solid oklch(0.82 0.17 85 / 0.15)",
            }}
          >
            <AlertTriangle
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "oklch(0.82 0.17 85)" }}
            />
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.82 0.17 85)" }}
              >
                {lowStockCount} product{lowStockCount > 1 ? "s" : ""} running
                low on stock
              </p>
              <p className="text-xs text-muted-foreground">
                Products with fewer than 5 units need restocking to avoid
                stockouts.
              </p>
            </div>
            <button
              onClick={() => setStatusFilter("low_stock")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 flex-shrink-0"
              style={{
                background: "oklch(0.82 0.17 85)",
                color: "#000",
              }}
            >
              View Low Stock
            </button>
          </div>
        )}

        {/* ─── OUT OF STOCK ALERT BANNER ───────────── */}
        {outOfStockCount > 0 && statusFilter === "all" && (
          <div
            className="seller-card p-4 mt-4 flex items-center gap-3"
            style={{
              background: "oklch(0.63 0.24 25 / 0.06)",
              border: "1px solid oklch(0.63 0.24 25 / 0.15)",
            }}
          >
            <XCircle
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "oklch(0.63 0.24 25)" }}
            />
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ color: "oklch(0.63 0.24 25)" }}
              >
                {outOfStockCount} product{outOfStockCount > 1 ? "s" : ""} out
                of stock
              </p>
              <p className="text-xs text-muted-foreground">
                These products are unavailable for purchase. Restock them to
                resume sales.
              </p>
            </div>
            <button
              onClick={() => setStatusFilter("out_of_stock")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 flex-shrink-0"
              style={{
                background: "oklch(0.63 0.24 25)",
                color: "#fff",
              }}
            >
              View Out of Stock
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
