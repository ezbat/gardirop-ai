"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Package,
  Truck,
  CheckCircle,
  Clock,
  DollarSign,
  Search,
  LogOut,
  Plus
} from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import ProductModal from "@/components/product-modal"
import { 
  getAllUsers, 
  getAllProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  generateId, 
  type Order, 
  type Product 
} from "@/lib/storage"

const ADMIN_EMAIL = "ezbatozmez1@gmail.com"

export default function AdminPage() {
  const router = useRouter()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "users" | "products">("overview")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "shipped" | "delivered">("all")
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const db = await (await import("@/lib/storage")).openDB()
      
      if (db.objectStoreNames.contains("orders")) {
        const tx = db.transaction("orders", "readonly")
        const store = tx.objectStore("orders")
        const allOrders = await store.getAll()
        await tx.done
        setOrders(allOrders.sort((a, b) => b.createdAt - a.createdAt))
      }

      const allUsers = await getAllUsers()
      setUsers(allUsers)
      
      const allProducts = await getAllProducts()
      setProducts(allProducts)
    } catch (error) {
      console.error("Failed to load admin data:", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    const token = localStorage.getItem("admin_token")
    
    if (!token) {
      router.push("/admin/login")
      return
    }

    try {
      const decoded = JSON.parse(atob(token))
      
      const tokenAge = Date.now() - decoded.timestamp
      const maxAge = 24 * 60 * 60 * 1000
      
      if (tokenAge > maxAge) {
        localStorage.removeItem("admin_token")
        router.push("/admin/login")
        return
      }

      if (decoded.email !== ADMIN_EMAIL) {
        localStorage.removeItem("admin_token")
        router.push("/admin/login")
        return
      }

      setIsAuthenticated(true)
      loadData()
      
    } catch (error) {
      console.error("Token error:", error)
      localStorage.removeItem("admin_token")
      router.push("/admin/login")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    router.push("/admin/login")
  }

  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      const db = await (await import("@/lib/storage")).openDB()
      const tx = db.transaction("orders", "readwrite")
      const store = tx.objectStore("orders")
      const order = await store.get(orderId)
      
      if (order) {
        order.status = newStatus
        await store.put(order)
        await tx.done
        await loadData()
      }
    } catch (error) {
      console.error("Failed to update order:", error)
    }
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent"
        />
      </div>
    )
  }

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0)
  const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "paid").length
  const shippedOrders = orders.filter(o => o.status === "shipped").length
  const deliveredOrders = orders.filter(o => o.status === "delivered").length

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
      case "paid": return "text-blue-500 bg-blue-500/10 border-blue-500/20"
      case "shipped": return "text-purple-500 bg-purple-500/10 border-purple-500/20"
      case "delivered": return "text-green-500 bg-green-500/10 border-green-500/20"
    }
  }

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "Beklemede"
      case "paid": return "Odendi"
      case "shipped": return "Kargoda"
      case "delivered": return "Teslim Edildi"
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2 flex items-center gap-3">
                <LayoutDashboard className="w-10 h-10 text-primary" />
                Admin Panel
              </h1>
              <p className="text-muted-foreground">Magazayi yonet</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 glass border border-border rounded-xl hover:border-red-500 hover:text-red-500 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Cikis Yap
            </button>
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border hover:border-primary"
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Genel Bakis
              </div>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                activeTab === "orders"
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border hover:border-primary"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Siparisler ({orders.length})
              </div>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                activeTab === "products"
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border hover:border-primary"
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Urunler ({products.length})
              </div>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                activeTab === "users"
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border hover:border-primary"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Kullanicilar ({users.length})
              </div>
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass border border-border rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/10 rounded-xl">
                      <DollarSign className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Toplam Gelir</p>
                  <p className="text-3xl font-bold text-green-500">{totalRevenue} €</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass border border-border rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <ShoppingBag className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Toplam Siparis</p>
                  <p className="text-3xl font-bold text-blue-500">{orders.length}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass border border-border rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-yellow-500/10 rounded-xl">
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Bekleyen</p>
                  <p className="text-3xl font-bold text-yellow-500">{pendingOrders}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass border border-border rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl">
                      <Package className="w-6 h-6 text-purple-500" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Toplam Urun</p>
                  <p className="text-3xl font-bold text-purple-500">{products.length}</p>
                </motion.div>
              </div>

              <div className="glass border border-border rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Son Siparisler</h2>
                {orders.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-muted-foreground">Henuz siparis yok</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 glass border border-border rounded-xl hover:border-primary transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">#{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">{order.email}</p>
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-bold text-primary">{order.totalPrice} €</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg border text-sm font-semibold ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Siparis ID veya email ara..."
                    className="w-full pl-12 pr-4 py-3 glass border border-border rounded-xl outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(["all", "pending", "paid", "shipped", "delivered"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                        statusFilter === status
                          ? "bg-primary text-primary-foreground"
                          : "glass border border-border hover:border-primary"
                      }`}
                    >
                      {status === "all" ? "Tumunu" : getStatusText(status)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {filteredOrders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass border border-border rounded-2xl p-6"
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-bold text-lg mb-1">#{order.id}</p>
                            <p className="text-sm text-muted-foreground">{order.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{order.totalPrice} €</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4 p-4 glass border border-border rounded-xl">
                          <p className="text-sm font-semibold mb-2">📦 Teslimat Adresi:</p>
                          <p className="text-sm text-muted-foreground">{order.address}</p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-semibold mb-2">Urunler:</p>
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center text-xl overflow-hidden">
                                {item.productImage.startsWith('data:') || item.productImage.startsWith('http') ? (
                                  <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                                ) : (
                                  item.productImage
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{item.productName}</p>
                                <p className="text-xs text-muted-foreground">{item.productBrand}</p>
                              </div>
                              <p className="text-muted-foreground">x{item.quantity}</p>
                              <p className="font-semibold">{item.productPrice * item.quantity} €</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="lg:w-64 space-y-3">
                        <p className="text-sm font-semibold mb-2">Siparis Durumu:</p>
                        <button
                          onClick={() => updateOrderStatus(order.id, "pending")}
                          className={`w-full px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                            order.status === "pending"
                              ? "bg-yellow-500 text-white border-yellow-500"
                              : "glass border-border hover:border-yellow-500"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" />
                            Beklemede
                          </div>
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, "paid")}
                          className={`w-full px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                            order.status === "paid"
                              ? "bg-blue-500 text-white border-blue-500"
                              : "glass border-border hover:border-blue-500"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Odendi
                          </div>
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, "shipped")}
                          className={`w-full px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                            order.status === "shipped"
                              ? "bg-purple-500 text-white border-purple-500"
                              : "glass border-border hover:border-purple-500"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Truck className="w-4 h-4" />
                            Kargoda
                          </div>
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, "delivered")}
                          className={`w-full px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
                            order.status === "delivered"
                              ? "bg-green-500 text-white border-green-500"
                              : "glass border-border hover:border-green-500"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Package className="w-4 h-4" />
                            Teslim Edildi
                          </div>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredOrders.length === 0 && (
                  <div className="text-center py-20 glass border border-border rounded-2xl">
                    <div className="text-9xl mb-6">📦</div>
                    <h3 className="text-2xl font-bold mb-3">Siparis bulunamadi</h3>
                    <p className="text-muted-foreground">
                      {orders.length === 0 ? "Henuz siparis yok" : "Filtrelerinizi degistirin"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Urun Yonetimi</h2>
                <button
                  onClick={() => {
                    setEditingProduct(null)
                    setShowAddProduct(true)
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Yeni Urun Ekle
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-20 glass border border-border rounded-2xl">
                  <div className="text-9xl mb-6">📦</div>
                  <h3 className="text-2xl font-bold mb-3">Henuz urun yok</h3>
                  <p className="text-muted-foreground mb-6">Ilk urunu ekleyin</p>
                  <button
                    onClick={() => {
                      setEditingProduct(null)
                      setShowAddProduct(true)
                    }}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    Urun Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product, idx) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass border border-border rounded-2xl overflow-hidden"
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                        {product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">
                            👕
                          </div>
                        )}
                        
                        {!product.isActive && (
                          <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg">
                            Pasif
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="mb-3">
                          <p className="text-xs text-primary font-semibold mb-1">{product.brand}</p>
                          <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          {product.colors.slice(0, 5).map((color, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full border-2 border-border"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          {product.colors.length > 5 && (
                            <span className="text-xs text-muted-foreground">+{product.colors.length - 5}</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {product.sizes.map((size, i) => (
                            <span
                              key={i}
                              className={`px-2 py-1 text-xs rounded-lg border ${
                                size.stock > 0
                                  ? "border-green-500/20 bg-green-500/10 text-green-500"
                                  : "border-red-500/20 bg-red-500/10 text-red-500"
                              }`}
                            >
                              {size.size} ({size.stock})
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          {product.discountPrice ? (
                            <div>
                              <p className="text-sm text-muted-foreground line-through">{product.price} €</p>
                              <p className="text-2xl font-bold text-primary">{product.discountPrice} €</p>
                            </div>
                          ) : (
                            <p className="text-2xl font-bold text-primary">{product.price} €</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product)
                              setShowAddProduct(true)
                            }}
                            className="flex-1 px-4 py-2 glass border border-border rounded-xl hover:border-primary transition-colors text-sm font-semibold"
                          >
                            Duzenle
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Bu urunu silmek istediginize emin misiniz?")) {
                                await deleteProduct(product.id)
                                await loadData()
                              }
                            }}
                            className="px-4 py-2 glass border border-red-500/20 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors text-sm font-semibold"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              {users.map((user, idx) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass border border-border rounded-2xl p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{user.followers?.length || 0}</strong> Takipci
                        </span>
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">{user.following?.length || 0}</strong> Takip
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Kayit Tarihi</p>
                      <p className="text-sm font-semibold">
                        {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-20 glass border border-border rounded-2xl">
                  <div className="text-9xl mb-6">👥</div>
                  <h3 className="text-2xl font-bold mb-3">Henuz kullanici yok</h3>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {showAddProduct && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowAddProduct(false)
            setEditingProduct(null)
          }}
          onSave={async (product) => {
            if (editingProduct) {
              await updateProduct(product)
            } else {
              await addProduct({ ...product, id: generateId(), createdAt: Date.now() })
            }
            await loadData()
            setShowAddProduct(false)
            setEditingProduct(null)
          }}
        />
      )}
    </div>
  )
}