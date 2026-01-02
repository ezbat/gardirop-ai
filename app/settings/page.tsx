"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { motion } from "framer-motion"
import { 
  Settings, 
  User, 
  Globe, 
  Lock, 
  Bell, 
  Moon, 
  Sun,
  Trash2,
  LogOut,
  Shield,
  Eye,
  EyeOff,
  MessageSquare
} from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUser, updateUser, type User as UserType } from "@/lib/storage"

export default function SettingsPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"account" | "privacy" | "notifications" | "appearance">("account")
  
  // Settings State
  const [language, setLanguage] = useState("tr")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [profilePrivate, setProfilePrivate] = useState(false)
  const [allowMessages, setAllowMessages] = useState<"everyone" | "following" | "none">("everyone")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)

  useEffect(() => {
    if (userId) {
      loadUser()
    }
  }, [userId])

  const loadUser = async () => {
    if (!userId) return
    setLoading(true)
    try {
  const userData = await getUser(userId)
if (userData) {
  setUser(userData)
}
    } catch (error) {
      console.error("Failed to load user:", error)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!userId || !user) return
    
    try {
      await updateUser({
        ...user,
        settings: {
          language,
          theme,
          profilePrivate,
          allowMessages,
          notificationsEnabled,
          emailNotifications
        }
      })
      alert("Ayarlar kaydedildi!")
    } catch (error) {
      console.error("Failed to save settings:", error)
      alert("Ayarlar kaydedilemedi!")
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm("Hesabini silmek istediğine emin misin? Bu işlem geri alinamaz!")) return
    
    // TODO: Implement account deletion
    alert("Hesap silme özelliği yakında eklenecek!")
  }

  if (loading) {
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingParticles />

      <section className="relative py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2 flex items-center gap-3">
              <Settings className="w-10 h-10 text-primary" />
              Ayarlar
            </h1>
            <p className="text-muted-foreground">Hesap ve uygulama ayarlarini yonet</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="glass border border-border rounded-xl p-2 space-y-1">
                <button
                  onClick={() => setActiveTab("account")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "account"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Hesap</span>
                </button>

                <button
                  onClick={() => setActiveTab("privacy")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "privacy"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span className="font-medium">Gizlilik</span>
                </button>

                <button
                  onClick={() => setActiveTab("notifications")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "notifications"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-medium">Bildirimler</span>
                </button>

                <button
                  onClick={() => setActiveTab("appearance")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === "appearance"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="font-medium">Gorunum</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="md:col-span-3">
              <div className="glass border border-border rounded-xl p-6">
                {/* HESAP */}
                {activeTab === "account" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Hesap Bilgileri</h2>
                    </div>

                    <div className="flex items-center gap-4 p-4 glass border border-border rounded-xl">
                      <Avatar className="w-20 h-20 border-2 border-primary/20">
                        <AvatarImage src={user?.avatar} alt={user?.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                          {user?.name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-bold text-xl">{user?.name}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Dil</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2 glass border border-border rounded-xl outline-none focus:border-primary"
                      >
                        <option value="tr">Turkce</option>
                        <option value="en">English</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
                        <Trash2 className="w-5 h-5" />
                        Tehlikeli Bolge
                      </h3>
                      <button
                        onClick={handleDeleteAccount}
                        className="w-full px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
                      >
                        Hesabimi Sil
                      </button>
                    </div>
                  </div>
                )}

                {/* GİZLİLİK */}
                {activeTab === "privacy" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Gizlilik Ayarlari</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 glass border border-border rounded-xl">
                        <div className="flex items-center gap-3">
                          {profilePrivate ? (
                            <EyeOff className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <Eye className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-semibold">Gizli Hesap</p>
                            <p className="text-sm text-muted-foreground">
                              Sadece takipcilerin profilini gorebilir
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setProfilePrivate(!profilePrivate)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            profilePrivate ? "bg-primary" : "bg-secondary"
                          }`}
                        >
                          <motion.div
                            animate={{ x: profilePrivate ? 24 : 0 }}
                            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                          />
                        </button>
                      </div>

                      <div className="p-4 glass border border-border rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <MessageSquare className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">Kimler Mesaj Atabilir</p>
                            <p className="text-sm text-muted-foreground">
                              Mesaj alma tercihlerini ayarla
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary cursor-pointer">
                            <input
                              type="radio"
                              name="messages"
                              checked={allowMessages === "everyone"}
                              onChange={() => setAllowMessages("everyone")}
                              className="w-4 h-4"
                            />
                            <span>Herkes</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary cursor-pointer">
                            <input
                              type="radio"
                              name="messages"
                              checked={allowMessages === "following"}
                              onChange={() => setAllowMessages("following")}
                              className="w-4 h-4"
                            />
                            <span>Sadece takip ettiklerim</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary cursor-pointer">
                            <input
                              type="radio"
                              name="messages"
                              checked={allowMessages === "none"}
                              onChange={() => setAllowMessages("none")}
                              className="w-4 h-4"
                            />
                            <span>Kimse</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* BİLDİRİMLER */}
                {activeTab === "notifications" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Bildirim Ayarlari</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 glass border border-border rounded-xl">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">Push Bildirimler</p>
                            <p className="text-sm text-muted-foreground">
                              Uygulama bildirimleri
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            notificationsEnabled ? "bg-primary" : "bg-secondary"
                          }`}
                        >
                          <motion.div
                            animate={{ x: notificationsEnabled ? 24 : 0 }}
                            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 glass border border-border rounded-xl">
                        <div className="flex items-center gap-3">
                          <Shield className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold">Email Bildirimleri</p>
                            <p className="text-sm text-muted-foreground">
                              Onemli guncellemeler email ile gelsin
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setEmailNotifications(!emailNotifications)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            emailNotifications ? "bg-primary" : "bg-secondary"
                          }`}
                        >
                          <motion.div
                            animate={{ x: emailNotifications ? 24 : 0 }}
                            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* GÖRÜNÜM */}
                {activeTab === "appearance" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Gorunum Ayarlari</h2>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-3 block">Tema</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setTheme("light")}
                          className={`p-6 rounded-xl border-2 transition-all ${
                            theme === "light"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Sun className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-semibold">Aydinlik</p>
                        </button>

                        <button
                          onClick={() => setTheme("dark")}
                          className={`p-6 rounded-xl border-2 transition-all ${
                            theme === "dark"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Moon className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-semibold">Karanlik</p>
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Not: Karanlik tema yakinda eklenecek!
                      </p>
                    </div>
                  </div>
                )}

                {/* KAYDET BUTONU */}
                <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                  >
                    Degisiklikleri Kaydet
                  </button>

                  <button
                    onClick={() => signOut()}
                    className="px-6 py-3 glass border border-border rounded-xl hover:border-red-500 hover:text-red-500 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Cikis Yap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}