import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await signIn(email, password)

      // Fetch profile to determine redirect — failure here should NOT block login
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single()
        if (profile?.role === 'cliente') { navigate('/cliente'); return }
      } catch { /* no profile yet — fall through to /admin */ }

      navigate('/admin')
    } catch {
      setError('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0c0c10' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-black text-white"
              style={{ backgroundColor: '#E8642A' }}>R</span>
            <span className="text-xl font-bold text-white tracking-tight">Retention Club</span>
          </div>
          <p className="text-[#555568] text-sm">Acesse sua conta</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit}
          className="rounded-2xl border p-8"
          style={{ backgroundColor: '#111118', borderColor: '#1e1e2a', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#f87171' }}>
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: '#444455' }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-all"
              style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
              placeholder="seu@email.com"
              onFocus={e => { e.target.style.borderColor = '#E8642A'; e.target.style.boxShadow = '0 0 0 3px #E8642A18' }}
              onBlur={e => { e.target.style.borderColor = '#2a2a38'; e.target.style.boxShadow = '' }} />
          </div>

          <div className="mb-7">
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: '#444455' }}>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full text-sm rounded-xl px-4 py-3 focus:outline-none transition-all"
              style={{ backgroundColor: '#0c0c10', border: '1px solid #2a2a38', color: '#fff' }}
              placeholder="••••••••"
              onFocus={e => { e.target.style.borderColor = '#E8642A'; e.target.style.boxShadow = '0 0 0 3px #E8642A18' }}
              onBlur={e => { e.target.style.borderColor = '#2a2a38'; e.target.style.boxShadow = '' }} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#E8642A' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-[#333340] text-xs mt-6">
          Retention Club · Sistema interno
        </p>
      </div>
    </div>
  )
}
