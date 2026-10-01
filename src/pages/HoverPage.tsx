import '../hover/hover.css'
import type { ReactNode } from 'react'
import { ArrowLink, CircleButton, PillButton, RingCursor, RollLink, RollNav, SplitButton } from '../hover'

const Row = ({ bg, children }: { bg: string; children: ReactNode }) => (
  <div style={{ background: bg, padding: '3rem 2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
    {children}
  </div>
)

export function HoverPage() {
  return (
    <div className="hover-page">
      <Row bg="#efded9">
        <PillButton href="#/hover" look="fill" tone="light">Enter</PillButton>
        <SplitButton>Enter without audio</SplitButton>
      </Row>
      <Row bg="#c9b2ad">
        <RollNav>
          <RollLink href="#/hover" label="Index" />
          <RollLink href="#/hover" label="Projects" hoverOffset="0.1rem" />
          <RollLink href="#/hover" label="Contact" />
        </RollNav>
        <CircleButton label="Toggle menu" />
      </Row>
      <Row bg="#8f7f86">
        <PillButton href="#/hover" look="border" tone="light" icon={null}>Our 2025 Wrapped</PillButton>
      </Row>
      <Row bg="#f2ece9">
        <PillButton href="#/hover" look="fill" tone="dark">View work</PillButton>
        <PillButton href="#/hover" look="border" tone="dark" icon={null}>Brand</PillButton>
        <ArrowLink href="#/hover" large style={{ fontSize: '2rem' }}>hello@example.com</ArrowLink>
      </Row>
      <RingCursor />
    </div>
  )
}
