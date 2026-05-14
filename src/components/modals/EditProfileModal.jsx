// src/components/modals/EditProfileModal.jsx
import { useState } from 'react'
import { supabase } from '../../supabaseClient'

const ROLES = [
  { id: 'customer', label: 'Customer', emoji: '🛍️' },
  { id: 'tailor', label: 'Tailor', emoji: '✂️' },
  { id: 'designer', label: 'Designer', emoji: '🎨' },
  { id: 'makeup_artist', label: 'Makeup Artist', emoji: '💄' },
  { id: 'shoemaker', label: 'Shoemaker', emoji: '👟' },
]

export default function EditProfileModal({ user, profile, onClose, onSaved }) {
  const dp = profile || {}
  const [form, setForm] = useState({
    full_name: dp.full_name || '',
    username: dp.username || '',
    bio: dp.bio || '',
    location: dp.location || '',
    role: dp.role || 'customer',
  })
  const [services, setServices] = useState((dp.profile_services || []).map(s => s.service))
  const [newSvc, setNewSvc] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const addService = () => {
    if (!newSvc.trim() || services.includes(newSvc.trim())) return
    setServices(p => [...p, newSvc.trim()])
    setNewSvc('')
  }

  const save = async () => {
    if (!user) return
    setSaving(true)
    setError('')

    // Check username uniqueness
    if (form.username && form.username !== dp.username) {
      const { data: existing } = await supabase.from('profiles')
        .select('id').eq('username', form.username).neq('id', user.id).single()
      if (existing) {
        setError('Username already taken')
        setSaving(false)
        return
      }
    }

    const { error: updateErr } = await supabase.from('profiles').update({
      full_name: form.full_name || null,
      username: form.username || null,
      bio: form.bio || null,
      location: form.location || null,
      role: form.role,
    }).eq('id', user.id)

    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    // Update services
    await supabase.from('profile_services').delete().eq('profile_id', user.id)
    if (services.length > 0) {
      await supabase.from('profile_services').insert(
        services.map(s => ({ profile_id: user.id, service: s }))
      )
    }

    setSaving(false)
    onSaved?.()
  }

  const inputStyle = {
    width: '100%', padding: '11px 16px', borderRadius: 12,
    border: '1px solid rgba(52,211,153,0.1)', background: 'rgba(10,26,20,0.6)',
    color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 13,
    outline: 'none', marginBottom: 12, boxSizing: 'border-box',
  }
  const labelStyle = {
    fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600,
    letterSpacing: '0.15em', textTransform: 'uppercase',
    color: 'rgba(236,253,245,0.35)', marginBottom: 6, display: 'block',
  }

  return (
    <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(10,26,20,0.88)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '85%', background: '#0F2B1E', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', border: '1px solid rgba(52,211,153,0.1)', borderBottom: 'none' }}>
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div className="sheet-handle" style={{ width: 32, height: 3, background: 'rgba(52,211,153,0.2)', borderRadius: 100, margin: '0 auto 12px' }} />
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontStyle: 'italic', color: '#ECFDF5', marginBottom: 4 }}>Edit Profile</div>
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)', marginBottom: 16 }}>Update your professional profile</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px', scrollbarWidth: 'none' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5', fontFamily: "'Jost', sans-serif", fontSize: 12, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <label style={labelStyle}>Full Name</label>
          <input style={inputStyle} value={form.full_name} onChange={set('full_name')} placeholder="Your full name" />

          <label style={labelStyle}>Username</label>
          <input style={inputStyle} value={form.username} onChange={set('username')} placeholder="unique_username" />

          <label style={labelStyle}>Bio</label>
          <textarea style={{ ...inputStyle, resize: 'none', height: 70 }} value={form.bio} onChange={set('bio')} placeholder="Tell people about yourself…" />

          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={form.location} onChange={set('location')} placeholder="e.g. Accra, Ghana" />

          <label style={labelStyle}>Role</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
            {ROLES.map(r => (
              <button key={r.id} onClick={() => setForm(p => ({ ...p, role: r.id }))}
                style={{
                  padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                  background: form.role === r.id ? 'rgba(5,150,105,0.1)' : 'rgba(236,253,245,0.03)',
                  border: `1px solid ${form.role === r.id ? '#059669' : 'rgba(52,211,153,0.1)'}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}>
                <span style={{ fontSize: 18 }}>{r.emoji}</span>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 500, color: form.role === r.id ? '#6EE7B7' : 'rgba(236,253,245,0.5)' }}>{r.label}</span>
              </button>
            ))}
          </div>

          {form.role !== 'customer' && (
            <>
              <label style={labelStyle}>Services</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {services.map(s => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 100, background: 'rgba(10,26,20,0.7)', border: '1px solid rgba(52,211,153,0.12)', color: '#6EE7B7', fontFamily: "'Jost', sans-serif", fontSize: 11 }}>
                    {s}
                    <button onClick={() => setServices(p => p.filter(x => x !== s))} style={{ background: 'none', border: 'none', color: 'rgba(236,253,245,0.3)', cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={newSvc} onChange={e => setNewSvc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addService()} placeholder="Add a service…" />
                <button onClick={addService} style={{ padding: '0 14px', borderRadius: 12, background: 'rgba(5,150,105,0.15)', border: '1px solid rgba(52,211,153,0.2)', color: '#6EE7B7', fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+</button>
              </div>
            </>
          )}

          <button onClick={save} disabled={saving}
            style={{ width: '100%', padding: 13, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.3)', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          <button onClick={onClose}
            style={{ width: '100%', padding: 11, marginTop: 8, borderRadius: 12, border: '1px solid rgba(52,211,153,0.1)', background: 'transparent', color: 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}