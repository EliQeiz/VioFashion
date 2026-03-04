// src/components/modals/MakeOfferModal.jsx
import { useState } from 'react'
import { submitOffer } from '../../hooks/useSupabase.js'

export default function MakeOfferModal({ request, user, onClose, onSuccess }) {
  const [form, setForm] = useState({ message: '', price: '', deliveryDays: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async () => {
    if (!form.price || !form.deliveryDays || !user || !request) return
    setSending(true)
    setError('')
    try {
      await submitOffer({
        requestId: request.id,
        creatorId: user.id,
        message: form.message,
        price: parseFloat(form.price),
        deliveryDays: parseInt(form.deliveryDays),
      })
      onSuccess?.()
    } catch (e) {
      setError(e.message || 'Failed to submit offer')
    }
    setSending(false)
  }

  const inputStyle = {
    width: '100%', padding: '11px 16px', borderRadius: 12,
    border: '1px solid rgba(52,211,153,0.1)', background: 'rgba(10,26,20,0.6)',
    color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 13,
    outline: 'none', marginBottom: 12, boxSizing: 'border-box',
  }

  return (
    <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(10,26,20,0.88)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: '#0F2B1E', borderRadius: '24px 24px 0 0', border: '1px solid rgba(52,211,153,0.1)', borderBottom: 'none', padding: 20 }}>
        <div className="sheet-handle" style={{ width: 32, height: 3, background: 'rgba(52,211,153,0.2)', borderRadius: 100, margin: '0 auto 12px' }} />
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 20, fontStyle: 'italic', color: '#ECFDF5', marginBottom: 4 }}>Make an Offer</div>
        <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)', marginBottom: 16 }}>on "{request?.title}"</div>

        {error && <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5', fontFamily: "'Jost', sans-serif", fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <textarea style={{ ...inputStyle, resize: 'none', height: 70 }} value={form.message} onChange={set('message')} placeholder="Why should they pick you? Describe your approach…" />
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1 }} type="number" value={form.price} onChange={set('price')} placeholder="Your price (GH₵)" />
          <input style={{ ...inputStyle, flex: 1 }} type="number" value={form.deliveryDays} onChange={set('deliveryDays')} placeholder="Delivery days" />
        </div>

        <button onClick={submit} disabled={sending || !form.price || !form.deliveryDays}
          style={{ width: '100%', padding: 13, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.3)', opacity: (sending || !form.price || !form.deliveryDays) ? 0.5 : 1 }}>
          {sending ? 'Submitting…' : 'Submit Offer ✦'}
        </button>
        <button onClick={onClose}
          style={{ width: '100%', padding: 11, marginTop: 8, borderRadius: 12, border: '1px solid rgba(52,211,153,0.1)', background: 'transparent', color: 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 12, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}