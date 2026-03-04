// src/components/live/LiveScreen.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { startLiveStream, endLiveStream } from '../../hooks/useSupabase.js'

const PALETTES = [
  "linear-gradient(160deg,#0A1A14 0%,#059669 45%,#051A10 100%)",
  "linear-gradient(160deg,#0a1a30 0%,#1D4ED8 45%,#040c1a 100%)",
  "linear-gradient(160deg,#0A1A14 0%,#047857 45%,#051A10 100%)",
  "linear-gradient(160deg,#0d1520 0%,#0E7490 45%,#061015 100%)",
]

const initials = n => n ? n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?'
const fmt = n => { if(!n) return '0'; if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n) }

const DEMO_STREAMS = [
  { id: 's1', title: 'Live Kente Weaving Session', creator: { id: 'x1', username: 'nana.weaves', full_name: 'Nana Afia', avatar_url: null }, viewer_count: 1247, category: 'Tailoring' },
  { id: 's2', title: 'Custom Shoe Design Process', creator: { id: 'x2', username: 'kofi.shoes', full_name: 'Kofi Mensah', avatar_url: null }, viewer_count: 834, category: 'Shoemaking' },
]

const DEMO_TICKER = [
  { user: 'ama_style', text: 'This is incredible craftsmanship! 🔥' },
  { user: 'kwesi_d', text: 'How long did it take to learn this?' },
  { user: 'fashion_gh', text: 'Can you do a custom order for me?' },
  { user: 'nana_k', text: 'The attention to detail 👏👏' },
  { user: 'accra_drip', text: 'This is why Ghana fashion leads Africa' },
]

export default function LiveScreen({ user, profile }) {
  const [streams, setStreams] = useState([])
  const [viewing, setViewing] = useState(null)
  const [goLive, setGoLive] = useState(false)
  const [liveForm, setLiveForm] = useState({ title: '', category: 'Tailoring' })
  const [myStream, setMyStream] = useState(null)
  const [ticker, setTicker] = useState(DEMO_TICKER)
  const [chatMsg, setChatMsg] = useState('')
  const tickerRef = useRef()

  useEffect(() => {
    supabase.from('livestreams')
      .select('*, creator:profiles(id, username, full_name, avatar_url, role)')
      .eq('is_active', true).order('viewer_count', { ascending: false })
      .then(({ data }) => { if (data?.length) setStreams(data); else setStreams(DEMO_STREAMS) })
  }, [])

  const handleGoLive = async () => {
    if (!liveForm.title || !user) return
    try {
      const stream = await startLiveStream({ creatorId: user.id, title: liveForm.title, category: liveForm.category })
      setMyStream(stream)
      setGoLive(false)
    } catch (e) { console.error(e) }
  }

  const handleEndStream = async () => {
    if (myStream) { await endLiveStream(myStream.id); setMyStream(null) }
  }

  const sendChat = () => {
    if (!chatMsg.trim()) return
    setTicker(p => [...p, { user: profile?.username || 'you', text: chatMsg }])
    setChatMsg('')
    setTimeout(() => tickerRef.current?.scrollTo({ top: tickerRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }

  const display = viewing || streams[0] || DEMO_STREAMS[0]

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Main stream view */}
      <div style={{ position: 'absolute', inset: 0, background: PALETTES[0] }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.08 }}>
          <span style={{ fontFamily: "var(--ff-impact)", fontSize: 140, color: '#fff' }}>LIVE</span>
        </div>
      </div>
      <div className="live-cinema" style={{ position: 'absolute', inset: 0 }} />

      {/* Live badge */}
      <div className="live-viewer-badge" style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'rgba(10,26,20,0.7)', border: '1px solid rgba(52,211,153,0.1)', backdropFilter: 'blur(10px)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 700, color: '#ECFDF5', letterSpacing: '0.05em' }}>LIVE</span>
        <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: 'rgba(236,253,245,0.5)' }}>{fmt(display?.viewer_count)} watching</span>
      </div>

      {/* Stream info */}
      <div style={{ position: 'absolute', top: '30%', left: 20, right: 20, zIndex: 5, textAlign: 'center' }}>
        <div className="live-center-eyebrow" style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#34D399', marginBottom: 8 }}>
          NOW STREAMING
        </div>
        <div className="live-center-name" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontStyle: 'italic', fontWeight: 300, color: '#ECFDF5', marginBottom: 6 }}>
          {display?.title || 'Live Stream'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: PALETTES[1], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#34D399', border: '1.5px solid #34D399' }}>
            {display?.creator?.avatar_url ? <img src={display.creator.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials(display?.creator?.full_name)}
          </div>
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.6)' }}>@{display?.creator?.username}</span>
        </div>
      </div>

      {/* Ticker */}
      <div ref={tickerRef} className="live-ticker" style={{ position: 'absolute', bottom: 80, left: 12, right: 12, maxHeight: 180, overflow: 'auto', zIndex: 10, borderRadius: 12, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(10,26,20,0.35)', scrollbarWidth: 'none' }}>
        {ticker.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, fontSize: 12 }}>
            <span className="ticker-user" style={{ fontWeight: 600, color: '#6EE7B7', flexShrink: 0 }}>@{t.user}</span>
            <span className="ticker-text" style={{ color: 'rgba(236,253,245,0.75)' }}>{t.text}</span>
          </div>
        ))}
      </div>

      {/* Chat input */}
      <div style={{ position: 'absolute', bottom: 16, left: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
        <input className="live-inp" value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Say something…"
          style={{ flex: 1, height: 40, borderRadius: 100, padding: '0 16px', border: '1px solid rgba(52,211,153,0.1)', background: 'rgba(10,26,20,0.7)', color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 13, outline: 'none' }} />
        <button className="live-send" onClick={sendChat}
          style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#059669,#047857)', border: 'none', cursor: 'pointer', color: '#fff' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z"/></svg>
        </button>
      </div>

      {/* Stream list overlay */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Go Live button */}
        <button onClick={() => myStream ? handleEndStream() : setGoLive(true)}
          style={{ padding: '6px 14px', borderRadius: 100, border: myStream ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(52,211,153,0.2)', background: myStream ? 'rgba(248,113,113,0.08)' : 'rgba(10,26,20,0.7)', color: myStream ? '#F87171' : '#34D399', fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
          {myStream ? '■ End Stream' : '● Go Live'}
        </button>
      </div>

      {/* Other streams list — bottom left */}
      <div style={{ position: 'absolute', bottom: 100, right: 12, zIndex: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {streams.slice(0, 4).map((s, i) => (
          <div key={s.id} onClick={() => setViewing(s)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 10, background: viewing?.id === s.id ? 'rgba(52,211,153,0.08)' : 'rgba(10,26,20,0.5)', border: `1px solid ${viewing?.id === s.id ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.06)'}`, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: PALETTES[i % PALETTES.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#34D399' }}>
              {initials(s.creator?.full_name)}
            </div>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, color: '#ECFDF5', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.creator?.full_name}</span>
          </div>
        ))}
      </div>

      {/* Go Live Modal */}
      {goLive && (
        <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(10,26,20,0.88)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && setGoLive(false)}>
          <div className="modal-sheet" style={{ width: '100%', background: '#0F2B1E', borderRadius: '24px 24px 0 0', padding: '20px', maxHeight: '70%' }}>
            <div className="sheet-handle" style={{ width: 32, height: 3, background: 'rgba(52,211,153,0.2)', borderRadius: 100, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontStyle: 'italic', color: '#ECFDF5', marginBottom: 4 }}>Go Live</div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)', marginBottom: 20 }}>Stream your creative process to the world</div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)', marginBottom: 6 }}>Stream Title</div>
            <input value={liveForm.title} onChange={e => setLiveForm(p => ({ ...p, title: e.target.value }))} placeholder="What are you creating today?"
              style={{ width: '100%', padding: '11px 16px', borderRadius: 12, border: '1px solid rgba(52,211,153,0.1)', background: 'rgba(10,26,20,0.6)', color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)', marginBottom: 6 }}>Category</div>
            <select value={liveForm.category} onChange={e => setLiveForm(p => ({ ...p, category: e.target.value }))}
              style={{ width: '100%', padding: '11px 16px', borderRadius: 12, border: '1px solid rgba(52,211,153,0.1)', background: 'rgba(10,26,20,0.6)', color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 13, outline: 'none', marginBottom: 20, boxSizing: 'border-box' }}>
              {['Tailoring', 'Shoemaking', 'Makeup', 'Design', 'Styling'].map(c => <option key={c} value={c} style={{ background: '#0F2B1E' }}>{c}</option>)}
            </select>
            <button onClick={handleGoLive} style={{ width: '100%', padding: 13, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}>
              ● Start Streaming
            </button>
            <button onClick={() => setGoLive(false)} style={{ width: '100%', padding: 11, marginTop: 8, borderRadius: 12, border: '1px solid rgba(52,211,153,0.1)', background: 'transparent', color: 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}