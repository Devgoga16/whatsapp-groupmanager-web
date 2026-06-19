import { useState, useEffect, useMemo } from 'react'
import ChatView from '../components/ChatView'
import './PanelPage.css'

interface Group {
  _id: string
  groupId: string
  name: string
  participants: number
  isAdmin: boolean
  role: string
}

interface Props {
  onBack: () => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL

function getInitials(name: string) {
  const words = name.replace(/[^\w\s]/g, '').trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]
function colorFor(id: string) {
  let hash = 0
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function PanelPage({ onBack }: Props) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/groups`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: Group[]) => setGroups(data))
      .catch(() => setError('No se pudieron cargar los grupos'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return groups.filter(g => g.name.toLowerCase().includes(q))
  }, [groups, search])

  if (selectedGroup) {
    return (
      <ChatView
        group={selectedGroup}
        color={colorFor(selectedGroup._id)}
        initials={getInitials(selectedGroup.name)}
        onBack={() => setSelectedGroup(null)}
      />
    )
  }

  return (
    <div className="panel-page">
      <div className="panel-topbar">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
            <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
          </svg>
          Volver
        </button>
        <div className="topbar-info">
          <span className="panel-title">Mis Grupos</span>
          {!loading && !error && (
            <span className="group-count">{filtered.length} de {groups.length}</span>
          )}
        </div>
      </div>

      {!loading && !error && (
        <div className="search-bar-wrapper">
          <div className="search-bar">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar grupo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
              autoFocus
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
        </div>
      )}

      <div className="panel-body">
        {loading && (
          <div className="center-state">
            <div className="spinner" />
            <p>Cargando grupos...</p>
          </div>
        )}
        {error && <div className="center-state"><p className="error-text">{error}</p></div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="center-state">
            <p className="hint-text">No se encontraron grupos para "{search}"</p>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="groups-grid">
            {filtered.map(group => {
              const color = colorFor(group._id)
              const initials = getInitials(group.name)
              return (
                <div key={group._id} className="group-card" onClick={() => setSelectedGroup(group)}>
                  <div className="group-avatar" style={{ background: color }}>{initials}</div>
                  <div className="group-info">
                    <p className="group-name">{group.name}</p>
                    <div className="group-meta">
                      <span className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        {group.participants} participantes
                      </span>
                      {group.isAdmin && <span className="badge-admin">Admin</span>}
                    </div>
                  </div>
                  <div className="card-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
