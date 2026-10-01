import { useEffect, useState } from 'react'
import { AsciiPage } from './pages/AsciiPage'
import { WipePage } from './pages/WipePage'
import { HoverPage } from './pages/HoverPage'

const PAGES = [
  { hash: '#/ascii', label: 'ASCII', el: <AsciiPage /> },
  { hash: '#/wipe', label: 'Seam wipe', el: <WipePage /> },
  { hash: '#/hover', label: 'Hover set', el: <HoverPage /> },
]

const current = () => PAGES.find((p) => p.hash === location.hash) ?? PAGES[0]

export default function App() {
  const [page, setPage] = useState(current)
  useEffect(() => {
    const on = () => setPage(current())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <>
      <nav className="nav">
        {PAGES.map((p) => (
          <a key={p.hash} href={p.hash} className={p === page ? 'is-on' : undefined}>
            {p.label}
          </a>
        ))}
      </nav>
      <div key={page.hash}>{page.el}</div>
    </>
  )
}
