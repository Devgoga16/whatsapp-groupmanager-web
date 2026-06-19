import { useState, useEffect, useRef, useCallback } from 'react'
import './ChatView.css'

interface Group {
  _id: string
  groupId: string
  name: string
  participants: number
}

interface Message {
  _id: string
  messageId: string
  fromMe: boolean
  sender: string
  senderName: string
  text: string
  timestamp: string
}

interface MessagesResponse {
  groupId: string
  total: number
  page: number
  limit: number
  pages: number
  messages: Message[]
}

interface Props {
  group: Group
  color: string
  initials: string
  onBack: () => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL
const LIMIT = 30

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByDate(messages: Message[]) {
  const groups: { label: string; items: Message[] }[] = []
  let lastLabel = ''
  for (const msg of messages) {
    const label = formatDateLabel(msg.timestamp)
    if (label !== lastLabel) {
      groups.push({ label, items: [] })
      lastLabel = label
    }
    groups[groups.length - 1].items.push(msg)
  }
  return groups
}

const SENDER_COLORS = [
  '#60a5fa', '#f472b6', '#34d399', '#fb923c',
  '#a78bfa', '#38bdf8', '#f87171', '#4ade80',
]
function senderColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return SENDER_COLORS[Math.abs(h) % SENDER_COLORS.length]
}

export default function ChatView({ group, color, initials, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const didInitialScroll = useRef(false)

  const fetchMessages = useCallback(async (p: number, prepend: boolean) => {
    const encodedId = encodeURIComponent(group.groupId)
    const res = await fetch(`${API_BASE}/messages/${encodedId}?limit=${LIMIT}&page=${p}`)
    if (!res.ok) throw new Error()
    const data: MessagesResponse = await res.json()

    // API returns newest-first; reverse to get chronological order
    const ordered = [...data.messages].reverse()

    setTotalPages(data.pages)
    setTotal(data.total)

    if (prepend) {
      const prevHeight = scrollRef.current?.scrollHeight ?? 0
      setMessages(prev => [...ordered, ...prev])
      // Restore scroll position after prepend
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight
        }
      })
    } else {
      setMessages(ordered)
    }
  }, [group.groupId])

  useEffect(() => {
    setLoading(true)
    didInitialScroll.current = false
    fetchMessages(1, false)
      .catch(() => setError('No se pudieron cargar los mensajes'))
      .finally(() => setLoading(false))
  }, [fetchMessages])

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!loading && !didInitialScroll.current && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      didInitialScroll.current = true
    }
  }, [loading, messages])

  const loadMore = async () => {
    if (loadingMore || page >= totalPages) return
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      await fetchMessages(nextPage, true)
      setPage(nextPage)
    } catch {
      // silently ignore
    } finally {
      setLoadingMore(false)
    }
  }

  const grouped = groupByDate(messages)

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
            <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
          </svg>
        </button>
        <div className="chat-avatar" style={{ background: color }}>{initials}</div>
        <div className="chat-header-info">
          <p className="chat-group-name">{group.name}</p>
          <p className="chat-group-sub">{group.participants} participantes{total > 0 ? ` · ${total} mensajes` : ''}</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="chat-messages" ref={scrollRef}>
        {loading && (
          <div className="chat-center">
            <div className="spinner" />
          </div>
        )}

        {error && (
          <div className="chat-center">
            <p className="error-text">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Load more */}
            {page < totalPages && (
              <div className="load-more-wrapper">
                <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore
                    ? <><div className="spinner-sm" /> Cargando...</>
                    : `Cargar mensajes anteriores`}
                </button>
              </div>
            )}

            {messages.length === 0 && (
              <div className="chat-center">
                <p className="hint-text">No hay mensajes registrados</p>
              </div>
            )}

            {grouped.map(({ label, items }) => (
              <div key={label}>
                <div className="date-separator">
                  <span>{label}</span>
                </div>
                {items.map((msg, i) => {
                  const prevMsg = i > 0 ? items[i - 1] : null
                  const showSender = !msg.fromMe && msg.senderName !== prevMsg?.senderName
                  return (
                    <div
                      key={msg._id}
                      className={`message-row ${msg.fromMe ? 'from-me' : 'from-them'}`}
                    >
                      <div className="bubble">
                        {showSender && (
                          <p className="bubble-sender" style={{ color: senderColor(msg.senderName) }}>
                            {msg.senderName}
                          </p>
                        )}
                        <p className="bubble-text">{msg.text}</p>
                        <span className="bubble-time">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  )
}
