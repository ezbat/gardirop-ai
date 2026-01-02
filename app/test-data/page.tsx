"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Loader2, Check } from "lucide-react"
import {
  createOrUpdateUser,
  addStory,
  generateId,
  type User,
  type Story
} from "@/lib/storage"

export default function TestDataPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const addTestData = async () => {
    if (!userId) {
      alert("Önce giriş yapmalısın!")
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      // Test Kullanıcıları
      const testUsers: User[] = [
        {
          id: "test-user-1",
          name: "Ayşe Yılmaz",
          username: "ayse_yilmaz",
          email: "ayse@test.com",
          avatar: "https://i.pravatar.cc/150?img=1",
          bio: "Moda tutkunu 👗 | Istanbul",
          followers: [userId],
          following: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30 // 30 gün önce
        },
        {
          id: "test-user-2",
          name: "Mehmet Kaya",
          username: "mehmet_kaya",
          email: "mehmet@test.com",
          avatar: "https://i.pravatar.cc/150?img=12",
          bio: "Style blogger ✨ | Ankara",
          followers: [userId],
          following: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20
        },
        {
          id: "test-user-3",
          name: "Zeynep Demir",
          username: "zeynep_demir",
          email: "zeynep@test.com",
          avatar: "https://i.pravatar.cc/150?img=5",
          bio: "Fashion lover 💕 | Izmir",
          followers: [userId],
          following: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15
        },
        {
          id: "test-user-4",
          name: "Can Öztürk",
          username: "can_ozturk",
          email: "can@test.com",
          avatar: "https://i.pravatar.cc/150?img=14",
          bio: "Outfit of the day 📸 | Bursa",
          followers: [userId],
          following: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10
        },
        {
          id: "test-user-5",
          name: "Selin Arslan",
          username: "selin_arslan",
          email: "selin@test.com",
          avatar: "https://i.pravatar.cc/150?img=9",
          bio: "Style is a way to say who you are 💫",
          followers: [userId],
          following: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5
        }
      ]

      // Kullanıcıları ekle
      for (const user of testUsers) {
        await createOrUpdateUser(user)
      }

      // Test Hikayeleri
      const testStories: Story[] = [
        // Ayşe'nin hikayeleri
        {
          id: generateId(),
          userId: "test-user-1",
          userName: "Ayşe Yılmaz",
          userAvatar: "https://i.pravatar.cc/150?img=1",
          type: "outfit",
          caption: "Bugünkü kombinim 😍",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 2, // 2 saat önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 22 // 22 saat sonra
        },
        {
          id: generateId(),
          userId: "test-user-1",
          userName: "Ayşe Yılmaz",
          userAvatar: "https://i.pravatar.cc/150?img=1",
          type: "outfit",
          caption: "Akşam için hazırlanıyorum ✨",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 1, // 1 saat önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 23
        },

        // Mehmet'in hikayesi
        {
          id: generateId(),
          userId: "test-user-2",
          userName: "Mehmet Kaya",
          userAvatar: "https://i.pravatar.cc/150?img=12",
          type: "outfit",
          caption: "Yeni tarzım 🔥",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 5, // 5 saat önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 19
        },

        // Zeynep'in hikayeleri
        {
          id: generateId(),
          userId: "test-user-3",
          userName: "Zeynep Demir",
          userAvatar: "https://i.pravatar.cc/150?img=5",
          type: "outfit",
          caption: "Sabah kombinim 🌅",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 30, // 30 dk önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 23.5
        },
        {
          id: generateId(),
          userId: "test-user-3",
          userName: "Zeynep Demir",
          userAvatar: "https://i.pravatar.cc/150?img=5",
          type: "outfit",
          caption: "Office look 💼",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 15, // 15 dk önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 23.75
        },

        // Can'ın hikayesi
        {
          id: generateId(),
          userId: "test-user-4",
          userName: "Can Öztürk",
          userAvatar: "https://i.pravatar.cc/150?img=14",
          type: "outfit",
          caption: "Spor kombinim 🏃‍♂️",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 8, // 8 saat önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 16
        },

        // Selin'in hikayeleri
        {
          id: generateId(),
          userId: "test-user-5",
          userName: "Selin Arslan",
          userAvatar: "https://i.pravatar.cc/150?img=9",
          type: "outfit",
          caption: "Vintage style 🌸",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 60 * 3, // 3 saat önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 21
        },
        {
          id: generateId(),
          userId: "test-user-5",
          userName: "Selin Arslan",
          userAvatar: "https://i.pravatar.cc/150?img=9",
          type: "outfit",
          caption: "Gece çıkışı 🌙",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 45, // 45 dk önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 23.25
        },
        {
          id: generateId(),
          userId: "test-user-5",
          userName: "Selin Arslan",
          userAvatar: "https://i.pravatar.cc/150?img=9",
          type: "outfit",
          caption: "Son bir daha 💕",
          viewedBy: [],
          createdAt: Date.now() - 1000 * 60 * 20, // 20 dk önce
          expiresAt: Date.now() + 1000 * 60 * 60 * 23.67
        }
      ]

      // Hikayeleri ekle
      for (const story of testStories) {
        await addStory(story)
      }

      setSuccess(true)
      alert("✅ Test verileri eklendi!\n\n5 kullanıcı\n10 hikaye\n\nHikayeler sayfasına git ve kontrol et!")
    } catch (error) {
      console.error("Failed to add test data:", error)
      alert("❌ Hata oluştu: " + error)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full glass border border-border rounded-2xl p-8 text-center">
        <div className="text-6xl mb-4">🧪</div>
        <h1 className="text-2xl font-bold mb-2">Test Verisi Ekle</h1>
        <p className="text-muted-foreground mb-6">
          5 test kullanıcısı ve 10 hikaye eklenecek
        </p>

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/50 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <Check className="w-5 h-5" />
              <span className="font-semibold">Başarılı!</span>
            </div>
            <p className="text-sm text-green-600">
              Test verileri eklendi. Hikayeler sayfasına git!
            </p>
          </div>
        )}

        <button
          onClick={addTestData}
          disabled={loading}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Ekleniyor...
            </>
          ) : (
            "Test Verilerini Ekle"
          )}
        </button>

        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-semibold mb-2">Eklenecekler:</p>
          <ul className="text-left space-y-1">
            <li>• 5 test kullanıcısı</li>
            <li>• 10 hikaye (farklı zamanlarda)</li>
            <li>• Avatar resimleri</li>
            <li>• Biyografiler</li>
          </ul>
        </div>
      </div>
    </div>
  )
}