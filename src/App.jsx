// src/App.jsx
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import AuthScreens from './AuthScreens'
import VioFashion from './VioFashion'

function AppContent() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#060409',flexDirection:'column',gap:16}}>
        <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:34,fontWeight:700,letterSpacing:'0.1em',background:'linear-gradient(135deg,#F8F5FF 20%,#C9A84C 60%,#A78BFA 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
          VIOFASHION
        </div>
        <div style={{color:'rgba(248,245,255,0.35)',fontSize:10,letterSpacing:'0.28em',textTransform:'uppercase',fontFamily:"'Jost',system-ui,sans-serif"}}>
          Loading…
        </div>
        <div style={{width:28,height:28,border:'2px solid rgba(109,40,217,0.2)',borderTopColor:'#6D28D9',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    )
  }
  return user ? <VioFashion /> : <AuthScreens />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}