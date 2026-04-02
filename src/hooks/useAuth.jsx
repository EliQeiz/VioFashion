// src/hooks/useAuth.jsx
import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Fetch profile from DB ──────────────────────────────────
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, profile_services(service)')
        .eq('id', userId)
        .single()
      console.log('🟣 fetchProfile:', { userId, data, error });
      if (error) {
        console.error('❌ fetchProfile error:', error)
        setProfile(null)
        return
      }
      setProfile(data)
    } catch (err) {
      setProfile(null)
      console.error('💥 fetchProfile exception:', err)
    }
  }, [])

  // ── Listen to auth state changes ──────────────────────────
  useEffect(() => {
    // Safety timeout — stop loading after 3s even if Supabase hangs
    const timeout = setTimeout(() => {
      console.warn('⚠️ Supabase auth timeout — forcing loading to false')
      setLoading(false)
    }, 3000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(timeout)
        console.log('🔵 onAuthStateChange fired:', session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    // On initial load, check for existing session
    supabase.auth.getSession().then(({ data }) => {
      const session = data?.session
      console.log('🔷 supabase.auth.getSession checked:', session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

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
        // Optionally insert/update profile if not auto-handled by triggers
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .update({ role, full_name: fullName, username })
          .eq('id', data.user.id)
          .select()

        if (profileError) {
          console.error('❌ [SIGNUP] Profile update error:', profileError.message)
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

  // ── UPDATE PROFILE ───��────────────────────────────────────
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

  // ——— Safe, memoized profile refresh ———
  const refreshProfile = useCallback(() => {
    if (!user) return
    return fetchProfile(user.id)
  }, [user, fetchProfile])

  // ——— Diagnostic: log all state changes ———
  useEffect(() => {
    console.log('Auth State Changed:', { user, profile, loading })
  }, [user, profile, loading])

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
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
