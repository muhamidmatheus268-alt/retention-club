import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]           = useState(undefined) // undefined = still loading
  const [user, setUser]                 = useState(null)
  const [profile, setProfile]           = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); setProfileLoading(false); return }
    setProfileLoading(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*, clients(id, name, slug, brand_color, brand_logo)')
        .eq('user_id', userId)
        .single()
      setProfile(data || null)
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    // onAuthStateChange fires for the initial session too — use only this to avoid double fetch
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      fetchProfile(session?.user?.id)
    })

    // Kick off initial session check in case onAuthStateChange is slow
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(s => {
        // only update if still undefined (i.e. onAuthStateChange hasn't fired yet)
        if (s === undefined) {
          setUser(session?.user ?? null)
          fetchProfile(session?.user?.id)
          return session
        }
        return s
      })
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  const role = profile?.role || null

  // loading = still checking session OR (session exists but profile not yet fetched)
  const loading = session === undefined || (!!session && profileLoading && !profile)

  const value = {
    session,
    user,
    profile,
    role,
    loading,
    signIn,
    signOut,
    refreshProfile: () => fetchProfile(user?.id),
    // helpers
    isAdmin:        role === 'admin',
    isAnalista:     role === 'analista',
    isCliente:      role === 'cliente',
    canAccessAdmin: role === 'admin' || role === 'analista',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
