import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CalendarView from '../components/CalendarView'

export default function ClientCalendar() {
  const { slug } = useParams()
  const [client, setClient]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchClient() {
      setLoading(true)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('slug', slug)
        .single()
      if (error || !data) setNotFound(true)
      else setClient(data)
      setLoading(false)
    }
    fetchClient()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Calendário não encontrado.</p>
      </div>
    )
  }

  const brandColor = client.brand_color || '#E8642A'
  const brandFont  = client.brand_font  || null
  const brandLogo  = client.brand_logo  || null
  const fontStyle  = brandFont ? { fontFamily: `'${brandFont}', sans-serif` } : {}

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col" style={fontStyle}>

      {/* ── Header ── */}
      <header className="bg-black border-b border-gray-900 px-6 py-4 shrink-0">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">

          {/* Logo or name */}
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={client.name}
              className="h-9 w-auto object-contain"
              style={{ maxWidth: 180 }}
            />
          ) : (
            <span
              className="text-xl font-bold tracking-tight text-white"
              style={brandColor ? { color: brandColor } : {}}
            >
              {client.name}
            </span>
          )}

          {/* Subtle label */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-gray-600 uppercase tracking-widest font-semibold">
              Calendário Editorial
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full hidden sm:block"
              style={{ backgroundColor: brandColor }}
            />
          </div>
        </div>
      </header>

      {/* ── Calendar ── */}
      <div className="flex-1 overflow-auto">
        <CalendarView
          clientId={client.id}
          clientName={client.name}
          isAdmin={false}
          brandColor={brandColor}
          brandFont={brandFont}
        />
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-900 bg-black px-6 py-3 shrink-0">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <p className="text-gray-700 text-xs">
            Powered by{' '}
            <span className="text-gray-600 font-semibold">Retention Club</span>
          </p>
          {brandLogo && (
            <p className="text-gray-700 text-xs hidden sm:block">{client.name}</p>
          )}
        </div>
      </footer>
    </div>
  )
}
