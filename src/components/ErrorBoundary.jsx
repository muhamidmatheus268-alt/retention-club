import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const msg = this.state.error?.message || 'Erro inesperado'

    return (
      <div className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: '#0c0c10' }}>
        <div className="w-full max-w-md rounded-2xl border p-8 text-center modal-panel"
          style={{ backgroundColor: '#111118', borderColor: '#1e1e2a' }}>
          <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-xl"
            style={{ backgroundColor: '#ef444415', color: '#f87171' }}>
            ⚠
          </div>
          <h1 className="text-white font-semibold text-lg mb-2">
            Algo deu errado
          </h1>
          <p className="text-sm mb-1" style={{ color: '#6b6b80' }}>
            Uma parte da aplicação encontrou um erro.
          </p>
          <p className="text-[11px] font-mono mb-6 px-3 py-2 rounded-lg text-left overflow-auto max-h-24"
            style={{ backgroundColor: '#0a0a0f', border: '1px solid #1e1e2a', color: '#8b8ba0' }}>
            {msg}
          </p>

          <div className="flex gap-2 justify-center">
            <button onClick={this.reset}
              className="px-4 py-2 rounded-lg text-sm border transition-colors"
              style={{ borderColor: '#2a2a38', color: '#8b8ba0' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3a3a48' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#8b8ba0'; e.currentTarget.style.borderColor = '#2a2a38' }}>
              Tentar novamente
            </button>
            <button onClick={() => { this.reset(); window.location.href = '/admin' }}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#E8642A' }}>
              Voltar ao painel
            </button>
          </div>
        </div>
      </div>
    )
  }
}
