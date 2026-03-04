// src/components/modals/UploadModal.jsx
import { useState, useRef } from 'react'
import { uploadVideo } from '../../hooks/useSupabase.js'

export default function UploadModal({ user, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState('')
  const [soundName, setSoundName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (f.size > 100 * 1024 * 1024) { setError('File too large. Max 100MB.'); return }
    setFile(f)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const upload = async () => {
    if (!file || !user || uploading) return
    setUploading(true)
    setError('')
    setProgress(10)

    try {
      const interval = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 400)
      await uploadVideo({
        file,
        caption,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        soundName: soundName || null,
        creatorId: user.id,
      })
      clearInterval(interval)
      setProgress(100)
      setSuccess(true)
      setTimeout(() => onSuccess?.(), 1500)
    } catch (e) {
      setError(e.message || 'Upload failed')
      setProgress(0)
    }
    setUploading(false)
  }

  const inputStyle = {
    width: '100%', padding: '11px 16px', borderRadius: 12,
    border: '1px solid rgba(52,211,153,0.1)', background: 'rgba(10,26,20,0.6)',
    color: '#ECFDF5', fontFamily: "'Jost', sans-serif", fontSize: 13,
    outline: 'none', marginBottom: 12, boxSizing: 'border-box',
  }

  return (
    <div className="modal-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(10,26,20,0.88)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxHeight: '85%', background: '#0F2B1E', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', border: '1px solid rgba(52,211,153,0.1)', borderBottom: 'none' }}>
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div className="sheet-handle" style={{ width: 32, height: 3, background: 'rgba(52,211,153,0.2)', borderRadius: 100, margin: '0 auto 12px' }} />
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontStyle: 'italic', color: '#ECFDF5', marginBottom: 4 }}>Create Post</div>
          <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)', marginBottom: 16 }}>Share your fashion work with the world</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px', scrollbarWidth: 'none' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#FCA5A5', fontFamily: "'Jost', sans-serif", fontSize: 12, marginBottom: 12 }}>{error}</div>
          )}

          {success ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontStyle: 'italic', color: '#ECFDF5', marginBottom: 4 }}>Published!</div>
              <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: 'rgba(236,253,245,0.4)' }}>Your post is now live on the feed</div>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <input ref={fileRef} type="file" accept="video/*,image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              <div onClick={() => fileRef.current?.click()} onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                style={{
                  padding: '30px 20px', borderRadius: 16, marginBottom: 16, textAlign: 'center', cursor: 'pointer',
                  border: `2px dashed ${file ? '#C9A84C' : 'rgba(52,211,153,0.2)'}`,
                  background: file ? 'rgba(201,168,76,0.04)' : 'transparent',
                  transition: 'all 0.2s',
                }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? '🎬' : '📁'}</div>
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 600, color: '#ECFDF5', marginBottom: 4 }}>
                  {file ? file.name : 'Tap to select video or image'}
                </div>
                <div style={{ fontFamily: "'Jost', sans-serif", fontSize: 11, color: 'rgba(236,253,245,0.35)' }}>
                  {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'MP4, MOV, JPG up to 100MB'}
                </div>
              </div>

              {/* Progress */}
              {uploading && (
                <div style={{ height: 4, borderRadius: 100, background: 'rgba(52,211,153,0.1)', marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(90deg,#059669,#34D399)', width: `${progress}%`, transition: 'width 0.3s' }} />
                </div>
              )}

              <input style={inputStyle} value={caption} onChange={e => setCaption(e.target.value)} placeholder="Write a caption…" />
              <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma separated) e.g. KenteFashion, Bespoke" />
              <input style={inputStyle} value={soundName} onChange={e => setSoundName(e.target.value)} placeholder="Sound / Music name (optional)" />

              <button onClick={upload} disabled={!file || uploading}
                style={{ width: '100%', padding: 13, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.3)', opacity: (!file || uploading) ? 0.5 : 1 }}>
                {uploading ? `Uploading… ${progress}%` : 'Publish ✦'}
              </button>
            </>
          )}

          <button onClick={onClose}
            style={{ width: '100%', padding: 11, marginTop: 8, borderRadius: 12, border: '1px solid rgba(52,211,153,0.1)', background: 'transparent', color: 'rgba(236,253,245,0.4)', fontFamily: "'Jost', sans-serif", fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}