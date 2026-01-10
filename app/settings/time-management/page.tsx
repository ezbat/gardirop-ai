"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Info } from "lucide-react"

export default function TimeManagementPage() {
  const router = useRouter()

  const weeklyData = [
    { day: 'Paz', minutes: 40 },
    { day: 'Pzt', minutes: 20 },
    { day: 'Sal', minutes: 35 },
    { day: 'Çar', minutes: 10 },
    { day: 'Per', minutes: 85 },
    { day: 'Cum', minutes: 75 },
    { day: 'Bugün', minutes: 0, isCurrent: true }
  ]

  const maxMinutes = Math.max(...weeklyData.map(d => d.minutes))

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">Zaman yönetimi</h1>
        <button className="p-2 hover:bg-secondary rounded-lg"><Info className="w-6 h-6" /></button>
      </div>
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-4xl font-bold mb-2">9dk</h2>
          <p className="text-lg font-semibold mb-1">Günlük ortalama</p>
          <p className="text-sm text-muted-foreground">Geçen hafta bu cihazda Instagram kullanarak bir günde geçirdiğin ortalama süre. İnternetteki zamanını dengeleme hakkında daha fazla bilgi al.</p>
        </div>
        <div className="flex items-end justify-between gap-2 h-64 mb-8">
          {weeklyData.map((item, index) => {
            const height = item.minutes === 0 ? 4 : (item.minutes / maxMinutes) * 100
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                  <div className={`w-full rounded-t-lg ${item.isCurrent ? 'bg-primary' : 'bg-primary/80'}`} style={{ height: `${height}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{item.day}</span>
              </div>
            )
          })}
        </div>
        <div>
          <p className="text-sm font-bold mb-3">Zamanını yönet</p>
          <div className="space-y-1">
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <span>Günlük sınır</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Kapalı</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 rounded-lg transition-colors">
              <div className="flex-1 text-left">
                <p className="font-semibold">Uyku modu</p>
                <p className="text-sm text-muted-foreground">Sana şu günlerde 23 ile 07 arasında Instagram uygulamalarını kapatmanı hatırlatacağız: .</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Açık</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}