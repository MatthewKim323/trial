/**
 * Easing curves as plain functions, plus a converter to CSS `linear()` so the
 * same curve drives Web Animations (element.animate) exactly. No tween
 * library needed, and every animation stays seekable via getAnimations().
 */

export type Ease = (t: number) => number

const expoIn: Ease = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)))
const circIn: Ease = (t) => 1 - Math.sqrt(1 - t * t)
const quadIn: Ease = (t) => t * t

const out = (f: Ease): Ease => (t) => 1 - f(1 - t)
const inOut = (f: Ease): Ease => (t) => (t < 0.5 ? f(t * 2) / 2 : 1 - f((1 - t) * 2) / 2)

export const ease = {
  linear: ((t) => t) as Ease,
  expoIn,
  expoOut: out(expoIn),
  expoInOut: inOut(expoIn),
  circInOut: inOut(circIn),
  quadOut: out(quadIn),
  quadInOut: inOut(quadIn),
}

const cache = new Map<Ease, string>()

/** A CSS linear() easing that traces f with enough points to be visually exact. */
export function cssEase(f: Ease, samples = 64): string {
  const hit = cache.get(f)
  if (hit) return hit
  const pts: string[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    pts.push(`${+f(t).toFixed(5)} ${+(t * 100).toFixed(3)}%`)
  }
  const s = `linear(${pts.join(", ")})`
  cache.set(f, s)
  return s
}

/**
 * One property's part of a timeline: from `at` for `dur` seconds, eased.
 * Tracks for the same property must not overlap; gaps hold the last value.
 */
export type Track = { at: number; dur: number; from: string | number; to: string | number; ease: Ease }

/**
 * Keyframes spanning the whole timeline (`total` seconds), so every element
 * animation in a Timeline shares one clock and reversing mid-way unwinds the
 * later tracks first, exactly like scrubbing a timeline backwards.
 */
export function timelineKeyframes(prop: string, tracks: Track[], total: number): Keyframe[] {
  const frames: Keyframe[] = [{ offset: 0, [prop]: tracks[0].from, easing: "linear" }]
  for (const t of tracks) {
    const start = t.at / total
    const last = frames[frames.length - 1]
    if (start > (last.offset as number)) frames.push({ offset: start, [prop]: t.from, easing: cssEase(t.ease) })
    else Object.assign(last, { [prop]: t.from, easing: cssEase(t.ease) })
    frames.push({ offset: Math.min(1, (t.at + t.dur) / total), [prop]: t.to, easing: "linear" })
  }
  const last = frames[frames.length - 1]
  if ((last.offset as number) < 1) frames.push({ offset: 1, [prop]: last[prop] })
  return frames
}

/** A paused, two-way timeline: play() forward on enter, reverse() on leave, from wherever it is. */
export class Timeline {
  private anims: Animation[] = []
  private dir = 0

  add(el: Element | null, keyframes: Keyframe[], total: number) {
    if (!el) return this
    const a = el.animate(keyframes, { duration: total * 1000, fill: "both" })
    a.pause()
    a.currentTime = 0
    this.anims.push(a)
    return this
  }

  play() {
    if (this.dir === 1) return
    this.dir = 1
    for (const a of this.anims) {
      a.playbackRate = 1
      a.play()
    }
  }

  reverse() {
    if (this.dir === -1) return
    this.dir = -1
    for (const a of this.anims) {
      if ((a.currentTime as number) <= 0) continue
      a.playbackRate = -1
      a.play()
    }
  }

  /** jump to the end state without animating (e.g. a pre-selected toggle) */
  finish() {
    this.dir = 1
    for (const a of this.anims) a.finish()
  }

  cancel() {
    for (const a of this.anims) a.cancel()
    this.anims = []
  }
}

/** Keyframes sampled from any function of time (seconds), for moves no single curve describes. */
export function sampledKeyframes(at: (t: number) => Keyframe, total: number, fps = 120): Keyframe[] {
  const n = Math.max(2, Math.ceil(total * fps))
  const frames: Keyframe[] = []
  for (let i = 0; i <= n; i++) frames.push({ ...at((i / n) * total), offset: i / n, easing: "linear" })
  return frames
}
