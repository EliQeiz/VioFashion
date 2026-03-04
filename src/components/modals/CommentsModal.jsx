// src/components/modals/CommentsModal.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

const PALETTES = [
  "linear-gradient(160deg,#0A1A14 0%,#059669 45%,#051A10 100%)",
  "linear-gradient(160deg,#0a1a30 0%,#1D4ED8 45%,#040c1a 100%)",
]
const initials = n => n ? n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?'
const timeAgo = d => { if(!d) return ''; const s=Math.floor((Date.now()-new Date(d))/1000); if(s<60) return 'Now'; if(s<3600) return Math.floor(s/60)+'m'; if(s<86400) return Math.floor(s/3600)+'h'; return Math.floor(s/86400)+'d' }

export default function CommentsModal({ video, user, onClose }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef()

  useEffect(() => {
    if (!video) return
    supabase.from('video_comments')
      .select('*, author:profiles!video_comments_author_id_fkey(id, username, full_name, avatar_url)')
      .eq('video_id', video.id).order('created_at', { ascending: true })
      .then(({ data }) => { setComments(data || []); setTimeout(() => endRef.current?.scrollIntoView(), 100) })
  }, [video])

  const send = async () => {
    if (!text.trim() || !user || sending) return
    setSending(true)
    const { data, error } = await supabase.from('video_comments')
      .insert({ video_id: video.id, author_id: user.id, content: text })
      .select('*, author:profiles!video_comments_author_id_fkey(id, username, full_name, avatar_url)')
      .single()
    if (!error && data) {
      setComments(p => [...p, data])
      setText('')
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
    setSending(false)
  }

  return (
    <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(10,26,20,0.88)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '65%', background: '#0F2B1E', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', border: '1px solid rgba(52,211,153,0.1)', borderBottom: 'none' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(52,211,153,0.08)', flexShrink: 0 }}>
          <div className="sheet-handle" style={{ width: 32, height: 3, background: 'rgba(52,211,153,0.2)', borderRadius: 100, margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontStyle: 'italic', color: '#ECFDF5' }}>Comments</span>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: 'rgba(236,253,245,0.35)' }}>{comments.length}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
          {comments.length === 0 && (
            <div className="vf-empty" style={{ padding: '30px 20px' }}>
              <div className="vf-empty-icon">💬</div>
              <div className="vf-empty-title">No comments yet</div>
              <div className="vf-empty-sub">Be the first to share your thoughts</div>
            </div>
          )}
          {comments.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', gap: 10, padding: '10px 20px' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.author?.avatar_url ? 'transparent' : PALETTES[i % 2], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#34D399', flexShrink: 0, overflow: 'hidden' }}>
                {c.author?.avatar_url ? <img src={c.author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(c.author?.full_name || c.author?.username)}
              </div>
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span className="comment-name" style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 600, color: '#ECFDF5' }}>{c.author?.full_name || c.author?.username}</span>
                  <span className="comment-time" style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, color: 'rgba(236,253,245,0.3)' }}>{timeAgo(c.created_at)}</span>
                </div>
                <div className="comment-text" style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: 'rgba(236,253,245,0.8)', lineHeight: 1.5, marginTop: 2 }}>{c.content}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="comment-inp-bar" style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid rgba(52,211,153,0.08)', background: 'rgba(10,26,20,0.8)', flexShrink: 0 }}>
          <input className="comment-inp" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Add a comment…"
            style={{ flex: 1, height: 38, borderRadius: 100, padding: '0 16px', border: '1px solid rgba(52,211,153,0.1)', background: 'rgba(10,26,20,0.7)', color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 13, outline: 'none' }} />
          <button className="comment-send" onClick={send} disabled={sending}
            style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', cursor: 'pointer', color: '#fff', opacity: sending ? 0.5 : 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}