"use client"

/**
 * Pill button with a rolling label.
 *
 * Hover: the label drops out downward while a copy (in the hover colour)
 * drops in from above, the trailing icon slides out right while its copy
 * slides in from the left. Two looks:
 *   - "fill": the hover colour wipes up through the pill from below
 *   - "border": a second outline in the hover colour traces itself around
 *     the pill, clockwise from top center
 * Leaving plays the same timeline backwards from wherever it got to.
 *
 * Sizes are in rem; colours come from the theme classes in hover.css (or
 * override the --hk-* custom properties on the element).
 */
import { useEffect, useId, useRef, type AnchorHTMLAttributes, type ReactNode } from "react"
import { ease, sampledKeyframes, Timeline, timelineKeyframes } from "./ease"

export type PillLook = "fill" | "border"
export type PillTone = "light" | "dark"

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  look?: PillLook
  tone?: PillTone
  /** trailing icon; pass null for a text-only pill */
  icon?: ReactNode | null
  /** fires shortly after the hover starts (a good spot for a hover sound) */
  onHoverCue?: () => void
  children: ReactNode
}

/** a small down-right arrow */
export const ArrowIcon = () => (
  <svg viewBox="0 0 10 12" aria-hidden="true">
    <path d="M1.4 1.2 8.2 8V2.6h1.5v8H1.7V9.1h5.4L.3 2.3z" />
  </svg>
)

const ROLL = 0.8 // the label roll and fill wipe, seconds
const TRACE = 0.83 // the border trace runs on its own clock

// the border trace, as the four masking strips' scales over time (seconds)
function traceAt(t: number) {
  const clamp = (x: number) => Math.min(1, Math.max(0, x))
  const seg = (a: number, d: number, f: (x: number) => number) => f(clamp((t - a) / d))
  // right edge: sweeps from top center to the right end, then runs down the right side
  const rightX = seg(0, 0.25, ease.expoIn)
  const rightY = t <= 0 ? 0 : 0.18 + 0.82 * seg(0.25, 0.12, ease.linear)
  // bottom edge: right to left
  const bottomX = seg(0.36, 0.12, ease.linear)
  // left side: bottom up, then along the top back to center
  const leftY = seg(0.48, 0.1, ease.linear)
  const leftX = 15 / 51 + (1 - 15 / 51) * seg(0.58, 0.25, ease.expoOut)
  return { rightX, rightY, bottomX, leftY, leftX: leftY > 0 ? leftX : 0 }
}

export function PillButton({ look = "fill", tone = "light", icon = <ArrowIcon />, onHoverCue, children, className, ...rest }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)
  const uid = useId().replace(/:/g, "")
  const tlRef = useRef<Timeline | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const q = <T extends Element>(s: string) => el.querySelector<T>(s)
    const tl = new Timeline()
    const roll = (prop: string, from: string, to: string, dur: number) => timelineKeyframes(prop, [{ at: 0, dur, from, to, ease: ease.expoInOut }], ROLL)

    tl.add(q(".hk-pill__content--rest"), roll("transform", "translateY(0%)", "translateY(250%)", 0.6), ROLL)
    tl.add(q(".hk-pill__content--hover"), roll("transform", "translateY(-120%)", "translateY(0%)", 0.8), ROLL)
    if (icon !== null) {
      tl.add(q(".hk-pill__content--rest .hk-pill__icon"), roll("transform", "translateX(0%)", "translateX(200%)", 0.6), ROLL)
      tl.add(q(".hk-pill__content--hover .hk-pill__icon"), roll("transform", "translateX(-1.8rem)", "translateX(0rem)", 0.8), ROLL)
    }
    if (look === "fill")
      el.querySelectorAll(".hk-pill__wipe").forEach((w) => tl.add(w, roll("transform", "translateY(120%)", "translateY(0%)", 0.6), ROLL))
    if (look === "border") {
      const frames = (pick: (s: ReturnType<typeof traceAt>) => string) => sampledKeyframes((t) => ({ transform: pick(traceAt(t)) }), TRACE)
      el.querySelectorAll(".hk-pill__strip--right").forEach((s) => tl.add(s, frames((v) => `scale(${v.rightX}, ${v.rightY})`), TRACE))
      el.querySelectorAll(".hk-pill__strip--bottom").forEach((s) => tl.add(s, frames((v) => `scale(${v.bottomX}, 1)`), TRACE))
      el.querySelectorAll(".hk-pill__strip--left").forEach((s) => tl.add(s, frames((v) => `scale(${v.leftX}, ${v.leftY})`), TRACE))
    }
    tlRef.current = tl
    return () => tl.cancel()
  }, [look, icon])

  const cueTimer = useRef(0)
  const enter = () => {
    tlRef.current?.play()
    if (onHoverCue) cueTimer.current = window.setTimeout(onHoverCue, 100)
  }
  const leave = () => {
    clearTimeout(cueTimer.current)
    tlRef.current?.reverse()
  }

  const shape = { x: 1, y: 1, rx: "1.3em", ry: "3em", className: "hk-pill__shape" }
  const strips = (fill: string) => (
    <>
      <rect className="hk-pill__strip hk-pill__strip--right" x="50%" y="-6" width="50%" height="100%" fill={fill} />
      <rect className="hk-pill__strip hk-pill__strip--bottom" x="0" y="84%" width="100%" height="25%" fill={fill} />
      <rect className="hk-pill__strip hk-pill__strip--left" x="0" y="-10%" width="51%" height="100%" fill={fill} />
    </>
  )

  return (
    <a
      ref={ref}
      className={`hk-pill hk-pill--${look} hk-pill--${tone}${className ? " " + className : ""}`}
      data-cursor="hide"
      onMouseEnter={enter}
      onMouseLeave={leave}
      {...rest}
    >
      <svg className="hk-pill__svg" aria-hidden="true">
        <defs>
          {/* the hover colour shows where the wipe has reached; the base colour everywhere else */}
          <mask id={`${uid}-in`}>
            <rect width="100%" height="100%" fill="#000" />
            <rect className="hk-pill__wipe" width="100%" height="100%" fill="#fff" stroke="#fff" strokeWidth={2} />
          </mask>
          <mask id={`${uid}-out`}>
            <rect width="100%" height="100%" fill="#fff" />
            <rect className="hk-pill__wipe" width="100%" height="100%" fill="#000" stroke="#000" strokeWidth={2} />
          </mask>
          {look === "border" && (
            <>
              <mask id={`${uid}-base`}>
                <rect width="100%" height="100%" fill="#fff" />
                {strips("#000")}
              </mask>
              <mask id={`${uid}-trace`}>
                <rect width="100%" height="100%" fill="#000" />
                {strips("#fff")}
              </mask>
            </>
          )}
        </defs>
        {look === "fill" && <rect {...shape} className="hk-pill__shape hk-pill__bg" mask={`url(#${uid}-out)`} />}
        {look === "border" && (
          <>
            <rect {...shape} className="hk-pill__shape hk-pill__border" mask={`url(#${uid}-base)`} />
            <rect {...shape} className="hk-pill__shape hk-pill__border-hover" mask={`url(#${uid}-trace)`} />
          </>
        )}
        <rect {...shape} className="hk-pill__shape hk-pill__fill" mask={`url(#${uid}-in)`} />
      </svg>
      <span className="hk-pill__inner">
        <span className="hk-pill__content hk-pill__content--rest">
          <span className="hk-pill__text">{children}</span>
          {icon !== null && <span className="hk-pill__icon">{icon}</span>}
        </span>
        <span className="hk-pill__content hk-pill__content--hover" aria-hidden="true">
          <span className="hk-pill__text">{children}</span>
          {icon !== null && <span className="hk-pill__icon">{icon}</span>}
        </span>
      </span>
    </a>
  )
}
