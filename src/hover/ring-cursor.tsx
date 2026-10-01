"use client"

/**
 * A ring that trails the pointer. It lags behind with a constant catch-up
 * rate, and while it travels it stretches along the direction of motion
 * (faster = longer and thinner, capped). States, read from data-cursor on
 * whatever is hovered:
 *   - "hide":       ring shrinks to a dot-sized ring while over the element
 *   - "navWrapper": the ring stops chasing the pointer inside this area
 *   - "navItem":    the ring flies to the item's center and widens into a
 *                   pill the item's width
 * Pressing anywhere squeezes it. Mount once near the root; it does nothing
 * on touch-only devices.
 */
import { useEffect, useRef } from "react"
import { cssEase, ease, type Ease } from "./ease"

const CATCH_UP = 0.2 // share of the remaining distance covered per 60fps frame
const STRETCH_PER_PX = 1 / 200
const STRETCH_MAX = 0.55
const HIDDEN = 0.35

type Tween = { from: { x: number; y: number }; to: { x: number; y: number }; start: number; dur: number; ease: Ease }

export function RingCursor({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return
    const el = root.current
    if (!el) return
    const wrap = el.querySelector<HTMLElement>(".hk-cursor__wrap")!
    const inner = el.querySelector<HTMLElement>(".hk-cursor__inner")!
    const ring = el.querySelector<HTMLElement>(".hk-cursor__ring")!
    document.documentElement.classList.add("hk-cursor-off")

    const target = { x: -100, y: -100 }
    const pos = { x: 0, y: 0 }
    let follow = true
    let squeeze = true
    let tween: Tween | null = null
    let raf = 0
    let last = performance.now()

    const animate = (node: HTMLElement, keyframes: Keyframe[], ms: number, f: Ease) => {
      node.getAnimations().forEach((a) => a.cancel())
      return node.animate(keyframes, { duration: ms, easing: cssEase(f), fill: "forwards" })
    }
    const scaleOf = (node: HTMLElement) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(node).transform)
      return Math.hypot(m.a, m.b) || 1
    }

    const states: Record<string, { enter?: (t: HTMLElement) => void; leave?: (t: HTMLElement) => void }> = {
      hide: {
        enter: () => animate(wrap, [{ transform: `scale(${scaleOf(wrap)})` }, { transform: `scale(${HIDDEN})` }], 800, ease.expoOut),
        leave: () => animate(wrap, [{ transform: `scale(${scaleOf(wrap)})` }, { transform: "scale(1)" }], 800, ease.expoOut),
      },
      navWrapper: {
        enter: () => {
          squeeze = false
          follow = false
        },
        leave: () => {
          follow = true
        },
      },
      navItem: {
        enter: (t) => {
          ring.style.transform = "none"
          const r = t.getBoundingClientRect()
          tween = { from: { ...target }, to: { x: r.left + t.offsetWidth / 2, y: r.top + t.offsetHeight / 2 }, start: performance.now(), dur: 200, ease: ease.expoOut }
          animate(ring, [{ width: getComputedStyle(ring).width }, { width: t.offsetWidth + "px" }], 650, ease.expoInOut)
        },
        leave: () => {
          tween = null
          const a = animate(ring, [{ width: getComputedStyle(ring).width }, { width: "2.2rem" }], 200, ease.expoOut)
          a.onfinish = () => {
            squeeze = true
            a.cancel()
          }
        },
      },
    }

    // every cursor-aware element from the node up to the root, outermost first
    const chain = (t: EventTarget | null) => {
      const out: HTMLElement[] = []
      let n = t instanceof Element ? t.closest<HTMLElement>("a, button, [data-cursor]") : null
      while (n) {
        out.unshift(n)
        n = n.parentElement?.closest<HTMLElement>("a, button, [data-cursor]") ?? null
      }
      return out
    }
    const keyOf = (n: HTMLElement) => (n.dataset.cursor ?? "link").split(" ")[0]
    // same semantics as per-element mouseenter / mouseleave
    const over = (e: PointerEvent) => {
      const before = chain(e.relatedTarget)
      for (const n of chain(e.target)) if (!before.includes(n)) states[keyOf(n)]?.enter?.(n)
    }
    const out = (e: PointerEvent) => {
      const after = chain(e.relatedTarget)
      for (const n of chain(e.target).reverse()) if (!after.includes(n)) states[keyOf(n)]?.leave?.(n)
    }
    const move = (e: PointerEvent) => {
      if (!follow) return
      target.x = e.clientX
      target.y = e.clientY
    }
    const down = () => animate(inner, [{ transform: `translate(-50%, -50%) scale(${scaleOf(inner)})` }, { transform: "translate(-50%, -50%) scale(0.8)" }], 200, ease.quadOut)
    const up = () => animate(inner, [{ transform: `translate(-50%, -50%) scale(${scaleOf(inner)})` }, { transform: "translate(-50%, -50%) scale(1)" }], 200, ease.quadOut)

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (tween) {
        const k = Math.min(1, (now - tween.start) / tween.dur)
        const e = tween.ease(k)
        target.x = tween.from.x + (tween.to.x - tween.from.x) * e
        target.y = tween.from.y + (tween.to.y - tween.from.y) * e
      }
      const dx = Math.round(target.x - pos.x)
      const dy = Math.round(target.y - pos.y)
      const k = 1 - Math.pow(1 - CATCH_UP, dt * 60)
      pos.x += dx * k
      pos.y += dy * k
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      if (squeeze) {
        const s = Math.min(Math.hypot(dx, dy) * STRETCH_PER_PX, STRETCH_MAX)
        ring.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg) scale(${1 + s}, ${1 - s})`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    window.addEventListener("pointermove", move, { passive: true })
    document.addEventListener("pointerover", over)
    document.addEventListener("pointerout", out)
    window.addEventListener("pointerdown", down)
    window.addEventListener("pointerup", up)
    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove("hk-cursor-off")
      window.removeEventListener("pointermove", move)
      document.removeEventListener("pointerover", over)
      document.removeEventListener("pointerout", out)
      window.removeEventListener("pointerdown", down)
      window.removeEventListener("pointerup", up)
    }
  }, [])

  return (
    <div ref={root} className={`hk-cursor${tone === "light" ? " hk-cursor--light" : ""}`} aria-hidden="true">
      <div className="hk-cursor__wrap">
        <div className="hk-cursor__inner">
          <span className="hk-cursor__ring" />
        </div>
      </div>
    </div>
  )
}
