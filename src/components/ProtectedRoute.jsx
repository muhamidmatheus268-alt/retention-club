import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0c0c10' }}>
      <div className="flex flex-col items-center gap-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
          style={{ backgroundColor: '#E8642A' }}>R</span>
        <p className="text-[#555568] text-sm">Carregando…</p>
      </div>
    </div>
  )
}

/**
 * ProtectedRoute — requires auth + optional role check
 * @param {string[]} roles  — if provided, user must have one of these roles
 *                            if omitted, just needs to be logged in
 */
export default function ProtectedRoute({ children, roles }) {
  const { session, loading, role, profile } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />

  // If role-gating is active
  if (roles && roles.length > 0) {
    if (!roles.includes(role)) {
      if (role === 'cliente') return <Navigate to="/cliente" replace />
      // No role = no profile = redirect to login only if we're sure loading is done
      return <Navigate to="/login" replace />
    }
  }

  return children
}
