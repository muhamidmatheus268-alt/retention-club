import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MODULES = [
  { key: 'calendar',    label: 'Calendário',  path: 'calendar',    icon: '📅' },
  { key: 'diagnostico', label: 'Diagnóstico', path: 'diagnostico', icon: '📊' },
  { key: 'automacoes',  label: 'Automações',  path: 'automacoes',  icon: '⚡' },
  { key: 'relatorios',  label: 'Relatórios',  path: 'relatorios',  icon: '📋' },
  { key: 'projecao',    label: 'Projeção',    path: 'projecao',    icon: '📈' },
]

export default function ClientLayout({ children, module: activeModule, fullHeight = false }) {
  const { slug } = useParams()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [client, setClient]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchClient() {
      setLoading(true)
      const { data, error } = await supabase
        .from('clients').select('*').eq('slug', slug).single()
      if (error || !data) setNotFound(true)
      else setClient(data)
      setLoading(false)
    }
    fetchClient()
  }, [slug])

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Carregando...</p>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">Cliente não encontrado.</p>
      <Link to="/admin" className="text-[#E8642A] text-sm hover:underline">← Voltar ao painel</Link>
    </div>
  )

  const brandColor = client.brand_color || '#E8642A'
  const brandFont  = client.brand_font  || null
  const brandLogo  = client.brand_logo  || null

  return (
    <div className={`bg-gray-950 flex flex-col ${fullHeight ? 'h-screen' : 'min-h-screen'}`}
      style={brandFont ? { fontFamily: `'${brandFont}', sans-serif` } : {}}>

      {/* Top bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-gray-500 hover:text-white text-sm transition-colors">← Painel</Link>
          <span className="text-gray-700">|</span>
          <span className="text-gray-400 text-sm">→ Retention Club</span>
        </div>
        <div className="flex items-center gap-4">
          <a href={`/calendar/${slug}`} target="_blank" rel="noreferrer"
            className="text-xs text-gray-500 hover:text-gray-200 transition-colors">
            Ver visão do cliente ↗
          </a>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="text-gray-600 hover:text-white text-sm transition-colors">
            Sair
          </button>
        </div>
      </header>

      {/* Client bar + module tabs */}
      <div className="shrink-0" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="px-6 pt-3 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandLogo
              ? <img src={brandLogo} alt={client.name} className="h-7 w-auto object-contain" style={{ maxWidth: 120 }} />
              : <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: brandColor }} />
                  <span className="text-white font-semibold text-sm">{client.name}</span>
                </div>
            }
            {brandLogo && <span className="text-gray-600 text-sm font-medium">{client.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: brandColor }} />
            <span className="text-gray-600 text-[10px] font-mono">{brandColor}</span>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-0 px-4 mt-2 overflow-x-auto">
          {MODULES.map(mod => {
            const isActive = activeModule === mod.key
            return (
              <Link
                key={mod.key}
                to={`/admin/${mod.path}/${slug}`}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive ? 'text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
                style={isActive ? { borderBottomColor: brandColor } : {}}
              >
                <span className="text-sm">{mod.icon}</span>
                {mod.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className={fullHeight ? 'flex-1 overflow-auto' : 'flex-1'}>
        {typeof children === 'function'
          ? children({ client, brandColor, brandFont, brandLogo })
          : children}
      </div>
    </div>
  )
}
