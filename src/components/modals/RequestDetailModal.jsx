// src/components/modals/RequestDetailModal.jsx
import { useState } from 'react'
import { useOffers, acceptOffer, rejectOffer, submitOffer } from '../../hooks/useSupabase.js'

const PALETTES = ["linear-gradient(160deg,#0A1A14 0%,#059669 45%,#051A10 100%)", "linear-gradient(160deg,#0a1a30 0%,#1D4ED8 45%,#040c1a 100%)"]
const initials = n => n ? n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?'
const timeAgo = d => { if(!d) return ''; const s=Math.floor((Date.now()-new Date(d))/1000); if(s<60) return 'Now'; if(s<3600) return Math.floor(s/60)+'m'; if(s<86400) return Math.floor(s/3600)+'h'; return Math.floor(s/86400)+'d' }

export default function RequestDetailModal({ request, user, profile, onClose }) {
  const r = request
  const { offers, loading, reload } = useOffers(r?.id)
  const isOwner = user?.id === r?.customer_id

  const handleAccept = async (offerId) => {
    await acceptOffer(offerId, r.id)
    reload()
  }

  const handleReject = async (offerId) => {
    await rejectOffer(offerId)
    reload()
  }

  if (!r) return null

  return (
    <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(10,26,20,0.88)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '85%', background: '#0F2B1E', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', border: '1px solid rgba(52,211,153,0.1)', borderBottom: 'none' }}>
        <div style={{ padding: '16px 20px', flexShrink: 0 }}>
          <div className="sheet-handle" style={{ width: 32, height: 3, background: 'rgba(52,211,153,0.2)', borderRadius: 100, margin: '0 auto 12px' }} />
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6EE7B7', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', padding: '2px 8px', borderRadius: 6 }}>{r.category}</span>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontWeight: 600, color: '#ECFDF5', marginTop: 6 }}>{r.title}</div>
          {r.budget && <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 700, color: '#E8C87A', marginTop: 4 }}>GH₵ {Number(r.budget).toLocaleString()}</div>}
          {r.description && <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: 'rgba(236,253,245,0.5)', lineHeight: 1.7, marginTop: 8 }}>{r.description}</p>}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px', scrollbarWidth: 'none' }}>
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)', marginBottom: 10 }}>Offers ({offers.length})</div>

          {loading && <div className="vf-spinner-wrap"><div className="vf-spinner" /></div>}

          {!loading && offers.length === 0 && (
            <div className="vf-empty" style={{ padding: '20px 0' }}>
              <div className="vf-empty-icon">📭</div>
              <div className="vf-empty-title">No offers yet</div>
              <div className="vf-empty-sub">Creators will bid on this request</div>
            </div>
          )}

          {offers.map((o, i) => (
            <div key={o.id} style={{ padding: 14, marginBottom: 8, borderRadius: 14, background: 'rgba(10,26,20,0.5)', border: '1px solid rgba(52,211,153,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: o.creator?.avatar_url ? 'transparent' : PALETTES[i%2], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#34D399', overflow: 'hidden', border: '1.5px solid rgba(52,211,153,0.15)' }}>
                  {o.creator?.avatar_url ? <img src={o.creator.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} /> : initials(o.creator?.full_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 600, color: '#ECFDF5' }}>{o.creator?.full_name || o.creator?.username}</div>
                  <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, color: 'rgba(236,253,245,0.35)' }}>{o.creator?.role || 'creator'} · {timeAgo(o.created_at)}</div>
                </div>
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 700, color: '#E8C87A', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', padding: '4px 10px', borderRadius: 8 }}>GH₵ {Number(o.price).toLocaleString()}</div>
              </div>
              {o.message && <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.6)', lineHeight: 1.5, marginBottom: 8 }}>{o.message}</p>}
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: 'rgba(236,253,245,0.3)', marginBottom: 8 }}>Delivery: {o.delivery_days} days</div>

              {isOwner && o.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleAccept(o.id)} style={{ flex: 1, padding: 8, borderRadius: 100, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Accept</button>
                  <button onClick={() => handleReject(o.id)} style={{ padding: '8px 14px', borderRadius: 100, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                </div>
              )}
              {o.status === 'accepted' && (
                <div style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 100, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34D399', fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>✓ Accepted</div>
              )}
              {o.status === 'rejected' && (
                <div style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 100, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5', fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rejected</div>
              )}
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ padding: 14, borderTop: '1px solid rgba(52,211,153,0.08)', background: 'transparent', border: 'none', borderTopStyle: 'solid', color: 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>Close</button>
      </div>
    </div>
  )
}