// src/components/onboarding/OnboardingFlow.jsx
import { useState, useRef } from 'react'
import { supabase } from '../../supabaseClient'

const ROLES = [
  { id: 'customer', emoji: '🛍️', label: 'Customer', desc: 'Browse & commission fashion' },
  { id: 'tailor', emoji: '✂️', label: 'Tailor', desc: 'Custom clothing & alterations' },
  { id: 'designer', emoji: '🎨', label: 'Designer', desc: 'Fashion design & collections' },
  { id: 'makeup_artist', emoji: '💄', label: 'Makeup Artist', desc: 'Beauty & styling services' },
  { id: 'shoemaker', emoji: '👟', label: 'Shoemaker', desc: 'Custom footwear & repair' },
]

const STEPS = ['role', 'profile', 'avatar', 'done']

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [form, setForm] = useState({ full_name: '', username: '', bio: '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const nextFromRole = () => {
    if (!role) { setError('Please select your role'); return }
    setError('')
    setStep(1)
  }

  const nextFromProfile = async () => {
    if (!form.full_name.trim()) { setError('Name is required'); return }
    if (!form.username.trim()) { setError('Username is required'); return }
    setError('')

    // Check username
    const { data: existing } = await supabase.from('profiles')
      .select('id').eq('username', form.username.trim()).neq('id', user.id).single()
    if (existing) { setError('Username already taken'); return }

    setStep(2)
  }

  const handleAvatarPick = (f) => {
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  const finish = async () => {
    setSaving(true)
    setError('')

    try {
      let avatarUrl = null

      // Upload avatar if selected
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
        if (!upErr) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = data.publicUrl
        }
      }

      // Update profile
      const updates = {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim() || null,
        role,
        onboarding_complete: true,
      }
      if (avatarUrl) updates.avatar_url = avatarUrl

      const { error: updateErr } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (updateErr) throw updateErr

      setStep(3)
      setTimeout(() => onComplete(), 2000)
    } catch (e) {
      setError(e.message || 'Failed to save')
    }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '13px 16px', borderRadius: 14,
    border: '1px solid rgba(52,211,153,0.15)', background: 'rgba(10,26,20,0.6)',
    color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 14,
    outline: 'none', marginBottom: 14, boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0A1A14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Background watermark */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.03 }}>
        <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: 200, color: '#fff' }}>VIO</span>
      </div>

      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px', position: 'relative', zIndex: 1 }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {STEPS.slice(0, 3).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 100,
              background: i <= step ? 'linear-gradient(90deg, #059669, #34D399)' : 'rgba(52,211,153,0.12)',
              transition: 'all 0.4s',
            }} />
          ))}
        </div>

        {/* ── STEP 0: Role ── */}
        {step === 0 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 30, fontStyle: 'italic', fontWeight: 300, color: '#ECFDF5', marginBottom: 4 }}>
              Welcome to <span style={{ color: '#34D399', fontWeight: 600 }}>VioFashion</span>
            </div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: 'rgba(236,253,245,0.4)', marginBottom: 28 }}>
              Tell us who you are
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLES.map(r => (
                <button key={r.id} onClick={() => { setRole(r.id); setError('') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                    background: role === r.id ? 'rgba(5,150,105,0.12)' : 'rgba(236,253,245,0.03)',
                    border: `1.5px solid ${role === r.id ? '#059669' : 'rgba(52,211,153,0.1)'}`,
                    transition: 'all 0.25s',
                  }}>
                  <span style={{ fontSize: 28 }}>{r.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 600, color: role === r.id ? '#6EE7B7' : '#ECFDF5' }}>{r.label}</div>
                    <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: 'rgba(236,253,245,0.35)' }}>{r.desc}</div>
                  </div>
                  {role === r.id && <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800 }}>✓</div>}
                </button>
              ))}
            </div>

            {error && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5', fontFamily: "'Jost', sans-serif", fontSize: 12 }}>{error}</div>}

            <button onClick={nextFromRole}
              style={{ width: '100%', marginTop: 20, padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}>
              Continue
            </button>
          </div>
        )}

        {/* ── STEP 1: Name/Username ── */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontStyle: 'italic', fontWeight: 300, color: '#ECFDF5', marginBottom: 4 }}>
              Your identity
            </div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: 'rgba(236,253,245,0.4)', marginBottom: 24 }}>
              How should people find you?
            </div>

            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)', marginBottom: 6 }}>Full Name</div>
            <input style={inputStyle} value={form.full_name} onChange={set('full_name')} placeholder="e.g. Amara Osei" autoFocus />

            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)', marginBottom: 6 }}>Username</div>
            <input style={inputStyle} value={form.username} onChange={set('username')} placeholder="e.g. amara.creates" />

            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(236,253,245,0.35)', marginBottom: 6 }}>Bio (optional)</div>
            <textarea style={{ ...inputStyle, resize: 'none', height: 70 }} value={form.bio} onChange={set('bio')} placeholder="Tell the world what you create…" />

            {error && <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5', fontFamily: "'Jost', sans-serif", fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: 13, borderRadius: 14, border: '1px solid rgba(52,211,153,0.15)', background: 'transparent', color: 'rgba(236,253,245,0.5)', fontFamily: "'Jost', sans-serif", fontSize: 13, cursor: 'pointer' }}>Back</button>
              <button onClick={nextFromProfile} style={{ flex: 2, padding: 13, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}>Continue</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Avatar ── */}
        {step === 2 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 28, fontStyle: 'italic', fontWeight: 300, color: '#ECFDF5', marginBottom: 4 }}>
              Add your photo
            </div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, color: 'rgba(236,253,245,0.4)', marginBottom: 28 }}>
              Help others recognize you
            </div>

            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarPick(e.target.files[0])} />

            <div onClick={() => fileRef.current?.click()}
              style={{
                width: 120, height: 120, borderRadius: '50%', margin: '0 auto 20px',
                border: `3px dashed ${avatarPreview ? '#059669' : 'rgba(52,211,153,0.25)'}`,
                overflow: 'hidden', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: avatarPreview ? 'transparent' : 'rgba(10,26,20,0.6)',
                transition: 'all 0.3s',
              }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div>
                    <div style={{ fontSize: 32, marginBottom: 4 }}>📷</div>
                    <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, color: 'rgba(236,253,245,0.35)' }}>Tap to upload</div>
                  </div>
              }
            </div>

            {error && <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5', fontFamily: "'Jost', sans-serif", fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <button onClick={finish} disabled={saving}
              style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.3)', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Setting up…' : avatarPreview ? 'Complete Setup ✦' : 'Skip & Finish'}
            </button>

            <button onClick={() => setStep(1)} style={{ width: '100%', padding: 11, marginTop: 8, border: 'none', background: 'transparent', color: 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 12, cursor: 'pointer' }}>Back</button>
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 32, fontStyle: 'italic', fontWeight: 300, color: '#ECFDF5', marginBottom: 6 }}>
              You're all set
            </div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: 'rgba(236,253,245,0.4)' }}>
              Welcome to VioFashion, <span style={{ color: '#34D399', fontWeight: 600 }}>{form.full_name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}