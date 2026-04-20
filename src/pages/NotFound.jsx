import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: '#0c0c10' }}>
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-3xl mb-6"
          style={{ backgroundColor: '#E8642A22' }}>
          🚧
        </div>
        <h1 className="text-white font-bold text-2xl mb-2">Página não encontrada</h1>
        <p className="text-sm mb-8" style={{ color: '#8b8ba0' }}>
          O endereço acessado não existe ou foi movido. Use o menu ou ⌘K para buscar.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link to="/admin"
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#E8642A' }}>
            Ir para painel
          </Link>
          <kbd className="text-xs font-mono px-2 py-1 rounded-lg border"
            style={{ borderColor: '#2a2a38', color: '#555568' }}>
            ⌘K
          </kbd>
        </div>
      </div>
    </div>
  )
}
