import AppLayout from '../layouts/AppLayout'
import { useClient } from '../contexts/ClientContext'
import CalendarView from '../components/CalendarView'

function CalendarContent() {
  const { client, brandColor, brandFont } = useClient()
  if (!client) return <div className="flex items-center justify-center h-full"><p className="text-[#555568] text-sm">Carregando…</p></div>
  return <CalendarView clientId={client.id} isAdmin={true} brandColor={brandColor} brandFont={brandFont} />
}

export default function AdminCalendar() {
  return <AppLayout module="calendar" fullHeight><CalendarContent /></AppLayout>
}
