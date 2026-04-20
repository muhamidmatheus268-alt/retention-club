import { useEffect } from 'react'

/* Updates document title. Format: "section · Cliente · Retention Club" */
export function useDocumentTitle(section, clientName) {
  useEffect(() => {
    const parts = []
    if (section) parts.push(section)
    if (clientName) parts.push(clientName)
    parts.push('Retention Club')
    const prev = document.title
    document.title = parts.join(' · ')
    return () => { document.title = prev }
  }, [section, clientName])
}
