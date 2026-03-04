// src/components/modals/PaymentModal.jsx
import { useState } from 'react'
import { supabase } from '../../supabaseClient'

export default function PaymentModal({ order, user, profile, onClose, onPaid }) {
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const price = order?.accepted_offer?.[0]?.price || order?.price || 0
  const title = order?.title || order?.request?.title || 'Order'
  const requestId = order?.id || order?.request?.id

  const handlePay = async () => {
    setPaying(true)
    setError('')

    // Simulate Paystack integration
    try {
      // In production: call Paystack API here
      await new Promise(r => setTimeout(r, 2000))

      // Mark order as paid
      if (requestId) {
        await supabase.from('requests').update({ status: 'paid' }).eq('id', requestId)
      }

      setSuccess(true)
      setTimeout(() => onPaid?.(), 2000)
    } catch (e) {
      setError('Payment failed. Please try again.')
    }
    setPaying(false)
  }

  return (
    <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(10,26,20,0.88)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', background: '#0F2B1E', borderRadius: '24px 24px 0 0', border: '1px solid rgba(52,211,153,0.1)', borderBottom: 'none', padding: 20 }}>
        <div className="sheet-handle" style={{ width: 32, height: 3, background: 'rgba(52,211,153,0.2)', borderRadius: 100, margin: '0 auto 12px' }} />

        {success ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontStyle: 'italic', color: '#ECFDF5', marginBottom: 4 }}>Payment Successful</div>
            <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)' }}>GH₵ {Number(price).toLocaleString()} paid for "{title}"</div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontStyle: 'italic', color: '#ECFDF5', marginBottom: 4, textAlign: 'center' }}>Checkout</div>

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 36, fontWeight: 600, color: '#34D399' }}>GH₵ {Number(price).toLocaleString()}</div>
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: 'rgba(236,253,245,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total Amount</div>
            </div>

            {/* Order summary */}
            <div style={{ padding: 14, borderRadius: 14, background: 'rgba(10,26,20,0.5)', border: '1px solid rgba(52,211,153,0.08)', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)' }}>Commission</span>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 600, color: '#ECFDF5' }}>{title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)' }}>Payment Method</span>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 600, color: '#ECFDF5' }}>Paystack</span>
              </div>
            </div>

            {error && <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5', fontFamily: "'Jost', sans-serif", fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <button onClick={handlePay} disabled={paying}
              style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.3)', opacity: paying ? 0.6 : 1 }}>
              {paying ? '💳 Processing…' : '💳 Pay Now'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 10, fontFamily: "'Jost', sans-serif", fontSize: 10, color: 'rgba(236,253,245,0.25)' }}>🔒 Secured by Paystack — 256-bit encryption</div>
          </>
        )}

        <button onClick={onClose}
          style={{ width: '100%', padding: 11, marginTop: 8, borderRadius: 12, border: '1px solid rgba(52,211,153,0.1)', background: 'transparent', color: 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 12, cursor: 'pointer' }}>
          {success ? 'Done' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}