"use client"

/**
 * Nav link whose letters roll. On hover each letter of the label slides up
 * and out, one after another, while the same word set in an italic serif
 * rolls up into its place. Leaving rolls everything back from wherever it is.
 * Pair with <RingCursor/>: it carries data-cursor="navItem" so the ring
 * stretches into a pill behind it.
 */
import { useRef, type AnchorHTMLAttributes } from "react"
import { cssEase, ease } from "./ease"

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  label: string
  /** nudge the italic copy (some serif italics overhang their box) */
  hoverOffset?: string
  onHoverCue?: () => void
}

const DUR = 500 // ms per letter
const STAGGER = 14 // ms between letters

function currentY(el: HTMLElement) {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
  const h = el.getBoundingClientRect().height || 1
  return (m.f / h) * 100 // percent of own height
}

function roll(chars: HTMLElement[], to: number, delay: number) {
  const easing = cssEase(ease.circInOut)
  chars.forEach((c, i) => {
    const from = currentY(c)
    c.getAnimations().forEach((a) => a.cancel())
    c.style.transform = `translateY(${to}%)`
    c.animate([{ transform: `translateY(${from}%)` }, { transform: `translateY(${to}%)` }], {
      duration: DUR,
      delay: delay + i * STAGGER,
      easing,
      fill: "backwards",
    })
  })
}

const split = (s: string) =>
  Array.from(s).map((ch, i) => (
    <span key={i} className="hk-roll__char">
      {ch}
    </span>
  ))

export function RollLink({ label, hoverOffset, onHoverCue, className, ...rest }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)
  const chars = (which: "rest" | "hover") =>
    Array.from(ref.current?.querySelectorAll<HTMLElement>(`.hk-roll__text--${which} .hk-roll__char`) ?? [])

  const enter = () => {
    onHoverCue?.()
    roll(chars("rest"), -120, 0)
    roll(chars("hover"), 0, STAGGER)
  }
  const leave = () => {
    roll(chars("rest"), 0, 0)
    roll(chars("hover"), 150, STAGGER)
  }

  return (
    <a
      ref={ref}
      className={`hk-roll${className ? " " + className : ""}`}
      data-cursor="navItem"
      aria-label={label}
      onMouseEnter={enter}
      onMouseLeave={leave}
      {...rest}
    >
      <span className="hk-roll__wrap" style={{ display: "block" }}>
        <span className="hk-roll__text hk-roll__text--rest" style={{ display: "block" }}>
          {split(label)}
        </span>
        <span className="hk-roll__text hk-roll__text--hover" style={{ display: "block", paddingLeft: hoverOffset }} aria-hidden="true">
          {split(label)}
        </span>
      </span>
    </a>
  )
}

/** Wrap a row of RollLinks so the ring cursor holds still over the row. */
export function RollNav({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <nav className={className} data-cursor="navWrapper" style={{ overflow: "hidden", display: "flex" }}>
      {children}
    </nav>
  )
}
