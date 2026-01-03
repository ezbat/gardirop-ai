"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Users, FileText, ShoppingBag, Loader2 } from "lucide-react"
import Link from "next/link"
import FloatingParticles from "@/components/floating-particles"
import SearchBar from "@/components/search-bar"
import { supabase } from "@/lib/supabase"

type TabType = "users" | "posts" | "products"

interface User {
  id: string
  name: string
  username: string
  image: string | null
}

interface Post {
  id: string
  content: string
  image_url: string | null
  created_at: string
  user: User
}

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  category: string
}

export default function SearchPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<TabType>("users")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  
  const [users, setUsers] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    if (query) {
      handleSearch(query)
    } else {
      setUsers([])
      setPosts([])
      setProducts([])
    }
  }, [query, activeTab])

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      if (activeTab === "users") {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, username, image')
          .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .limit(20)

        if (error) throw error
        setUsers(data || [])
      } 
      else if (activeTab === "posts") {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            image_url,
            created_at,
            user:users(id, name, username, image)
          `)
          .ilike('content', `%${searchQuery}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error
        setPosts(data as any || [])
      } 
      else if (activeTab === "products") {
        const { data, error } = await supabase
          .from('store_products')
          .select('id, name, price, image_url, category')
          .or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
          .limit(20)

        if (error) throw error
        setProducts(data || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Giriş Yapmalısınız</h2>
          <a href="/api/auth/signin" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold inline-block">Giriş Yap</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />
      
      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl font-bold mb-4">Ara</h1>
            <p className="text-muted-foreground">Kullanıcılar, gönderiler ve ürünleri keşfet</p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 flex justify-center">
            <SearchBar onSearch={setQuery} placeholder="Ara..." />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 justify-center">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${
                activeTab === "users" ? "bg-primary text-primary-foreground" : "glass border border-border"
              }`}
            >
              <Users className="w-5 h-5" />
              Kullanıcılar
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${
                activeTab === "posts" ? "bg-primary text-primary-foreground" : "glass border border-border"
              }`}
            >
              <FileText className="w-5 h-5" />
              Gönderiler
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 ${
                activeTab === "products" ? "bg-primary text-primary-foreground" : "glass border border-border"
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              Ürünler
            </button>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : !query ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>Aramaya başlamak için bir şeyler yazın</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Users Results */}
              {activeTab === "users" && (
                users.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p>Kullanıcı bulunamadı</p>
                  </div>
                ) : (
                  users.map((user, idx) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link href={`/profile/${user.id}`} className="block glass border border-border rounded-xl p-4 hover:border-primary transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {user.image ? (
                              <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">👤</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )
              )}

              {/* Posts Results */}
              {activeTab === "posts" && (
                posts.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p>Gönderi bulunamadı</p>
                  </div>
                ) : (
                  posts.map((post, idx) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass border border-border rounded-xl p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {post.user.image ? (
                            <img src={post.user.image} alt={post.user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>👤</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{post.user.name}</p>
                          <p className="text-muted-foreground mt-2">{post.content}</p>
                          {post.image_url && (
                            <img src={post.image_url} alt="Post" className="mt-4 rounded-xl w-full max-h-96 object-cover" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )
              )}

              {/* Products Results */}
              {activeTab === "products" && (
                products.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p>Ürün bulunamadı</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product, idx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Link href={`/store/${product.id}`} className="block glass border border-border rounded-xl overflow-hidden hover:border-primary transition-colors">
                          <div className="aspect-square bg-primary/5">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-primary font-semibold">{product.category}</p>
                            <h3 className="font-bold truncate">{product.name}</h3>
                            <p className="text-lg font-bold text-primary">€{product.price.toFixed(2)}</p>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  )
}