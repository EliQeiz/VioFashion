// src/components/modals/CreatorProfileModal.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { getOrCreateConversation } from '../../hooks/useSupabase.js'

const PALETTES = [
  "linear-gradient(160deg,#0A1A14 0%,#059669 45%,#051A10 100%)",
  "linear-gradient(160deg,#0a1a30 0%,#1D4ED8 45%,#040c1a 100%)",
]
const initials = n => n ? n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?'
const fmt = n => { if(!n) return '0'; if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n) }
const ROLE_EMOJI = { tailor:'✂️', designer:'🎨', makeup_artist:'💄', shoemaker:'👟', customer:'🛍️' }

export default function CreatorProfileModal({ creatorId, currentUser, onClose, onStartChat }) {
  const [creator, setCreator] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)

  useEffect(() => {
    if (!creatorId) return
    const load = async () => {
      setLoading(true)
      const [{ data: p }, { data: v }] = await Promise.all([
        supabase.from('profiles').select('*, profile_services(service)').eq('id', creatorId).single(),
        supabase.from('videos').select('id, thumbnail_url, likes_count, views_count').eq('creator_id', creatorId).eq('is_published', true).order('created_at', { ascending: false }).limit(9),
      ])
      setCreator(p)
      setVideos(v || [])
      if (currentUser) {
        const { data: f } = await supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', creatorId).single()
        setIsFollowing(!!f)
      }
      setLoading(false)
    }
    load()
  }, [creatorId, currentUser])

  const toggleFollow = async () => {
    if (!currentUser || !creatorId) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', creatorId)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: creatorId })
      setIsFollowing(true)
    }
  }

  const startMessage = async () => {
    if (!currentUser || !creatorId || msgLoading) return
    setMsgLoading(true)
    try {
      const conv = await getOrCreateConversation(currentUser.id, creatorId)
      onStartChat?.(conv)
    } catch (e) { console.error(e) }
    setMsgLoading(false)
  }

  const c = creator

  return (
    <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(10,26,20,0.88)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '90%', background: '#0F2B1E', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', border: '1px solid rgba(52,211,153,0.1)', borderBottom: 'none', overflow: 'hidden' }}>
        <div className="sheet-handle" style={{ width: 32, height: 3, background: 'rgba(52,211,153,0.2)', borderRadius: 100, margin: '12px auto 0', flexShrink: 0 }} />

        {loading ? (
          <div className="vf-spinner-wrap"><div className="vf-spinner" /></div>
        ) : !c ? (
          <div className="vf-empty"><div className="vf-empty-title">Creator not found</div></div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', scrollbarWidth: 'none' }}>
            {/* Hero */}
            <div style={{ height: 120, background: PALETTES[0], position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0F2B1E 0%, transparent 60%)' }} />
            </div>

            {/* Avatar + info */}
            <div style={{ padding: '0 20px', marginTop: -32 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2.5px solid #34D399', overflow: 'hidden', background: c.avatar_url ? 'transparent' : PALETTES[1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#34D399', marginBottom: 10 }}>
                {c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(c.full_name || c.username)}
              </div>

              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 600, color: '#ECFDF5', marginBottom: 2 }}>
                {c.full_name || c.username}
                {c.is_verified && <span style={{ display: 'inline-flex', width: 16, height: 16, background: '#34D399', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#0A1A14', fontWeight: 800, marginLeft: 6, verticalAlign: 'middle' }}>✓</span>}
              </div>
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)', marginBottom: 8 }}>@{c.username}{c.location ? ` · ${c.location}` : ''}</div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#6EE7B7', padding: '3px 10px', borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                {ROLE_EMOJI[c.role] || '🛍️'} {(c.role || 'creator').replace('_', ' ')}
              </div>

              {c.bio && <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 300, lineHeight: 1.7, color: 'rgba(236,253,245,0.55)', marginBottom: 12 }}>{c.bio}</p>}

              {/* Stats */}
              <div style={{ display: 'flex', borderTop: '1px solid rgba(52,211,153,0.08)', borderBottom: '1px solid rgba(52,211,153,0.08)', padding: '12px 0', marginBottom: 14 }}>
                {[
                  [fmt(c.followers_count || 0), 'Followers'],
                  [fmt(c.following_count || 0), 'Following'],
                  [c.rating ? `${c.rating} ★` : '—', 'Rating'],
                ].map(([n, l], i) => (
                  <div key={l} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                    {i > 0 && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 1, background: 'rgba(52,211,153,0.08)' }} />}
                    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 600, color: '#ECFDF5' }}>{n}</div>
                    <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)' }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={toggleFollow}
                  style={{ flex: 1, padding: 11, borderRadius: 12, border: isFollowing ? '1px solid rgba(52,211,153,0.12)' : 'none', background: isFollowing ? 'rgba(236,253,245,0.04)' : 'linear-gradient(135deg,#059669,#047857)', color: isFollowing ? 'rgba(236,253,245,0.5)' : '#fff', fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: isFollowing ? 'none' : '0 4px 16px rgba(5,150,105,0.25)' }}>
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
                <button onClick={startMessage} disabled={msgLoading}
                  style={{ flex: 1, padding: 11, borderRadius: 12, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#E8C87A', fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: msgLoading ? 0.5 : 1 }}>
                  {msgLoading ? 'Opening…' : '💬 Message'}
                </button>
              </div>

              {/* Services */}
              {c.profile_services?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {c.profile_services.map(s => (
                    <span key={s.service} style={{ background: 'rgba(10,26,20,0.7)', border: '1px solid rgba(52,211,153,0.12)', color: '#6EE7B7', padding: '4px 12px', borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 11 }}>{s.service}</span>
                  ))}
                </div>
              )}

              {/* Portfolio grid */}
              {videos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, marginBottom: 20 }}>
                  {videos.map((v, i) => (
                    <div key={v.id} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', background: v.thumbnail_url ? `url(${v.thumbnail_url}) center/cover` : PALETTES[i % 2], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!v.thumbnail_url && <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontStyle: 'italic', color: 'rgba(236,253,245,0.15)' }}>#{i+1}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <button onClick={onClose} style={{ padding: 14, borderTop: '1px solid rgba(52,211,153,0.08)', background: 'transparent', border: 'none', borderTopStyle: 'solid', color: 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>Close</button>
      </div>
    </div>
  )
}