import { AsciiAdam } from '../AsciiAdam'

// ?t=6.5 freezes a single frame (handy for screenshots)
export function AsciiPage() {
  const q = new URLSearchParams(location.search)
  const t = q.has('t') ? Number(q.get('t')) : undefined
  return (
    <div className="stage">
      <AsciiAdam time={t} />
    </div>
  )
}
