'use client'

/**
 * /seller/messages — Premium seller messaging inbox
 *
 * Features:
 * - Conversation list with unread badges + live time labels
 * - Clean message bubbles with date separators + read receipts
 * - Optimistic message send (appears immediately, preserved during polls)
 * - Page-visibility-aware polling (pauses when tab hidden)
 * - Marks conversations as read on open (local + server)
 * - Search/filter conversations
 * - Auto-resizing textarea composer (Enter sends, Shift+Enter newline)
 */

import {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import { useSession } from 'next-auth/react'
import {
  MessageCircle, Loader2, Package, Send, Inbox,
  Check, CheckCheck, Search,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string
  product_id: string | null
  last_message: string
  last_message_at: string
  seller_unread_count: number
  customer?: {
    id: string
    name: string | null
    username: string | null
    avatar_url: string | null
    email: string | null
  }
  product?: {
    id: string
    title: string
    images: string[]
  } | null
}

interface Message {
  id: string
  sender_type: 'customer' | 'seller'
  message: string
  created_at: string
  is_read: boolean
  _optimistic?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateString: string): string {
  const date  = new Date(dateString)
  const now   = new Date()
  const diffH = (now.getTime() - date.getTime()) / 3_600_000

  if (diffH < 24)  return date.toLocaleTimeString('de-DE',  { hour: '2-digit', minute: '2-digit' })
  if (diffH < 168) return date.toLocaleDateString('de-DE',  { weekday: 'short' })
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function formatDateSeparator(dateString: string): string {
  const date     = new Date(dateString)
  const now      = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Gestern'
  return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function customerLabel(conv: Conversation): string {
  return conv.customer?.name || conv.customer?.username || conv.customer?.email || 'Kunde'
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

function AvatarCircle({ name, size = 36 }: { name: string; size?: number }) {
  const initial = (name || 'K').charAt(0).toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
      }}
    >
      {initial}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SellerMessagesPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  // ── State ─────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected,      setSelected]      = useState<Conversation | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [newMessage,    setNewMessage]    = useState('')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [sending,       setSending]       = useState(false)
  const [sendError,     setSendError]     = useState<string | null>(null)
  const [hasNewMsg,     setHasNewMsg]     = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const convPollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgPollRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedIdRef   = useRef<string | null>(null)
  const textareaRef     = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { selectedIdRef.current = selected?.id ?? null }, [selected])

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [newMessage])

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async (silent = false) => {
    try {
      const res  = await fetch('/api/conversations?type=seller')
      const data = await res.json()
      if (res.ok) {
        setConversations(data.conversations ?? [])
        if (selectedIdRef.current) {
          setSelected(prev =>
            prev
              ? (data.conversations ?? []).find((c: Conversation) => c.id === prev.id) ?? prev
              : prev,
          )
        }
      }
    } catch (e) {
      console.error('[seller/messages] loadConversations:', e)
    } finally {
      if (!silent) setLoadingConvs(false)
    }
  }, [])

  useEffect(() => {
    if (userId) loadConversations()
  }, [userId, loadConversations])

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true)
    try {
      const res  = await fetch(`/api/conversations/${convId}/messages`)
      const data = await res.json()
      if (res.ok) {
        const incoming: Message[] = data.messages ?? []

        setMessages(prev => {
          // Preserve any in-flight optimistic messages during silent polls
          // so they don't visually disappear while awaiting the API response.
          const optimistic = silent ? prev.filter(m => m._optimistic) : []
          const realPrev   = prev.filter(m => !m._optimistic)

          if (silent && incoming.length > realPrev.length) {
            setHasNewMsg(true)
          }
          return [...incoming, ...optimistic]
        })

        // Reset unread counter for this conversation locally
        setConversations(cs =>
          cs.map(c => c.id === convId ? { ...c, seller_unread_count: 0 } : c),
        )
      }
    } catch (e) {
      console.error('[seller/messages] loadMessages:', e)
    } finally {
      if (!silent) setLoadingMsgs(false)
    }
  }, [])

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    convPollRef.current = setInterval(() => {
      if (!document.hidden) loadConversations(true)
    }, 30_000)
    return () => { if (convPollRef.current) clearInterval(convPollRef.current) }
  }, [userId, loadConversations])

  useEffect(() => {
    if (msgPollRef.current) clearInterval(msgPollRef.current)
    if (!selected) return

    loadMessages(selected.id)

    msgPollRef.current = setInterval(() => {
      const id = selectedIdRef.current
      if (id && !document.hidden) loadMessages(id, true)
    }, 5_000)

    return () => { if (msgPollRef.current) clearInterval(msgPollRef.current) }
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasNewMsg) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setHasNewMsg(false)
  }, [hasNewMsg, messages])

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50)
  }, [selected?.id])

  // ── Select conversation ────────────────────────────────────────────────────
  const handleSelect = useCallback((conv: Conversation) => {
    setSelected(conv)
    setMessages([])
    setSendError(null)
    setConversations(cs =>
      cs.map(c => c.id === conv.id ? { ...c, seller_unread_count: 0 } : c),
    )
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = newMessage.trim()
    if (!text || !selected || sending) return

    setSending(true)
    setSendError(null)

    const optimisticMsg: Message = {
      id:          `opt-${Date.now()}`,
      sender_type: 'seller',
      message:     text,
      created_at:  new Date().toISOString(),
      is_read:     false,
      _optimistic: true,
    }
    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

    try {
      const res = await fetch(`/api/conversations/${selected.id}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text }),
      })

      if (res.ok) {
        await loadMessages(selected.id, true)
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
        setNewMessage(text)
        setSendError('Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.')
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setNewMessage(text)
      setSendError('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setSending(false)
    }
  }, [newMessage, selected, sending, loadMessages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Filtered conversations ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c =>
      customerLabel(c).toLowerCase().includes(q) ||
      c.last_message.toLowerCase().includes(q) ||
      (c.product?.title ?? '').toLowerCase().includes(q),
    )
  }, [conversations, searchQuery])

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.seller_unread_count || 0), 0),
    [conversations],
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#F5F6FA' }}>

      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-4" style={{ background: '#FFFFFF', borderBottom: '1px solid #EBEBEB' }}>
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="relative">
            <MessageCircle className="w-5 h-5" style={{ color: '#D97706' }} />
            {totalUnread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                style={{ background: '#DC2626' }}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-[18px] font-bold" style={{ color: '#111827' }}>Nachrichten</h1>
            <p className="text-[12px]" style={{ color: '#9CA3AF' }}>
              {loadingConvs
                ? 'Wird geladen…'
                : `${conversations.length} Gespräch${conversations.length !== 1 ? 'e' : ''}${totalUnread > 0 ? ` · ${totalUnread} ungelesen` : ''}`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full" style={{ padding: '20px 24px' }}>
        <div className="h-full" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

          {/* ── Conversation list ─────────────────────────────────────────── */}
          <div className="flex flex-col overflow-hidden rounded-xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

            {/* Search */}
            <div className="flex-shrink-0 px-3 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ left: 10, color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Gespräche suchen…"
                  className="w-full text-[12px] rounded-lg outline-none"
                  style={{
                    paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                    background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#D97706')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}>
              {loadingConvs ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#D97706' }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <Inbox className="w-9 h-9 mb-3" style={{ color: '#D1D5DB' }} />
                  <p className="text-[13px] font-medium" style={{ color: '#6B7280' }}>
                    {searchQuery ? 'Kein Gespräch gefunden' : 'Keine Nachrichten'}
                  </p>
                  {!searchQuery && (
                    <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                      Kundennachrichten erscheinen hier
                    </p>
                  )}
                </div>
              ) : (
                filtered.map(conv => {
                  const isActive  = selected?.id === conv.id
                  const hasUnread = conv.seller_unread_count > 0
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelect(conv)}
                      className="w-full text-left block"
                      style={{
                        padding: '11px 14px',
                        borderBottom: '1px solid #F9FAFB',
                        borderLeft: isActive ? '3px solid #D97706' : '3px solid transparent',
                        background: isActive ? 'rgba(217,119,6,0.04)' : 'transparent',
                        transition: 'background 150ms',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#FAFAFA' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                      <div className="flex items-start gap-2.5">
                        <AvatarCircle name={customerLabel(conv)} size={34} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[12px] truncate"
                              style={{ color: hasUnread ? '#111827' : '#374151', fontWeight: hasUnread ? 700 : 500 }}>
                              {customerLabel(conv)}
                            </span>
                            <span className="text-[10px] flex-shrink-0" style={{ color: '#9CA3AF' }}>
                              {formatTime(conv.last_message_at)}
                            </span>
                          </div>
                          {conv.product && (
                            <div className="flex items-center gap-1 mb-0.5">
                              <Package className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#C4C9D4' }} />
                              <span className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>
                                {conv.product.title}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[11px] truncate flex-1"
                              style={{ color: hasUnread ? '#374151' : '#9CA3AF', fontWeight: hasUnread ? 500 : 400 }}>
                              {conv.last_message || '—'}
                            </p>
                            {hasUnread && (
                              <span className="flex-shrink-0 min-w-[17px] h-[17px] px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                                style={{ background: '#D97706' }}>
                                {conv.seller_unread_count > 99 ? '99+' : conv.seller_unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Chat area ─────────────────────────────────────────────────── */}
          <div className="flex flex-col overflow-hidden rounded-xl"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            {selected ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 flex-shrink-0 px-5 py-3.5"
                  style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <AvatarCircle name={customerLabel(selected)} size={38} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate" style={{ color: '#111827' }}>
                      {customerLabel(selected)}
                    </p>
                    {selected.product ? (
                      <Link
                        href={`/products/${selected.product.id}`}
                        className="flex items-center gap-1 text-[11px] hover:underline"
                        style={{ color: '#D97706' }}
                      >
                        <Package className="w-2.5 h-2.5 flex-shrink-0" />
                        {selected.product.title}
                      </Link>
                    ) : (
                      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>Direktnachricht</p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4"
                  style={{
                    scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent',
                    backgroundImage: 'radial-gradient(circle at 1px 1px, #F3F4F6 1px, transparent 0)',
                    backgroundSize: '20px 20px',
                  }}>
                  {loadingMsgs ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#D97706' }} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: '#FEF3C7' }}>
                        <MessageCircle className="w-7 h-7" style={{ color: '#D97706' }} />
                      </div>
                      <p className="text-[13px] font-medium" style={{ color: '#6B7280' }}>Noch keine Nachrichten</p>
                      <p className="text-[11px] mt-1" style={{ color: '#9CA3AF' }}>
                        Beginne das Gespräch mit einer Antwort
                      </p>
                    </div>
                  ) : (
                    <MessageList messages={messages} />
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error banner */}
                {sendError && (
                  <div className="mx-4 mb-2 px-3 py-2 rounded-lg text-[12px] flex-shrink-0"
                    style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}>
                    {sendError}
                  </div>
                )}

                {/* Composer */}
                <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={e => { setNewMessage(e.target.value); setSendError(null) }}
                      onKeyDown={handleKeyDown}
                      placeholder="Nachricht eingeben… (Enter senden, Shift+Enter neue Zeile)"
                      disabled={sending}
                      rows={1}
                      className="flex-1 text-[13px] rounded-xl resize-none outline-none"
                      style={{
                        padding: '10px 14px',
                        border: '1px solid #E5E7EB',
                        background: '#F9FAFB',
                        color: '#111827',
                        minHeight: 42,
                        maxHeight: 120,
                        transition: 'border-color 150ms',
                        opacity: sending ? 0.6 : 1,
                        lineHeight: 1.5,
                      }}
                      onFocus={e => (e.target.style.borderColor = '#D97706')}
                      onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sending}
                      className="flex-shrink-0 flex items-center justify-center rounded-xl shadow-sm"
                      style={{
                        width: 42, height: 42,
                        background: newMessage.trim() && !sending ? '#D97706' : '#D97706',
                        opacity: !newMessage.trim() || sending ? 0.4 : 1,
                        cursor: !newMessage.trim() || sending ? 'not-allowed' : 'pointer',
                        transition: 'opacity 150ms, background 150ms',
                        border: 'none',
                        color: '#FFFFFF',
                      }}
                      aria-label="Nachricht senden"
                    >
                      {sending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: '#C4C9D4' }}>
                    Enter zum Senden · Shift+Enter für neue Zeile
                  </p>
                </div>
              </>
            ) : (
              /* Empty state — no conversation selected */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: '#FEF3C7' }}>
                  <MessageCircle className="w-8 h-8" style={{ color: '#D97706' }} />
                </div>
                <p className="text-[15px] font-semibold" style={{ color: '#374151' }}>Gespräch auswählen</p>
                <p className="text-[13px] mt-2 max-w-xs" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
                  {conversations.length > 0
                    ? 'Wähle links ein Gespräch, um zu antworten'
                    : 'Kundennachrichten erscheinen hier, sobald jemand schreibt'
                  }
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── MessageList ──────────────────────────────────────────────────────────────

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {messages.map((msg, i) => {
        const isSeller   = msg.sender_type === 'seller'
        const prevMsg    = messages[i - 1]
        const showDate   = !prevMsg || toDateKey(prevMsg.created_at) !== toDateKey(msg.created_at)
        const showSender = !prevMsg || prevMsg.sender_type !== msg.sender_type

        return (
          <div key={msg.id}>
            {/* Date separator */}
            {showDate && (
              <div className="flex items-center justify-center" style={{ margin: '16px 0 12px' }}>
                <span className="text-[11px] font-medium px-3 py-1 rounded-full"
                  style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                  {formatDateSeparator(msg.created_at)}
                </span>
              </div>
            )}

            {/* Group spacer */}
            {!showDate && showSender && <div style={{ height: 8 }} />}

            <div style={{ display: 'flex', justifyContent: isSeller ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '70%',
                  padding: '9px 14px',
                  fontSize: 13,
                  lineHeight: 1.55,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  borderRadius: isSeller ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isSeller ? '#D97706' : '#F3F4F6',
                  color: isSeller ? '#FFFFFF' : '#111827',
                  opacity: msg._optimistic ? 0.65 : 1,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
              >
                {msg.message}

                {/* Timestamp + read receipt */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3, marginTop: 4,
                  justifyContent: isSeller ? 'flex-end' : 'flex-start',
                }}>
                  <span style={{ fontSize: 10, opacity: isSeller ? 0.7 : 1, color: isSeller ? undefined : '#9CA3AF' }}>
                    {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isSeller && !msg._optimistic && (
                    msg.is_read
                      ? <CheckCheck style={{ width: 12, height: 12, opacity: 0.8 }} />
                      : <Check style={{ width: 12, height: 12, opacity: 0.5 }} />
                  )}
                  {msg._optimistic && (
                    <Loader2 style={{ width: 10, height: 10, opacity: 0.6 }} className="animate-spin" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
