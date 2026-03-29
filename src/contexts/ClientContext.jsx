import { createContext, useContext, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ClientContext = createContext(null)

export function useClient() {
  return useContext(ClientContext)
}

export function ClientProvider({ children }) {
  const { slug } = useParams()
  const [client, setClient]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) { setClient(null); setLoading(false); return }
    setLoading(true)
    supabase.from('clients').select('*').eq('slug', slug).single()
      .then(({ data }) => { setClient(data || null); setLoading(false) })
  }, [slug])

  const brandColor = client?.brand_color || '#E8642A'
  const brandFont  = client?.brand_font  || null

  return (
    <ClientContext.Provider value={{ client, loading, brandColor, brandFont }}>
      {children}
    </ClientContext.Provider>
  )
}
