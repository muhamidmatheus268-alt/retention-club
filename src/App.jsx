import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AdminCalendar from './pages/AdminCalendar'
import ClientCalendar from './pages/ClientCalendar'
import Diagnostico from './pages/Diagnostico'
import Automacoes from './pages/Automacoes'
import Relatorios from './pages/Relatorios'
import Projecao from './pages/Projecao'
import ControleBase from './pages/ControleBase'
import Acompanhamento from './pages/Acompanhamento'
import CentralContas from './pages/CentralContas'
import Pesquisas from './pages/Pesquisas'

function RootRedirect() {
  const { session, loading } = useAuth()
  if (loading) return null
  return <Navigate to={session ? '/admin' : '/login'} replace />
}

function P({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<P><AdminDashboard /></P>} />
          <Route path="/admin/calendar/:slug"       element={<P><AdminCalendar /></P>} />
          <Route path="/admin/diagnostico/:slug"    element={<P><Diagnostico /></P>} />
          <Route path="/admin/automacoes/:slug"     element={<P><Automacoes /></P>} />
          <Route path="/admin/relatorios/:slug"     element={<P><Relatorios /></P>} />
          <Route path="/admin/projecao/:slug"       element={<P><Projecao /></P>} />
          <Route path="/admin/base/:slug"           element={<P><ControleBase /></P>} />
          <Route path="/admin/acompanhamento/:slug" element={<P><Acompanhamento /></P>} />
          <Route path="/admin/contas/:slug"         element={<P><CentralContas /></P>} />
          <Route path="/admin/pesquisas/:slug"      element={<P><Pesquisas /></P>} />
          <Route path="/calendar/:slug" element={<ClientCalendar />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
