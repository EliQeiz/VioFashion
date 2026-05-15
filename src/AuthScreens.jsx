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
  black:       '#F4F1E9',
  deep:        '#ECE7DA',
  card:        '#FFFFFF',
  border:      'rgba(39,32,20,0.18)',
  violet:      '#7856CC',
  violetMid:   '#8E6CE0',
  violetLight: '#B39AF0',
  gold:        '#B3882F',
  goldLight:   '#D9B96A',
  white:       '#1C170F',
  muted:       'rgba(53,43,25,0.62)',
  error:       '#F87171',
  success:     '#0E7A3D',
  fieldBg:     '#F8F7F4',
  primary:     '#0D6A33',
  paper:       '#F4F2EC',
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
  @keyframes kente-sweep {
    from { background-position: 0 0; }
    to { background-position: 180px 0; }
  }
  .vio-input::placeholder { color: rgba(53,43,25,0.46) !important; }
  .vio-input:focus { outline: none !important; border-color: rgba(120,86,204,0.45) !important; box-shadow: 0 0 0 3px rgba(120,86,204,0.12) !important; }
  .vio-input:-webkit-autofill,
  .vio-input:-webkit-autofill:hover,
  .vio-input:-webkit-autofill:focus {
    -webkit-text-fill-color: #1C170F !important;
    -webkit-box-shadow: 0 0 0 1000px #F8F7F4 inset !important;
    transition: background-color 5000s;
  }
  .kente-mini-strip{
    height:12px;border-radius:8px 8px 0 0;margin-bottom:14px;border:1px solid rgba(39,32,20,0.14);
    background:
      repeating-linear-gradient(90deg,#161616 0 10px,#EDC531 10px 22px,#0F7A3A 22px 30px,#CC2B38 30px 42px,#131313 42px 50px),
      linear-gradient(90deg,rgba(255,255,255,0.08),rgba(0,0,0,0.18));
    animation:kente-sweep 7s linear infinite;
  }
  .auth-paper{
    background:#FFFFFF;border:1px solid rgba(39,32,20,0.14);border-radius:18px;
    box-shadow:0 22px 54px rgba(25,20,12,0.14), inset 0 1px 0 rgba(255,255,255,0.8);
  }
  .auth-brand-title{
    letter-spacing:0.09em;
    background:linear-gradient(135deg,#141210 20%,#B3882F 72%);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
  }
  .vio-role-btn { cursor:pointer; transition: all 0.2s; }
  .vio-role-btn:hover { border-color: rgba(120,86,204,0.45) !important; background: rgba(120,86,204,0.08) !important; }
  .vio-role-btn.sel { border-color: #7856CC !important; background: rgba(120,86,204,0.16) !important; }
  .vio-primary-btn { transition: all 0.25s; }
  .vio-primary-btn:hover:not(:disabled) { transform: translateY(-2px) !important; box-shadow: 0 10px 24px rgba(13,106,51,0.36) !important; }
  .vio-google-btn { transition: all 0.25s; }
  .vio-google-btn:hover { border-color: rgba(120,86,204,0.35) !important; background: rgba(120,86,204,0.07) !important; }
  .vio-link { transition: color 0.2s; }
  .vio-link:hover { color: #7856CC !important; }
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
        background:`radial-gradient(ellipse 70% 40% at 50% -5%, rgba(211,190,139,0.28) 0%, transparent 68%),
                    radial-gradient(ellipse 60% 45% at 100% 90%, rgba(120,86,204,0.12) 0%, transparent 70%),
                    #F4F1E9`,
      }}/>
      <div style={{
        position:'absolute',
        top:0,left:0,right:0,height:26,
        background:'repeating-linear-gradient(90deg,#141414 0 13px,#F4C327 13px 29px,#0F7A3A 29px 38px,#CF2E40 38px 54px,#1A1A1A 54px 64px)',
        opacity:0.9,
      }}/>
      <div style={{
        position:'absolute',
        bottom:0,left:0,right:0,height:20,
        background:'linear-gradient(90deg,rgba(20,20,20,0) 0%,rgba(20,20,20,0.25) 14%,rgba(15,122,58,0.22) 45%,rgba(179,136,47,0.22) 70%,rgba(20,20,20,0) 100%)',
      }}/>
      <div style={{
        position:'absolute', width:440, height:440, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(120,86,204,0.08) 0%, transparent 70%)',
        top:'-120px', right:'-180px',
        animation:'vio-orb3 16s ease-in-out infinite',
      }}/>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.025}}>
        <defs>
          <pattern id="g" width="52" height="52" patternUnits="userSpaceOnUse">
            <path d="M52 0L0 0 0 52" fill="none" stroke="black" strokeWidth="0.4"/>
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
    <div style={{textAlign:'center', marginBottom:24}}>
      <div style={{
        width:44, height:44, margin:'0 auto 12px',
        position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <div style={{
          width:'100%', height:'100%', borderRadius:'50%',
          border:`1.4px solid ${T.gold}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'#fff',
        }}>
          <div style={{
            width:'52%', height:'52%', borderRadius:'50%',
            background:`linear-gradient(135deg, ${T.violetMid}, ${T.gold})`,
          }}/>
        </div>
        <div style={{
          position:'absolute', inset:-7, borderRadius:'50%',
          border:'1px solid rgba(179,136,47,0.22)',
        }}/>
      </div>
      <div style={{
        fontFamily:T.fontDisplay, fontSize:40, fontWeight:700,
        lineHeight:1, marginBottom:6, color:T.white,
        letterSpacing:'0.1em',
      }}>
        <span className="auth-brand-title">VIOFASHION</span>
      </div>
      <div style={{
        fontFamily:T.fontBody, fontSize:10, fontWeight:400,
        letterSpacing:'0.35em', textTransform:'uppercase',
        color:'rgba(28,23,15,0.68)',
      }}>
        Africa's Fashion Platform
      </div>
    </div>
  )
}

// ── Input field ───────────────────────────────────────────────
function Field({ label, type='text', placeholder, value, onChange, autoComplete, half }) {
  return (
    <div style={{ marginBottom:18, flex: half ? '1 1 calc(50% - 10px)' : '1 1 100%' }}>
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
          width:'100%', background:T.fieldBg, border:`1px solid ${T.border}`,
          borderRadius:10, padding:'12px 14px',
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
      <div style={{flex:1, height:1, background:'rgba(39,32,20,0.18)'}}/>
      <span style={{fontFamily:T.fontBody, fontSize:11, color:'rgba(53,43,25,0.55)', letterSpacing:'0.1em'}}>or</span>
      <div style={{flex:1, height:1, background:'rgba(39,32,20,0.18)'}}/>
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
        background: loading ? 'rgba(13,106,51,0.45)' : T.primary,
        border:'none', borderRadius:10,
        padding:'13px 24px',
        color:'#FFFFFF', fontFamily:T.fontBody,
        fontSize:14, fontWeight:600,
        letterSpacing:'0.04em', textTransform:'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow:'0 5px 14px rgba(13,106,51,0.28)',
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
      border:'2px solid rgba(255,255,255,0.42)',
      borderTopColor:'#FFFFFF', borderRadius:'50%',
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
function authErrorMessage(error) {
  const code = error?.code || ''
  const messages = {
    'auth/configuration-not-found': 'Firebase Authentication is not enabled for this project yet. In Firebase Console, go to Authentication > Get started, then enable Email/Password under Sign-in method.',
    'auth/operation-not-allowed': 'This sign-in method is disabled in Firebase. Enable Email/Password or Google in Authentication > Sign-in method.',
    'auth/email-already-in-use': 'An account already exists for this email. Try signing in instead.',
    'auth/account-exists-with-different-credential': 'This email already uses another sign-in method. Try Google sign-in or reset your password.',
    'auth/invalid-credential': 'The email or password is incorrect. If this account was created with Google, use Continue with Google or reset your password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account was found for this email.',
    'auth/wrong-password': 'The password is incorrect.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/popup-blocked': 'Your browser blocked the Google popup. Redirecting to Google sign-in...',
    'auth/cancelled-popup-request': 'Google sign-in was interrupted. Please try again.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished.',
    'auth/unauthorized-domain': 'This Vercel domain is not authorized in Firebase. Add it in Firebase Console > Authentication > Settings > Authorized domains.',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes, then try again or reset your password.',
  }

  return messages[code] || error?.message || 'Authentication failed.'
}

function Login({ onSwitch }) {
  const { signIn, signInWithGoogle, resetPassword } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const submit = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError(''); setSuccess('')
    try { await signIn({ email, password }) }
    catch (e) { setError(authErrorMessage(e)) }
    finally { setLoading(false) }
  }

  const googleSignIn = async () => {
    setGoogleLoading(true); setError(''); setSuccess('')
    try { await signInWithGoogle() }
    catch (e) { setError(authErrorMessage(e)) }
    finally { setGoogleLoading(false) }
  }

  const forgotPassword = async () => {
    if (!email) { setError('Enter your email address first, then tap Forgot password.'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      await resetPassword(email)
      setSuccess(`Password reset email sent to ${email}. Check your inbox and spam folder.`)
    } catch (e) {
      setError(authErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{animation:'vio-fadeup 0.45s ease both'}}>
      <Brand/>
      <div className="kente-mini-strip" />
      <div style={{fontFamily:T.fontDisplay, fontSize:28, fontWeight:300, fontStyle:'italic', color:T.white, marginBottom:4}}>
        Welcome back
      </div>
      <div style={{fontFamily:T.fontBody, fontSize:13, color:T.muted, fontWeight:300, marginBottom:30}}>
        Sign in to continue your fashion journey
      </div>

      <ErrorBox msg={error}/>
      {success && (
        <div style={{
          background:'rgba(14,122,61,0.09)',
          border:'1px solid rgba(14,122,61,0.25)',
          borderRadius:10, padding:'12px 16px',
          marginBottom:20, fontFamily:T.fontBody,
          fontSize:13, color:T.success,
          animation:'vio-fadein 0.3s ease',
        }}>
          {success}
        </div>
      )}

      <Field label="Email Address" type="email" placeholder="you@example.com"
        value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/>

      <Field label="Password" type="password" placeholder="Your password"
        value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/>

      <div style={{textAlign:'right', marginTop:-8, marginBottom:22}}>
        <span className="vio-link" onClick={forgotPassword} style={{fontFamily:T.fontBody, fontSize:12, color:T.muted, cursor:'pointer'}}>
          Forgot password?
        </span>
      </div>

      <PrimaryBtn onClick={submit} loading={loading}>Sign In</PrimaryBtn>

      <Divider/>

      <button className="vio-google-btn" onClick={googleSignIn} disabled={googleLoading} style={{
        width:'100%', background:'#FFFFFF',
        border:`1px solid ${T.border}`, borderRadius:10,
        padding:'13px 24px', color:T.white,
        fontFamily:T.fontBody, fontSize:14, fontWeight:500,
        cursor: googleLoading ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:12,
        opacity: googleLoading ? 0.65 : 1,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? 'Opening Google...' : 'Continue with Google'}
      </button>

      <div style={{textAlign:'center', marginTop:28, fontFamily:T.fontBody, fontSize:13, color:T.muted, fontWeight:300}}>
        New to VioFashion?{' '}
        <span className="vio-link" onClick={onSwitch}
          style={{color:T.gold, cursor:'pointer', fontWeight:600}}>
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
    } catch(e) { setError(authErrorMessage(e)) }
    finally { setLoading(false) }
  }

  if (done) return (
    <div style={{textAlign:'center', animation:'vio-fadeup 0.5s ease both', padding:'20px 0'}}>
      <div style={{fontSize:52, marginBottom:16, color:T.gold}}>✦</div>
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
      <div className="kente-mini-strip" />
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
                background: form.role===r.value ? 'rgba(120,86,204,0.16)' : '#FFFFFF',
                border:`1px solid ${form.role===r.value ? T.violet : T.border}`,
                borderRadius:10, padding:'9px 14px',
                display:'flex', alignItems:'center', gap:6,
              }}
            >
              <span style={{fontSize:14}}>{r.emoji}</span>
              <span style={{
                fontFamily:T.fontBody, fontSize:12, fontWeight:500,
                color: form.role===r.value ? T.violet : T.muted,
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
          style={{color:T.gold, cursor:'pointer', fontWeight:600}}>
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
        width:'100%', maxWidth:380,
        margin:'0 auto', padding:'0 16px',
        maxHeight:'100vh', overflowY:'auto',
        scrollbarWidth:'none',
      }}>
        <div className="auth-paper" style={{
          padding: mode==='signup' ? '24px 20px 22px' : '24px 20px 24px',
          margin:'20px 0',
          position:'relative',
          overflow:'hidden',
        }}>
          {mode==='login'
            ? <Login  onSwitch={() => setMode('signup')}/>
            : <Signup onSwitch={() => setMode('login')}/>
          }
        </div>

        <div style={{
          textAlign:'center', paddingBottom:20,
          fontFamily:T.fontBody, fontSize:11,
          color:'rgba(53,43,25,0.34)', letterSpacing:'0.05em',
        }}>
          © 2026 VioFashion · All rights reserved
        </div>
      </div>
    </div>
  )
}
