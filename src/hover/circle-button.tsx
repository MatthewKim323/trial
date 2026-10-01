"use client"

/**
 * Round icon button (menus, toggles). Hover spins the icon half a turn and
 * gives the disc one soft pulse; leaving spins it back. Pressing squeezes
 * the disc and lets it spring back.
 */
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react"
import { ease, sampledKeyframes, Timeline, timelineKeyframes } from "./ease"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** accessible name; the button itself only shows the icon */
  label: string
  icon?: ReactNode
  onHoverCue?: () => void
}

/** two dots */
export const DotsIcon = () => (
  <svg viewBox="0 0 14 5" width="0.8rem" height="0.6rem" fill="none" aria-hidden="true" style={{ width: "0.8rem", height: "0.6rem" }}>
    <circle cx="2.4" cy="2.4" r="2.4" fill="currentColor" />
    <circle cx="11.6" cy="2.4" r="2.4" fill="currentColor" />
  </svg>
)

const SPIN = 0.5

function currentScale(el: HTMLElement) {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
  return Math.hypot(m.a, m.b) || 1
}

export function CircleButton({ label, icon = <DotsIcon />, onHoverCue, onClick, className, ...rest }: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const spin = useRef<Timeline | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const tl = new Timeline().add(
      el.querySelector(".hk-circle__icon"),
      timelineKeyframes("transform", [{ at: 0, dur: SPIN, from: "rotate(0deg)", to: "rotate(180deg)", ease: ease.expoInOut }], SPIN),
      SPIN,
    )
    spin.current = tl
    return () => tl.cancel()
  }, [])

  const disc = () => ref.current?.querySelector<HTMLElement>(".hk-circle__disc") ?? null

  const enter = () => {
    spin.current?.play()
    onHoverCue?.()
    const d = disc()
    if (!d) return
    // swell for a quarter second, overtaken at 0.15s by a quarter-second settle
    const s0 = currentScale(d)
    const peak = s0 + (1.15 - s0) * (0.15 / 0.25)
    d.getAnimations().forEach((a) => a.cancel())
    d.animate(
      sampledKeyframes((t) => ({ transform: `scale(${t < 0.15 ? s0 + (peak - s0) * (t / 0.15) : peak + (1 - peak) * ((t - 0.15) / 0.25)})` }), 0.4),
      { duration: 400, fill: "forwards" },
    )
  }
  const leave = () => spin.current?.reverse()

  const press = (e: React.MouseEvent<HTMLButtonElement>) => {
    const d = disc()
    if (d) {
      d.getAnimations().forEach((a) => a.cancel())
      d.animate([{ transform: "scale(1)" }, { transform: "scale(0.9)", offset: 0.5 }, { transform: "scale(1)" }], { duration: 200, easing: "linear" })
    }
    onClick?.(e)
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={`hk-circle${className ? " " + className : ""}`}
      data-cursor="hide"
      onMouseEnter={enter}
      onMouseLeave={leave}
      onClick={press}
      {...rest}
    >
      <span className="hk-circle__disc" />
      <span className="hk-circle__icon">{icon}</span>
    </button>
  )
}
