// src/components/search/SearchScreen.jsx
import { useState } from 'react'
import { useSearch } from '../../hooks/useSupabase.js'

const PALETTES = [
  "linear-gradient(160deg,#0A1A14 0%,#059669 45%,#051A10 100%)",
  "linear-gradient(160deg,#0a1a30 0%,#1D4ED8 45%,#040c1a 100%)",
  "linear-gradient(160deg,#0A1A14 0%,#047857 45%,#051A10 100%)",
]

const initials = n => n ? n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?'
const fmt = n => { if(!n) return '0'; if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n) }

export default function SearchScreen({ user }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const { results, loading } = useSearch(query, type)

  return (
    <div style={{ height: '100%', overflow: 'auto', scrollbarWidth: 'none', background: '#0A1A14' }}>
      <div style={{ padding: '20px 20px 12px' }}>
        <div className="search-head-title" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 26, fontStyle: 'italic', fontWeight: 300, color: '#ECFDF5', marginBottom: 16 }}>Search</div>
        <div className="search-inp-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 14, background: 'rgba(10,26,20,0.7)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(236,253,245,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0"/></svg>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search creators, requests…" autoFocus
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 14, caretColor: '#34D399' }} />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'rgba(236,253,245,0.3)', cursor: 'pointer', fontSize: 16 }}>×</button>}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {['all', 'creators', 'requests'].map(t => (
            <button key={t} className={`search-type-tab ${type === t ? 'on' : ''}`} onClick={() => setType(t)}
              style={{ padding: '5px 14px', borderRadius: 100, border: `1px solid ${type === t ? '#34D399' : 'rgba(52,211,153,0.1)'}`, background: type === t ? 'rgba(52,211,153,0.06)' : 'transparent', color: type === t ? '#34D399' : 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {t === 'all' ? 'All' : t === 'creators' ? 'Creators' : 'Requests'}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="vf-spinner-wrap"><div className="vf-spinner" /></div>}

      {!loading && !query && (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 42, opacity: 0.2, marginBottom: 12 }}>🔍</div>
          <div className="search-empty-text" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontStyle: 'italic', color: 'rgba(236,253,245,0.35)', marginBottom: 6 }}>Discover talent</div>
          <div className="search-empty-sub" style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.25)' }}>Search for designers, tailors, and fashion requests</div>
        </div>
      )}

      {!loading && query && results.creators.length === 0 && results.requests.length === 0 && (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 42, opacity: 0.2, marginBottom: 12 }}>🚫</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, fontStyle: 'italic', color: 'rgba(236,253,245,0.35)', marginBottom: 6 }}>No results</div>
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.25)' }}>Try a different search term</div>
        </div>
      )}

      {/* Creators */}
      {results.creators.length > 0 && (
        <div style={{ padding: '0 20px' }}>
          <div className="search-section-label" style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)', marginBottom: 10 }}>Creators</div>
          {results.creators.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(52,211,153,0.06)', cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: c.avatar_url ? 'transparent' : PALETTES[i % PALETTES.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#34D399', flexShrink: 0, overflow: 'hidden', border: '1.5px solid rgba(52,211,153,0.2)' }}>
                {c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(c.full_name || c.username)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="search-creator-name" style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 600, color: '#ECFDF5', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {c.full_name || c.username}
                  {c.is_verified && <span style={{ width: 14, height: 14, background: '#34D399', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#0A1A14', fontWeight: 800 }}>✓</span>}
                </div>
                <div className="search-creator-sub" style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: 'rgba(236,253,245,0.35)' }}>@{c.username} · {fmt(c.followers_count)} followers</div>
              </div>
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34D399', padding: '4px 10px', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 100 }}>{c.role || 'creator'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Requests */}
      {results.requests.length > 0 && (
        <div style={{ padding: '12px 20px' }}>
          <div className="search-section-label" style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)', marginBottom: 10 }}>Requests</div>
          {results.requests.map(r => (
            <div key={r.id} style={{ padding: '12px 14px', marginBottom: 8, borderRadius: 14, background: 'rgba(10,26,20,0.5)', border: '1px solid rgba(52,211,153,0.08)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div>
                  <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6EE7B7', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', padding: '2px 8px', borderRadius: 6 }}>{r.category}</span>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 15, fontWeight: 600, color: '#ECFDF5', marginTop: 4 }}>{r.title}</div>
                </div>
                {r.budget && <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 700, color: '#E8C87A', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap' }}>GH₵ {Number(r.budget).toLocaleString()}</div>}
              </div>
              {r.description && <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)', lineHeight: 1.6, marginTop: 4 }}>{r.description.slice(0, 80)}…</div>}
            </div>
          ))}
        </div>
      )}
      <div style={{ height: 80 }} />
    </div>
  )
}