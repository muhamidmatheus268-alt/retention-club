import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function RouteProgress() {
  const location = useLocation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible]   = useState(false)

  useEffect(() => {
    setProgress(10); setVisible(true)
    const t1 = setTimeout(() => setProgress(50), 80)
    const t2 = setTimeout(() => setProgress(85), 200)
    const t3 = setTimeout(() => setProgress(100), 350)
    const t4 = setTimeout(() => { setVisible(false); setProgress(0) }, 600)
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [location.pathname])

  return (
    <div className="fixed top-0 left-0 right-0 z-[300] pointer-events-none"
      style={{ height: 2, opacity: visible ? 1 : 0, transition: 'opacity 200ms' }}>
      <div style={{
        height: '100%',
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #E8642A, #f59e0b)',
        boxShadow: '0 0 10px #E8642A80',
        transition: 'width 220ms ease',
      }} />
    </div>
  )
}
