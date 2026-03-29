import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [copied, setCopied] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setClients(data || [])
    setLoading(false)
  }

  async function handleAddClient(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setError('')
    setAdding(true)
    const slug = generateSlug(newName.trim())
    const { error } = await supabase
      .from('clients')
      .insert({ name: newName.trim(), slug })
    if (error) {
      setError(error.message.includes('duplicate') ? 'Já existe um cliente com esse nome/slug.' : error.message)
    } else {
      setNewName('')
      await fetchClients()
    }
    setAdding(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza que deseja excluir este cliente e todos os seus dados?')) return
    setDeletingId(id)
    // Delete calendar entries first
    await supabase.from('calendar_entries').delete().eq('client_id', id)
    await supabase.from('clients').delete().eq('id', id)
    setClients((prev) => prev.filter((c) => c.id !== id))
    setDeletingId(null)
  }

  function handleCopy(slug) {
    const url = `${window.location.origin}/calendar/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-white tracking-tight">
          <span style={{ color: '#E8642A' }}>→</span> Retention Club
        </span>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Clientes</h1>
          <p className="text-gray-500 text-sm">Gerencie os clientes e seus calendários.</p>
        </div>

        {/* Add Client Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold text-base mb-4">Adicionar novo cliente</h2>
          <form onSubmit={handleAddClient} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do cliente"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#E8642A] transition-colors"
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              style={{ backgroundColor: '#E8642A' }}
              className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </form>
          {error && (
            <p className="text-red-400 text-xs mt-2">{error}</p>
          )}
          {newName.trim() && (
            <p className="text-gray-500 text-xs mt-2">
              Slug: <span className="text-gray-400">{generateSlug(newName.trim())}</span>
            </p>
          )}
        </div>

        {/* Clients List */}
        {loading ? (
          <div className="text-gray-500 text-sm text-center py-12">Carregando clientes...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">{client.name}</p>
                  <p className="text-gray-600 text-xs mt-0.5 truncate">
                    retentionclub.com.br/calendar/{client.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(client.slug)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
                  >
                    {copied === client.slug ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <Link
                    to={`/admin/calendar/${client.slug}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                    style={{ backgroundColor: '#E8642A' }}
                  >
                    Editar calendário
                  </Link>
                  <button
                    onClick={() => handleDelete(client.id)}
                    disabled={deletingId === client.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-900 text-red-500 hover:bg-red-950 transition-colors disabled:opacity-50"
                  >
                    {deletingId === client.id ? '...' : 'Excluir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
