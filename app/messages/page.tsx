'use client'

/**
 * /messages — Customer messaging inbox
 *
 * Uses the conversations + conversation_messages tables (same as seller inbox).
 * Auth: NextAuth session.
 *
 * URL params:
 *   ?sellerId=UUID       — auto-open/create conversation with seller
 *   ?productId=UUID      — product context for the conversation
 *   ?conversationId=UUID — open specific conversation directly
 *
 * Features:
 * - Conversation list: seller avatar, shop name, unread badge, last message
 * - Message bubbles with date separators + read receipts
 * - Optimistic message send
 * - 5s message poll, 30s conversation poll (page-visibility-aware)
 * - Auto-resizing textarea (Enter = send, Shift+Enter = newline)
 * - Mobile: back button toggles list ↔ chat
 * - No client-side Supabase calls
 */

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  MessageCircle, Loader2, Send, Search, ArrowLeft,
  Package, Check, CheckCheck, ShoppingBag,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerConversation {
  id: string
  product_id: string | null
  last_message: string
  last_message_at: string
  customer_unread_count: number
  seller: {
    id: string
    shop_name: string | null
    logo_url: string | null
    user_id: string
  } | null
  product: {
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

function formatTime(iso: string): string {
  const d    = new Date(iso)
  const now  = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3_600_000
  if (diffH < 24)  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  if (diffH < 168) return d.toLocaleDateString('de-DE', { weekday: 'short' })
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}

function formatDateSep(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Heute'
  if (diffDays === 1) return 'Gestern'
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function dateKey(iso: string): string { return iso.slice(0, 10) }

function sellerLabel(conv: CustomerConversation): string {
  return conv.seller?.shop_name || 'Verkäufer'
}

function SellerAvatar({ conv, size = 38 }: { conv: CustomerConversation; size?: number }) {
  const label   = sellerLabel(conv)
  const initial = label.charAt(0).toUpperCase()
  const logoUrl = conv.seller?.logo_url

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={label}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FFF', fontWeight: 700, fontSize: Math.round(size * 0.38),
      }}
    >
      {initial}
    </div>
  )
}

// ─── Inner Page ───────────────────────────────────────────────────────────────

function CustomerMessagesInner() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  const paramSellerId      = searchParams.get('sellerId')
  const paramProductId     = searchParams.get('productId')
  const paramConversationId = searchParams.get('conversationId')

  const userId = session?.user?.id

  // ── State ──────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<CustomerConversation[]>([])
  const [selected,      setSelected]      = useState<CustomerConversation | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [newMessage,    setNewMessage]    = useState('')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [sending,       setSending]       = useState(false)
  const [sendError,     setSendError]     = useState<string | null>(null)
  const [hasNewMsg,     setHasNewMsg]     = useState(false)
  const [showMobileList,setShowMobileList]= useState(true)
  const [initDone,      setInitDone]      = useState(false)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const convPollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const msgPollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const selectedIdRef  = useRef<string | null>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { selectedIdRef.current = selected?.id ?? null }, [selected])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [newMessage])

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async (silent = false) => {
    try {
      const res  = await fetch('/api/conversations?type=customer')
      const data = await res.json()
      if (res.ok) {
        setConversations(data.conversations ?? [])
        if (selectedIdRef.current) {
          setSelected(prev =>
            prev
              ? (data.conversations ?? []).find((c: CustomerConversation) => c.id === prev.id) ?? prev
              : prev,
          )
        }
      }
    } catch (e) {
      console.error('[messages] loadConversations:', e)
    } finally {
      if (!silent) setLoadingConvs(false)
    }
  }, [])

  useEffect(() => {
    if (userId) loadConversations()
  }, [userId, loadConversations])

  // ── Handle URL params (auto-open conversation) ─────────────────────────────
  useEffect(() => {
    if (!userId || loadingConvs || initDone) return
    setInitDone(true)

    async function init() {
      // Open specific conversation by ID
      if (paramConversationId) {
        const conv = conversations.find(c => c.id === paramConversationId)
        if (conv) { handleSelect(conv); return }
        // Not in list yet — reload and try again
        return
      }

      // Create/get conversation with a seller
      if (paramSellerId) {
        try {
          const res = await fetch('/api/conversations', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ sellerId: paramSellerId, productId: paramProductId ?? undefined }),
          })
          if (res.ok) {
            const { conversation } = await res.json()
            await loadConversations()
            if (conversation?.id) {
              setSelected(conversation)
              setShowMobileList(false)
            }
          }
        } catch (e) {
          console.error('[messages] init conversation:', e)
        }
      }
    }

    init()
  }, [userId, loadingConvs, initDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true)
    try {
      const res  = await fetch(`/api/conversations/${convId}/messages`)
      const data = await res.json()
      if (res.ok) {
        const incoming: Message[] = data.messages ?? []
        setMessages(prev => {
          const optimistic = silent ? prev.filter(m => m._optimistic) : []
          const realPrev   = prev.filter(m => !m._optimistic)
          if (silent && incoming.length > realPrev.length) setHasNewMsg(true)
          return [...incoming, ...optimistic]
        })
        setConversations(cs =>
          cs.map(c => c.id === convId ? { ...c, customer_unread_count: 0 } : c),
        )
        // Update nav-header message badge immediately
        window.dispatchEvent(new Event('messages-read'))
      }
    } catch (e) {
      console.error('[messages] loadMessages:', e)
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
  const handleSelect = useCallback((conv: CustomerConversation) => {
    setSelected(conv)
    setMessages([])
    setSendError(null)
    setShowMobileList(false)
    setConversations(cs =>
      cs.map(c => c.id === conv.id ? { ...c, customer_unread_count: 0 } : c),
    )
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = newMessage.trim()
    if (!text || !selected || sending) return

    setSending(true)
    setSendError(null)

    const opt: Message = {
      id:          `opt-${Date.now()}`,
      sender_type: 'customer',
      message:     text,
      created_at:  new Date().toISOString(),
      is_read:     false,
      _optimistic: true,
    }
    setMessages(prev => [...prev, opt])
    setNewMessage('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

    try {
      const res = await fetch(`/api/conversations/${selected.id}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text }),
      })
      if (res.ok) {
        await loadMessages(selected.id, true)
        setConversations(cs =>
          cs.map(c => c.id === selected.id ? { ...c, last_message: text, last_message_at: new Date().toISOString() } : c),
        )
      } else {
        setMessages(prev => prev.filter(m => m.id !== opt.id))
        setNewMessage(text)
        setSendError('Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.')
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== opt.id))
      setNewMessage(text)
      setSendError('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setSending(false)
    }
  }, [newMessage, selected, sending, loadMessages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Filtered ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter(c =>
      sellerLabel(c).toLowerCase().includes(q) ||
      c.last_message.toLowerCase().includes(q) ||
      (c.product?.title ?? '').toLowerCase().includes(q),
    )
  }, [conversations, searchQuery])

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.customer_unread_count || 0), 0),
    [conversations],
  )

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 36, height: 36, color: 'var(--primary)' }} className="animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div className="text-center" style={{ maxWidth: 360 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary-foreground, #EEF2FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <MessageCircle style={{ width: 32, height: 32, color: 'var(--primary)' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Anmeldung erforderlich</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Bitte melde dich an, um Nachrichten zu lesen und zu senden.
          </p>
          <Link
            href="/auth/signin"
            style={{
              display: 'inline-block', padding: '12px 28px',
              background: 'var(--primary)', color: 'var(--primary-foreground)',
              borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}
          >
            Jetzt anmelden
          </Link>
        </div>
      </div>
    )
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2"
            style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span className="hidden sm:inline">Zurück</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <MessageCircle style={{ width: 22, height: 22, color: 'var(--primary)' }} />
              {totalUnread > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  minWidth: 16, height: 16, borderRadius: 10,
                  background: '#EF4444', color: '#FFF', fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
                }}>
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Nachrichten</h1>
          </div>
        </div>

        {/* Main panel */}
        <div
          className="glass border border-border rounded-2xl overflow-hidden"
          style={{ height: 'calc(100vh - 160px)', minHeight: 520, display: 'grid', gridTemplateColumns: showMobileList || !selected ? undefined : '1fr' }}
        >
          <div style={{ display: 'grid', height: '100%', gridTemplateColumns: 'clamp(240px, 30%, 300px) 1fr' }}
            className="max-lg:block">

            {/* ── Conversation list ──────────────────────────────────────── */}
            <div
              className={`flex flex-col h-full border-r border-border ${!showMobileList && selected ? 'hidden lg:flex' : 'flex'}`}
            >
              {/* Search */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted-foreground)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Gespräch suchen…"
                    className="w-full glass border border-border rounded-xl outline-none focus:border-primary"
                    style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 13, transition: 'border-color 150ms' }}
                  />
                </div>
              </div>

              {/* Conversations */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loadingConvs ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                    <Loader2 style={{ width: 28, height: 28 }} className="animate-spin text-primary" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                    <MessageCircle style={{ width: 40, height: 40, margin: '0 auto 12px' }} className="text-muted-foreground" />
                    <p style={{ fontSize: 13, marginBottom: 4 }} className="text-muted-foreground">
                      {searchQuery ? 'Kein Gespräch gefunden' : 'Noch keine Nachrichten'}
                    </p>
                    {paramSellerId && !searchQuery && (
                      <p style={{ fontSize: 12 }} className="text-muted-foreground">Gespräch wird vorbereitet…</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filtered.map(conv => {
                      const isActive  = selected?.id === conv.id
                      const hasUnread = conv.customer_unread_count > 0
                      return (
                        <button
                          key={conv.id}
                          onClick={() => handleSelect(conv)}
                          className={`w-full text-left p-4 transition-colors hover:bg-primary/5 ${isActive ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                          style={{ display: 'block' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <SellerAvatar conv={conv} size={42} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: hasUnread ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {sellerLabel(conv)}
                                </span>
                                <span style={{ fontSize: 11, flexShrink: 0, marginLeft: 6 }} className="text-muted-foreground">
                                  {formatTime(conv.last_message_at)}
                                </span>
                              </div>
                              {conv.product && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                  <Package style={{ width: 10, height: 10, flexShrink: 0 }} className="text-muted-foreground" />
                                  <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="text-muted-foreground">
                                    {conv.product.title}
                                  </span>
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <p style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: hasUnread ? 500 : 400 }}
                                  className="text-muted-foreground">
                                  {conv.last_message || '—'}
                                </p>
                                {hasUnread && (
                                  <span style={{
                                    flexShrink: 0, minWidth: 18, height: 18, borderRadius: 10, padding: '0 5px',
                                    background: 'var(--primary)', color: 'var(--primary-foreground)',
                                    fontSize: 10, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}>
                                    {conv.customer_unread_count > 99 ? '99+' : conv.customer_unread_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Chat area ──────────────────────────────────────────────── */}
            <div
              className={`flex flex-col h-full ${showMobileList && !selected ? 'hidden lg:flex' : 'flex'}`}
            >
              {selected ? (
                <>
                  {/* Chat header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <button
                      onClick={() => setShowMobileList(true)}
                      className="lg:hidden"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                    >
                      <ArrowLeft style={{ width: 18, height: 18 }} />
                    </button>
                    <SellerAvatar conv={selected} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sellerLabel(selected)}
                      </p>
                      {selected.product ? (
                        <Link
                          href={`/products/${selected.product.id}`}
                          style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                        >
                          <Package style={{ width: 10, height: 10 }} />
                          {selected.product.title}
                        </Link>
                      ) : (
                        <Link
                          href={`/shop/${selected.seller?.id}`}
                          style={{ fontSize: 11, color: 'var(--muted-foreground)', textDecoration: 'none' }}
                        >
                          Shop ansehen
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    {loadingMsgs ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                        <Loader2 style={{ width: 24, height: 24 }} className="animate-spin text-primary" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(var(--primary-rgb),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
                          className="bg-primary/10">
                          <MessageCircle style={{ width: 28, height: 28 }} className="text-primary" />
                        </div>
                        <p style={{ fontSize: 14 }} className="text-muted-foreground">Noch keine Nachrichten</p>
                        <p style={{ fontSize: 12, marginTop: 6 }} className="text-muted-foreground">Schreibe dem Verkäufer eine Nachricht</p>
                      </div>
                    ) : (
                      <CustomerMessageList messages={messages} userId={userId ?? ''} />
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Error */}
                  {sendError && (
                    <div style={{ margin: '0 16px 8px', padding: '8px 14px', borderRadius: 8, fontSize: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', flexShrink: 0 }}>
                      {sendError}
                    </div>
                  )}

                  {/* Composer */}
                  <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <textarea
                          ref={textareaRef}
                          value={newMessage}
                          onChange={e => { setNewMessage(e.target.value); setSendError(null) }}
                          onKeyDown={handleKeyDown}
                          placeholder="Nachricht schreiben… (Enter senden)"
                          disabled={sending}
                          rows={1}
                          className="glass border border-border rounded-xl outline-none focus:border-primary w-full resize-none"
                          style={{
                            padding: '10px 14px', fontSize: 14,
                            minHeight: 44, maxHeight: 120, lineHeight: 1.5,
                            opacity: sending ? 0.6 : 1,
                            transition: 'border-color 150ms',
                          }}
                        />
                      </div>
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="p-3 rounded-xl font-semibold transition-all flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ minWidth: 44, minHeight: 44 }}
                      >
                        {sending
                          ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                          : <Send style={{ width: 18, height: 18 }} />
                        }
                      </button>
                    </div>
                    <p style={{ fontSize: 11, marginTop: 6 }} className="text-muted-foreground">
                      Enter senden · Shift+Enter neue Zeile
                    </p>
                  </div>
                </>
              ) : (
                /* No conversation selected */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
                    className="bg-primary/10">
                    <MessageCircle style={{ width: 32, height: 32 }} className="text-primary" />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Deine Nachrichten</h3>
                  <p style={{ fontSize: 14, maxWidth: 280, lineHeight: 1.6 }} className="text-muted-foreground">
                    {loadingConvs
                      ? 'Gespräche werden geladen…'
                      : conversations.length > 0
                        ? 'Wähle ein Gespräch aus der Liste'
                        : 'Starte ein Gespräch, indem du auf einer Produktseite den Verkäufer kontaktierst.'
                    }
                  </p>
                  {conversations.length === 0 && !loadingConvs && (
                    <Link
                      href="/store"
                      style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                      className="bg-primary text-primary-foreground"
                    >
                      <ShoppingBag style={{ width: 16, height: 16 }} />
                      Produkte entdecken
                    </Link>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MessageList ──────────────────────────────────────────────────────────────

function CustomerMessageList({ messages, userId }: { messages: Message[]; userId: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {messages.map((msg, i) => {
        const isOwn    = msg.sender_type === 'customer'
        const prevMsg  = messages[i - 1]
        const showDate = !prevMsg || dateKey(prevMsg.created_at) !== dateKey(msg.created_at)
        const showGap  = !showDate && prevMsg && prevMsg.sender_type !== msg.sender_type

        return (
          <div key={msg.id}>
            {showDate && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 12px' }}>
                <span className="glass text-muted-foreground" style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20 }}>
                  {formatDateSep(msg.created_at)}
                </span>
              </div>
            )}
            {showGap && <div style={{ height: 8 }} />}

            <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '72%',
                  padding: '9px 14px',
                  fontSize: 14,
                  lineHeight: 1.55,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  opacity: msg._optimistic ? 0.65 : 1,
                  ...(isOwn
                    ? { background: 'linear-gradient(135deg, var(--primary) 0%, oklch(from var(--primary) l c calc(h + 20)) 100%)', color: 'var(--primary-foreground)' }
                    : { background: 'rgba(var(--muted-rgb, 241 245 249), 1)', border: '1px solid var(--border)', color: 'var(--foreground)' }
                  ),
                }}
                className={isOwn ? '' : 'glass'}
              >
                {msg.message}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isOwn && !msg._optimistic && (
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

// ─── Export ───────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 36, height: 36 }} className="animate-spin text-primary" />
      </div>
    }>
      <CustomerMessagesInner />
    </Suspense>
  )
}
