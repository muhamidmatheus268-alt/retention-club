import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AdminCalendar from './pages/AdminCalendar'
import ClientCalendar from './pages/ClientCalendar'
import ClientPortal from './pages/ClientPortal'
import Diagnostico from './pages/Diagnostico'
import Automacoes from './pages/Automacoes'
import Relatorios from './pages/Relatorios'
import Projecao from './pages/Projecao'
import ControleBase from './pages/ControleBase'
import Acompanhamento from './pages/Acompanhamento'
import CentralContas from './pages/CentralContas'
import Pesquisas from './pages/Pesquisas'
import ResetPassword from './pages/ResetPassword'
import QuizPage from './pages/QuizPage'
import QuizRespostas from './pages/QuizRespostas'
import Cerebro from './pages/Cerebro'
import GestaoUsuarios from './pages/GestaoUsuarios'
import BancoImagens from './pages/BancoImagens'
import ATA from './pages/ATA'
import CommandPalette from './components/CommandPalette'

/* Smart root redirect based on role */
function RootRedirect() {
  const { session, loading, role } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (role === 'cliente') return <Navigate to="/cliente" replace />
  return <Navigate to="/admin" replace />
}

/* Command palette only for authenticated admin/analista users */
function GlobalCommandPalette() {
  const { session, role } = useAuth()
  if (!session) return null
  if (role !== 'admin' && role !== 'analista') return null
  return <CommandPalette />
}

/* Admin/Analista only guard */
function A({ children }) {
  return (
    <ProtectedRoute roles={['admin', 'analista']}>
      {children}
    </ProtectedRoute>
  )
}

/* Admin only guard */
function AdminOnly({ children }) {
  return (
    <ProtectedRoute roles={['admin']}>
      {children}
    </ProtectedRoute>
  )
}

/* Cliente only guard */
function C({ children }) {
  return (
    <ProtectedRoute roles={['cliente']}>
      {children}
    </ProtectedRoute>
  )
}

/* Persistent shell — mounts ONCE, only Outlet content swaps on navigation */
function ModuleShell() {
  const { pathname } = useLocation()
  const module = pathname.split('/')[2] || ''
  const fullHeight = module === 'calendar'
  return (
    <AppLayout module={module} fullHeight={fullHeight}>
      <Outlet />
    </AppLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalCommandPalette />
        <Routes>
          {/* Public */}
          <Route path="/"                element={<RootRedirect />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/calendar/:slug"  element={<ClientCalendar />} />
          <Route path="/quiz"            element={<QuizPage />} />

          {/* Cliente portal */}
          <Route path="/cliente" element={<C><ClientPortal /></C>} />

          {/* Admin — standalone pages */}
          <Route path="/admin"                    element={<A><AdminDashboard /></A>} />
          <Route path="/admin/quiz-respostas"     element={<A><QuizRespostas /></A>} />
          <Route path="/admin/usuarios"           element={<AdminOnly><GestaoUsuarios /></AdminOnly>} />

          {/* Admin — persistent layout (sidebar never remounts on navigation) */}
          <Route element={<A><ModuleShell /></A>}>
            <Route path="/admin/calendar/:slug"       element={<AdminCalendar />} />
            <Route path="/admin/diagnostico/:slug"    element={<Diagnostico />} />
            <Route path="/admin/automacoes/:slug"     element={<Automacoes />} />
            <Route path="/admin/relatorios/:slug"     element={<Relatorios />} />
            <Route path="/admin/projecao/:slug"       element={<Projecao />} />
            <Route path="/admin/base/:slug"           element={<ControleBase />} />
            <Route path="/admin/acompanhamento/:slug" element={<Acompanhamento />} />
            <Route path="/admin/contas/:slug"         element={<CentralContas />} />
            <Route path="/admin/pesquisas/:slug"      element={<Pesquisas />} />
            <Route path="/admin/cerebro/:slug"        element={<Cerebro />} />
            <Route path="/admin/imagens/:slug"        element={<BancoImagens />} />
            <Route path="/admin/ata/:slug"            element={<ATA />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
