// src/components/notifications/NotificationsScreen.jsx
import { useNotifications } from '../../hooks/useSupabase.js'

const PALETTES = [
  "linear-gradient(160deg,#0A1A14 0%,#059669 45%,#051A10 100%)",
  "linear-gradient(160deg,#0a1a30 0%,#1D4ED8 45%,#040c1a 100%)",
]

const initials = n => n ? n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?'
const timeAgo = d => { if(!d) return ''; const s = Math.floor((Date.now()-new Date(d))/1000); if(s<60) return 'Just now'; if(s<3600) return Math.floor(s/60)+'m ago'; if(s<86400) return Math.floor(s/3600)+'h ago'; return Math.floor(s/86400)+'d ago' }

const ICON_MAP = { like: '❤️', follow: '👤', comment: '💬', offer: '💰' }
const TEXT_MAP = {
  like: (a, m) => <><strong>{a}</strong> liked {m || 'your post'}</>,
  follow: (a) => <><strong>{a}</strong> started following you</>,
  comment: (a, m) => <><strong>{a}</strong> commented: "{m}"</>,
  offer: (a, m, p) => <><strong>{a}</strong> made an offer on <em>{m}</em>{p ? ` — GH₵ ${Number(p).toLocaleString()}` : ''}</>,
}

export default function NotificationsScreen({ user }) {
  const { notifications, loading } = useNotifications(user?.id)
  const now = Date.now()
  const isRecent = d => new Date(d) > new Date(now - 24*60*60*1000)

  return (
    <div style={{ height: '100%', overflow: 'auto', scrollbarWidth: 'none', background: '#0A1A14' }}>
      <div className="notif-head" style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(52,211,153,0.08)' }}>
        <div className="notif-head-title" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontStyle: 'italic', fontWeight: 300, color: '#ECFDF5' }}>Activity</div>
      </div>

      {loading && <div className="vf-spinner-wrap"><div className="vf-spinner" /></div>}

      {!loading && notifications.length === 0 && (
        <div className="vf-empty" style={{ paddingTop: 60 }}>
          <div className="vf-empty-icon">🔔</div>
          <div className="vf-empty-title">No activity yet</div>
          <div className="vf-empty-sub">Likes, follows, comments and offers will appear here</div>
        </div>
      )}

      {notifications.map(n => (
        <div key={n.id} className={`notif-row ${isRecent(n.created_at) ? 'unread' : ''}`}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(52,211,153,0.04)', background: isRecent(n.created_at) ? 'rgba(52,211,153,0.04)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: n.actor?.avatar_url ? 'transparent' : PALETTES[0], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#34D399', overflow: 'hidden', border: '1.5px solid rgba(52,211,153,0.15)' }}>
              {n.actor?.avatar_url ? <img src={n.actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(n.actor?.full_name || n.actor?.username)}
            </div>
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#0A1A14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: '1.5px solid #0A1A14' }}>
              {ICON_MAP[n.type] || '🔔'}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="notif-text" style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: 'rgba(236,253,245,0.8)', lineHeight: 1.5 }}>
              {TEXT_MAP[n.type]?.(n.actor?.full_name || n.actor?.username, n.meta, n.price) || 'New notification'}
            </div>
            <div className="notif-meta" style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: 'rgba(236,253,245,0.3)', marginTop: 3 }}>
              {timeAgo(n.created_at)}
            </div>
          </div>
          {isRecent(n.created_at) && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', flexShrink: 0, marginTop: 8 }} />}
        </div>
      ))}
      <div style={{ height: 80 }} />
    </div>
  )
}