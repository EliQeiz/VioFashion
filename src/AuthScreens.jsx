// src/AuthScreens.jsx
// ─────────────────────────────────────────────────────────────
//  VioFashion — Luxury Editorial Auth Screens
//  Login + Signup. Fonts loaded via link injection.
//  All inputs functional. Fully self-contained.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth.jsx'

// ── Load fonts ────────────────────────────────────────────────
function useFonts() {
  useEffect(() => {
    if (document.getElementById('vio-fonts')) return
    const link = document.createElement('link')
    link.id = 'vio-fonts'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600;700&display=swap'
    document.head.appendChild(link)
  }, [])
}

// ── Design tokens ─────────────────────────────────────────────
const T = {
  black:       '#07050A',
  deep:        '#0F0B18',
  card:        '#130F1E',
  border:      'rgba(255,255,255,0.08)',
  violet:      '#7C3AED',
  violetMid:   '#A78BFA',
  violetLight: '#DDD6FE',
  gold:        '#C9A84C',
  goldLight:   '#E8C87A',
  white:       '#FAFAFA',
  muted:       'rgba(250,250,250,0.45)',
  error:       '#F87171',
  fontDisplay: "'Cormorant Garamond', Georgia, serif",
  fontBody:    "'Jost', system-ui, sans-serif",
}

// ── Global CSS (injected once) ────────────────────────────────
const GLOBAL_CSS = `
  @keyframes vio-fadeup {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes vio-fadein {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes vio-orb1 {
    0%, 100% { transform: translate(0,0) scale(1); }
    33%  { transform: translate(40px,-30px) scale(1.08); }
    66%  { transform: translate(-20px,20px) scale(0.95); }
  }
  @keyframes vio-orb2 {
    0%, 100% { transform: translate(0,0) scale(1); }
    33%  { transform: translate(-35px,25px) scale(1.05); }
    66%  { transform: translate(25px,-20px) scale(0.97); }
  }
  @keyframes vio-orb3 {
    0%, 100% { transform: translate(0,0) scale(1); }
    50%  { transform: translate(20px,-40px) scale(1.1); }
  }
  @keyframes vio-spin {
    to { transform: rotate(360deg); }
  }
  .vio-input::placeholder { color: rgba(250,250,250,0.22) !important; }
  .vio-input:focus { outline: none !important; border-bottom-color: #7C3AED !important; }
  .vio-input:-webkit-autofill,
  .vio-input:-webkit-autofill:hover,
  .vio-input:-webkit-autofill:focus {
    -webkit-text-fill-color: #FAFAFA !important;
    -webkit-box-shadow: 0 0 0 1000px #130F1E inset !important;
    transition: background-color 5000s;
  }
  .vio-role-btn { cursor:pointer; transition: all 0.2s; }
  .vio-role-btn:hover { border-color: rgba(167,139,250,0.5) !important; background: rgba(124,58,237,0.12) !important; }
  .vio-role-btn.sel { border-color: #7C3AED !important; background: rgba(124,58,237,0.2) !important; }
  .vio-primary-btn { transition: all 0.25s; }
  .vio-primary-btn:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 10px 32px rgba(124,58,237,0.55) !important; }
  .vio-google-btn { transition: all 0.25s; }
  .vio-google-btn:hover { border-color: rgba(167,139,250,0.35) !important; background: rgba(124,58,237,0.07) !important; }
  .vio-link { transition: color 0.2s; }
  .vio-link:hover { color: #A78BFA !important; }
`

function injectCSS() {
  if (document.getElementById('vio-auth-css')) return
  const el = document.createElement('style')
  el.id = 'vio-auth-css'
  el.textContent = GLOBAL_CSS
  document.head.appendChild(el)
}

// ── Background decoration ────────────────────────────────────
function Bg() {
  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      <div style={{
        position:'absolute', inset:0,
        background:`radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%),
                    radial-gradient(ellipse 60% 50% at 90% 100%, rgba(201,168,76,0.08) 0%, transparent 60%),
                    #07050A`,
      }}/>
      <div style={{
        position:'absolute', width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(124,58,237,0.13) 0%, transparent 70%)',
        top:'-200px', left:'-150px',
        animation:'vio-orb1 18s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(201,168,76,0.09) 0%, transparent 70%)',
        bottom:'-100px', right:'-80px',
        animation:'vio-orb2 22s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 70%)',
        top:'40%', right:'10%',
        animation:'vio-orb3 14s ease-in-out infinite',
      }}/>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.025}}>
        <defs>
          <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M60 0L0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>
    </div>
  )
}

// ── Brand ─────────────────────────────────────────────────────
function Brand() {
  return (
    <div style={{textAlign:'center', marginBottom:32}}>
      <div style={{
        width:48, height:48, margin:'0 auto 14px',
        position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{
          width:'100%', height:'100%', borderRadius:'50%',
          border:`1.5px solid ${T.gold}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <div style={{
            width:'55%', height:'55%', borderRadius:'50%',
            background:`linear-gradient(135deg, ${T.violet}, ${T.gold})`,
          }}/>
        </div>
        <div style={{
          position:'absolute', inset:-7, borderRadius:'50%',
          border:'1px solid rgba(201,168,76,0.18)',
        }}/>
      </div>
      <div style={{
        fontFamily:T.fontDisplay, fontSize:34, fontWeight:700,
        letterSpacing:'0.1em',
        background:`linear-gradient(135deg, ${T.white} 20%, ${T.gold} 55%, ${T.violetMid} 100%)`,
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
        lineHeight:1, marginBottom:6,
      }}>
        VIOFASHION
      </div>
      <div style={{
        fontFamily:T.fontBody, fontSize:10, fontWeight:400,
        letterSpacing:'0.35em', textTransform:'uppercase',
        color:T.gold, opacity:0.75,
      }}>
        Africa's Fashion Platform
      </div>
    </div>
  )
}

// ── Input field ───────────────────────────────────────────────
function Field({ label, type='text', placeholder, value, onChange, autoComplete, half }) {
  return (
    <div style={{ marginBottom:20, flex: half ? '1 1 calc(50% - 10px)' : '1 1 100%' }}>
      <label style={{
        display:'block', fontFamily:T.fontBody, fontSize:10,
        fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase',
        color:T.muted, marginBottom:8,
      }}>
        {label}
      </label>
      <input
        className="vio-input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete || 'off'}
        style={{
          width:'100%', background:'transparent', border:'none',
          borderBottom:`1.5px solid rgba(255,255,255,0.12)`,
          borderRadius:0, padding:'11px 0',
          color:T.white, fontFamily:T.fontBody, fontSize:15,
          fontWeight:400, letterSpacing:'0.01em',
          caretColor:T.violetMid, display:'block',
        }}
      />
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{display:'flex', alignItems:'center', gap:14, margin:'22px 0'}}>
      <div style={{flex:1, height:1, background:T.border}}/>
      <span style={{fontFamily:T.fontBody, fontSize:11, color:T.muted, letterSpacing:'0.1em'}}>or</span>
      <div style={{flex:1, height:1, background:T.border}}/>
    </div>
  )
}

// ── Primary button ────────────────────────────────────────────
function PrimaryBtn({ onClick, loading, children }) {
  return (
    <button
      className="vio-primary-btn"
      onClick={onClick}
      disabled={loading}
      style={{
        width:'100%',
        background: loading ? 'rgba(124,58,237,0.4)' : `linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)`,
        border:'none', borderRadius:12,
        padding:'15px 24px',
        color:T.white, fontFamily:T.fontBody,
        fontSize:14, fontWeight:600,
        letterSpacing:'0.08em', textTransform:'uppercase',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow:'0 4px 20px rgba(124,58,237,0.35)',
        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      }}
    >
      {loading
        ? <><Spinner/> Processing...</>
        : children
      }
    </button>
  )
}

function Spinner() {
  return (
    <div style={{
      width:15, height:15,
      border:'2px solid rgba(255,255,255,0.3)',
      borderTopColor:T.white, borderRadius:'50%',
      animation:'vio-spin 0.7s linear infinite',
    }}/>
  )
}

function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      background:'rgba(248,113,113,0.1)',
      border:'1px solid rgba(248,113,113,0.25)',
      borderRadius:10, padding:'12px 16px',
      marginBottom:20, fontFamily:T.fontBody,
      fontSize:13, color:T.error,
      animation:'vio-fadein 0.3s ease',
    }}>
      {msg}
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  LOGIN
// ────────────────────────────────────────────────────────────
function Login({ onSwitch }) {
  const { signIn, signInWithGoogle } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const submit = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    try { await signIn({ email, password }) }
    catch (e) { setError(e.message || 'Sign in failed.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{animation:'vio-fadeup 0.45s ease both'}}>
      <Brand/>
      <div style={{fontFamily:T.fontDisplay, fontSize:28, fontWeight:300, fontStyle:'italic', color:T.white, marginBottom:4}}>
        Welcome back
      </div>
      <div style={{fontFamily:T.fontBody, fontSize:13, color:T.muted, fontWeight:300, marginBottom:30}}>
        Sign in to continue your fashion journey
      </div>

      <ErrorBox msg={error}/>

      <Field label="Email Address" type="email" placeholder="you@example.com"
        value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/>

      <Field label="Password" type="password" placeholder="Your password"
        value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/>

      <div style={{textAlign:'right', marginTop:-10, marginBottom:28}}>
        <span className="vio-link" style={{fontFamily:T.fontBody, fontSize:12, color:T.muted, cursor:'pointer'}}>
          Forgot password?
        </span>
      </div>

      <PrimaryBtn onClick={submit} loading={loading}>Sign In</PrimaryBtn>

      <Divider/>

      <button className="vio-google-btn" onClick={signInWithGoogle} style={{
        width:'100%', background:'rgba(255,255,255,0.04)',
        border:`1px solid ${T.border}`, borderRadius:12,
        padding:'13px 24px', color:T.white,
        fontFamily:T.fontBody, fontSize:14, fontWeight:500,
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:12,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div style={{textAlign:'center', marginTop:28, fontFamily:T.fontBody, fontSize:13, color:T.muted, fontWeight:300}}>
        New to VioFashion?{' '}
        <span className="vio-link" onClick={onSwitch}
          style={{color:T.violetMid, cursor:'pointer', fontWeight:500}}>
          Create account
        </span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  SIGNUP
// ────────────────────────────────────────────────────────────
const ROLES = [
  { value:'customer',      emoji:'🛍️', label:'Customer'  },
  { value:'tailor',        emoji:'✂️',  label:'Tailor'    },
  { value:'designer',      emoji:'🎨',  label:'Designer'  },
  { value:'makeup_artist', emoji:'💄',  label:'MUA'       },
  { value:'shoemaker',     emoji:'👟',  label:'Cobbler'   },
]

function Signup({ onSwitch }) {
  const { signUp } = useAuth()
  const [form, setForm] = useState({ fullName:'', username:'', email:'', password:'', role:'customer' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  const set = k => e => setForm(p => ({...p, [k]: e.target.value}))

  const submit = async () => {
    if (!form.fullName)          { setError('Please enter your full name.'); return }
    if (!form.username)          { setError('Please choose a username.'); return }
    if (!form.email)             { setError('Please enter your email address.'); return }
    if (form.password.length<6)  { setError('Password must be at least 6 characters.'); return }
    setLoading(true); setError('')
    try {
      await signUp({ email:form.email, password:form.password, username:form.username, fullName:form.fullName, role:form.role })
      setDone(true)
    } catch(e) { setError(e.message || 'Sign up failed.') }
    finally { setLoading(false) }
  }

  if (done) return (
    <div style={{textAlign:'center', animation:'vio-fadeup 0.5s ease both', padding:'20px 0'}}>
      <div style={{fontSize:52, marginBottom:16}}>✦</div>
      <div style={{fontFamily:T.fontDisplay, fontSize:32, fontWeight:600, color:T.white, marginBottom:8}}>
        You're in.
      </div>
      <div style={{fontFamily:T.fontBody, fontSize:14, color:T.muted, lineHeight:1.8, marginBottom:32}}>
        Check your inbox at<br/>
        <span style={{color:T.violetLight, fontWeight:500}}>{form.email}</span><br/>
        for a confirmation link.
      </div>
      <PrimaryBtn onClick={onSwitch}>Go to Sign In</PrimaryBtn>
    </div>
  )

  return (
    <div style={{animation:'vio-fadeup 0.45s ease both'}}>
      <Brand/>
      <div style={{fontFamily:T.fontDisplay, fontSize:28, fontWeight:300, fontStyle:'italic', color:T.white, marginBottom:4}}>
        Join the movement
      </div>
      <div style={{fontFamily:T.fontBody, fontSize:13, color:T.muted, fontWeight:300, marginBottom:28}}>
        Create your free VioFashion account
      </div>

      <ErrorBox msg={error}/>

      {/* Two column row */}
      <div style={{display:'flex', gap:20, flexWrap:'wrap'}}>
        <Field label="Full Name" placeholder="Amara Osei"
          value={form.fullName} onChange={set('fullName')} autoComplete="name" half/>
        <Field label="Username" placeholder="amara.creates"
          value={form.username} onChange={set('username')} autoComplete="username" half/>
      </div>

      <Field label="Email Address" type="email" placeholder="you@example.com"
        value={form.email} onChange={set('email')} autoComplete="email"/>

      <Field label="Password" type="password" placeholder="At least 6 characters"
        value={form.password} onChange={set('password')} autoComplete="new-password"/>

      {/* Role */}
      <div style={{marginBottom:28}}>
        <div style={{
          fontFamily:T.fontBody, fontSize:10, fontWeight:600,
          letterSpacing:'0.15em', textTransform:'uppercase',
          color:T.muted, marginBottom:12,
        }}>
          I am a...
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {ROLES.map(r => (
            <button key={r.value}
              className={`vio-role-btn${form.role===r.value?' sel':''}`}
              onClick={() => setForm(p=>({...p,role:r.value}))}
              style={{
                background: form.role===r.value ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                border:`1px solid ${form.role===r.value ? T.violet : T.border}`,
                borderRadius:10, padding:'9px 14px',
                display:'flex', alignItems:'center', gap:6,
              }}
            >
              <span style={{fontSize:14}}>{r.emoji}</span>
              <span style={{
                fontFamily:T.fontBody, fontSize:12, fontWeight:500,
                color: form.role===r.value ? T.violetLight : T.muted,
              }}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <PrimaryBtn onClick={submit} loading={loading}>Create Account →</PrimaryBtn>

      <div style={{textAlign:'center', marginTop:24, fontFamily:T.fontBody, fontSize:13, color:T.muted, fontWeight:300}}>
        Already have an account?{' '}
        <span className="vio-link" onClick={onSwitch}
          style={{color:T.violetMid, cursor:'pointer', fontWeight:500}}>
          Sign in
        </span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  EXPORT
// ────────────────────────────────────────────────────────────
export default function AuthScreens() {
  const [mode, setMode] = useState('login')
  useFonts()
  useEffect(() => { injectCSS() }, [])

  return (
    <div style={{
      position:'fixed', inset:0,
      background:T.black,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:T.fontBody, overflow:'hidden',
    }}>
      <Bg/>

      <div style={{
        position:'relative', zIndex:10,
        width:'100%', maxWidth:460,
        margin:'0 auto', padding:'0 16px',
        maxHeight:'100vh', overflowY:'auto',
        scrollbarWidth:'none',
      }}>
        <div style={{
          background:'rgba(19,15,30,0.88)',
          backdropFilter:'blur(28px)',
          WebkitBackdropFilter:'blur(28px)',
          border:`1px solid ${T.border}`,
          borderRadius:24,
          padding: mode==='signup' ? '36px 32px 32px' : '44px 36px 40px',
          boxShadow:'0 25px 80px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)',
          margin:'20px 0',
          position:'relative', overflow:'hidden',
        }}>
          {/* Top gold shimmer */}
          <div style={{
            position:'absolute', top:0, left:'15%', right:'15%', height:1,
            background:`linear-gradient(90deg, transparent, ${T.gold}, transparent)`,
            opacity:0.55,
          }}/>

          {mode==='login'
            ? <Login  onSwitch={() => setMode('signup')}/>
            : <Signup onSwitch={() => setMode('login')}/>
          }

          {/* Bottom violet shimmer */}
          <div style={{
            position:'absolute', bottom:0, left:'25%', right:'25%', height:1,
            background:`linear-gradient(90deg, transparent, ${T.violet}, transparent)`,
            opacity:0.35,
          }}/>
        </div>

        <div style={{
          textAlign:'center', paddingBottom:20,
          fontFamily:T.fontBody, fontSize:11,
          color:'rgba(250,250,250,0.18)', letterSpacing:'0.05em',
        }}>
          © 2025 VioFashion · All rights reserved
        </div>
      </div>
    </div>
  )
}
