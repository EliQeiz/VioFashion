// src/hooks/useAuth.jsx
// ─────────────────────────────────────────────────────────────
//  Central auth hook — handles signup, login, logout,
//  session state, and profile fetching.
//  Usage: const { user, profile, signUp, signIn, signOut } = useAuth()
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Fetch profile from DB ──────────────────────────────────
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, profile_services(service)')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ fetchProfile error:', error)
        return
      }
      setProfile(data)
    } catch (err) {
      console.error('💥 fetchProfile exception:', err)
    }
  }

  // ── Listen to auth state changes ──────────────────────────
  useEffect(() => {
    // Safety timeout — if Supabase doesn't respond in 3s, stop loading
    // and show the login screen anyway
    const timeout = setTimeout(() => {
      console.warn('⚠️ Supabase auth timeout — forcing loading to false')
      setLoading(false)
    }, 3000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(timeout)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  // ── SIGN UP ───────────────────────────────────────────────
  const signUp = async ({ email, password, username, fullName, role = 'customer' }) => {
    try {
      console.log('🔵 [SIGNUP] Starting signup with:', { email, username, fullName, role })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, full_name: fullName, role },
        },
      })

      if (error) {
        console.error('❌ [SIGNUP] Auth error:', error.message)
        throw error
      }

      console.log('✅ [SIGNUP] Auth user created:', data.user?.id)

      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .update({ role, full_name: fullName, username })
          .eq('id', data.user.id)
          .select()

        if (profileError) {
          console.error('❌ [SIGNUP] Profile update error:', profileError.message)
          // Don't throw here — auth succeeded, profile update is secondary
        } else {
          console.log('✅ [SIGNUP] Profile updated:', profileData)
        }
      }

      return data
    } catch (err) {
      console.error('💥 [SIGNUP] Error:', err.message)
      throw err
    }
  }

  // ── SIGN IN ───────────────────────────────────────────────
  const signIn = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('❌ [SIGNIN] Error:', error.message)
        throw error
      }
      console.log('✅ [SIGNIN] Success')
      return data
    } catch (err) {
      console.error('💥 [SIGNIN] Error:', err.message)
      throw err
    }
  }

  // ── SIGN IN WITH GOOGLE ───────────────────────────────────
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (err) {
      console.error('💥 [GOOGLE] Error:', err.message)
      throw err
    }
  }

  // ── SIGN OUT ──────────────────────────────────────────────
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
      console.log('✅ [SIGNOUT] Signed out')
    } catch (err) {
      console.error('💥 [SIGNOUT] Error:', err.message)
      throw err
    }
  }

  // ── UPDATE PROFILE ────────────────────────────────────────
  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      setProfile(data)
      return data
    } catch (err) {
      console.error('💥 [UPDATE_PROFILE] Error:', err.message)
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      refreshProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}
useEffect(() => {
  console.log('Auth/user:', user)
  console.log('Profile:', profile)
  console.log('Loading:', loading)
}, [user, profile, loading])
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
