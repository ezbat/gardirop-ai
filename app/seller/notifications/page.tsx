"use client"

import { useState, useMemo } from "react"
import {
  Bell,
  ShoppingCart,
  Star,
  AlertTriangle,
  Info,
  Megaphone,
  CheckCheck,
  Inbox,
  Circle,
} from "lucide-react"

// ─── TYPES ─────────────────────────────────────────────
type NotificationType = "order" | "review" | "system" | "marketing" | "stock"

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  read: boolean
}

// ─── CONSTANTS ─────────────────────────────────────────
const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "order", label: "Orders" },
  { key: "review", label: "Reviews" },
  { key: "system", label: "System" },
  { key: "marketing", label: "Marketing" },
] as const

type FilterKey = (typeof FILTER_TABS)[number]["key"]

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: typeof Bell; dotColor: string; iconBg: string; label: string }
> = {
  order: {
    icon: ShoppingCart,
    dotColor: "oklch(0.72 0.19 145)",
    iconBg: "oklch(0.72 0.19 145 / 0.15)",
    label: "Order",
  },
  review: {
    icon: Star,
    dotColor: "oklch(0.78 0.14 85)",
    iconBg: "oklch(0.78 0.14 85 / 0.15)",
    label: "Review",
  },
  stock: {
    icon: AlertTriangle,
    dotColor: "oklch(0.7 0.18 55)",
    iconBg: "oklch(0.7 0.18 55 / 0.15)",
    label: "Stock",
  },
  system: {
    icon: Info,
    dotColor: "oklch(0.65 0.15 250)",
    iconBg: "oklch(0.65 0.15 250 / 0.15)",
    label: "System",
  },
  marketing: {
    icon: Megaphone,
    dotColor: "oklch(0.65 0.18 260)",
    iconBg: "oklch(0.65 0.18 260 / 0.15)",
    label: "Marketing",
  },
}

// ─── MOCK DATA ─────────────────────────────────────────
const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "order",
    title: "New Order #4821",
    description:
      "Sarah M. placed an order for 2 items totaling €89.90. Ships to Munich.",
    timestamp: "2 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "review",
    title: "5-Star Review Received",
    description:
      '"Absolutely love this outfit! Perfect fit and fast shipping." — @fashionlover22',
    timestamp: "18 min ago",
    read: false,
  },
  {
    id: "n3",
    type: "stock",
    title: "Low Stock: Linen Blazer (M)",
    description:
      "Only 3 units remaining. Consider restocking soon to avoid missed sales.",
    timestamp: "45 min ago",
    read: false,
  },
  {
    id: "n4",
    type: "system",
    title: "Platform Update v3.2",
    description:
      "New analytics dashboard features are now available. Check out the updated reports section.",
    timestamp: "1 hour ago",
    read: false,
  },
  {
    id: "n5",
    type: "marketing",
    title: "Boost Your Weekend Sales",
    description:
      "Stores that run Friday flash sales see 40% more engagement. Create a campaign now.",
    timestamp: "2 hours ago",
    read: true,
  },
  {
    id: "n6",
    type: "order",
    title: "Order #4819 Shipped",
    description:
      "DHL tracking number generated. Customer has been notified via email.",
    timestamp: "3 hours ago",
    read: true,
  },
  {
    id: "n7",
    type: "review",
    title: "New Review on Denim Jacket",
    description:
      '"Good quality but sizing runs a bit small." — @style_hunter. Consider responding.',
    timestamp: "4 hours ago",
    read: true,
  },
  {
    id: "n8",
    type: "system",
    title: "Scheduled Maintenance",
    description:
      "Brief maintenance window on Sunday 02:00–04:00 CET. No action required.",
    timestamp: "5 hours ago",
    read: true,
  },
  {
    id: "n9",
    type: "stock",
    title: "Out of Stock: Silk Scarf (Red)",
    description:
      "This item is now out of stock. 12 customers have it wishlisted.",
    timestamp: "6 hours ago",
    read: true,
  },
  {
    id: "n10",
    type: "order",
    title: "New Order #4817",
    description:
      "Tom K. ordered 1 item for €45.00. Express delivery requested.",
    timestamp: "7 hours ago",
    read: true,
  },
  {
    id: "n11",
    type: "marketing",
    title: "Valentine's Day Campaign Ideas",
    description:
      "Valentine's Day is approaching. Create themed collections to capture seasonal demand.",
    timestamp: "8 hours ago",
    read: true,
  },
  {
    id: "n12",
    type: "system",
    title: "New Payout Processed",
    description:
      "Your weekly payout of €1,245.80 has been processed. Expect it within 2 business days.",
    timestamp: "Yesterday",
    read: true,
  },
]

// ─── NOTIFICATION ITEM ─────────────────────────────────
function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
}) {
  const config = TYPE_CONFIG[notification.type]
  const Icon = config.icon

  return (
    <button
      onClick={() => !notification.read && onMarkRead(notification.id)}
      className={`w-full text-left seller-card p-4 flex items-start gap-4 transition-all duration-200 ${
        !notification.read
          ? "ring-1 ring-white/10"
          : "opacity-70"
      }`}
      style={{
        cursor: notification.read ? "default" : "pointer",
      }}
    >
      {/* Icon */}
      <div
        className="relative flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: config.iconBg }}
      >
        <Icon
          className="w-5 h-5"
          style={{ color: config.dotColor }}
        />
        {!notification.read && (
          <span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black/80"
            style={{ background: config.dotColor }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3
            className={`text-sm truncate ${
              !notification.read
                ? "font-semibold text-white"
                : "font-medium text-white/70"
            }`}
          >
            {notification.title}
          </h3>
          <span className="text-xs text-white/40 whitespace-nowrap flex-shrink-0">
            {notification.timestamp}
          </span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
          {notification.description}
        </p>
      </div>
    </button>
  )
}

// ─── EMPTY STATE ───────────────────────────────────────
function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "oklch(0.65 0.15 250 / 0.12)" }}
      >
        <Inbox className="w-8 h-8" style={{ color: "oklch(0.65 0.15 250)" }} />
      </div>
      <h3 className="text-lg font-semibold text-white/80 mb-1">
        No notifications
      </h3>
      <p className="text-sm text-white/40 max-w-xs">
        {filter === "all"
          ? "You're all caught up! New notifications will appear here."
          : `No ${filter} notifications at the moment.`}
      </p>
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(
    INITIAL_NOTIFICATIONS
  )
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications
    return notifications.filter((n) => {
      if (activeFilter === "order") return n.type === "order" || n.type === "stock"
      return n.type === activeFilter
    })
  }, [notifications, activeFilter])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const unreadFilteredCount = useMemo(
    () => filteredNotifications.filter((n) => !n.read).length,
    [filteredNotifications]
  )

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "oklch(0.65 0.15 250 / 0.15)" }}
          >
            <Bell
              className="w-5 h-5"
              style={{ color: "oklch(0.65 0.15 250)" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: "oklch(0.63 0.24 25)" }}
                >
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-white/50">
              Stay updated on orders, reviews, and system alerts
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80"
            style={{
              background: "oklch(0.72 0.19 145 / 0.12)",
              color: "oklch(0.72 0.19 145)",
            }}
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "text-white shadow-lg"
                  : "text-white/50 hover:text-white/70 hover:bg-white/5"
              }`}
              style={
                isActive
                  ? { background: "oklch(0.65 0.15 250 / 0.25)", borderBottom: "2px solid oklch(0.65 0.15 250)" }
                  : {}
              }
            >
              {tab.label}
              {tab.key === "all" && unreadCount > 0 && (
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive
                      ? "oklch(0.65 0.15 250 / 0.4)"
                      : "oklch(1 0 0 / 0.1)",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Summary Bar */}
      {filteredNotifications.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-white/40">
            {filteredNotifications.length} notification
            {filteredNotifications.length !== 1 ? "s" : ""}
            {unreadFilteredCount > 0 && (
              <span>
                {" "}
                &middot;{" "}
                <span style={{ color: "oklch(0.72 0.19 145)" }}>
                  {unreadFilteredCount} unread
                </span>
              </span>
            )}
          </p>
          <div className="flex items-center gap-1 text-xs text-white/30">
            <Circle className="w-2 h-2 fill-current" />
            Click unread to mark as read
          </div>
        </div>
      )}

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      ) : (
        <EmptyState filter={activeFilter} />
      )}
    </div>
  )
}
