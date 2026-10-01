import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from "three"

/**
 * Seam wipe: a full-screen scene-to-scene transition.
 *
 * A soft, wavering horizontal seam climbs the screen from the bottom. Above
 * the seam the outgoing scene is still on screen; below it the incoming one
 * has taken over. Right at the seam both scenes are pulled through a zoom:
 * the outgoing frame rushes in toward the screen center as it is consumed,
 * the incoming frame bursts out from the center as it arrives. Paired with
 * the incoming scene rising into place from two screen heights below, it
 * reads as dropping through the floor of one world into the next.
 *
 * Both inputs are live textures (render each scene into its own target every
 * frame while the wipe runs), so camera moves keep playing underneath.
 *
 *   const wipe = createSeamWipe(renderer)
 *   playSeamWipe({
 *     onUpdate: (p) => {
 *       renderer.setRenderTarget(fromRT); renderer.render(homeScene, homeCam)
 *       renderer.setRenderTarget(toRT); renderer.render(workScene, workCam)
 *       workCam.position.y = baseY - SEAM_WIPE.incomingRise * viewportWorldHeight * (1 - p)
 *       wipe.render(fromRT.texture, toRT.texture, p)
 *     },
 *   })
 */

/** Choreography constants for the full page move (seconds / viewport heights). */
export const SEAM_WIPE = {
  /** total length of the move */
  duration: 3,
  /** incoming scene camera starts this many viewport heights below its rest spot */
  incomingRise: 2,
  /** page chrome for the incoming view rises from this many viewport heights below, fading in */
  uiRise: 2,
  /** a good moment for a sound cue (the seam is about to clear the bottom edge) */
  cueAt: 0.6,
} as const

/** Strong symmetric quintic ease: very slow start, fast middle, very slow landing. */
export function easeInOutQuint(x: number): number {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2
}

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragmentShader = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uProgress;  // 0 = all outgoing, 1 = all incoming (pass it eased)
uniform float uTime;      // seconds, keeps the seam wavering while it moves

// cheap hash + smooth lattice noise
float hash12(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float latticeNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 s = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
}

// seam jitter: stretched 10x along x so the edge undulates in long waves,
// drifting slowly; centered on 0.5 with a narrow spread
float seamJitter(vec2 uv, float t) {
  vec2 q = uv + vec2(t * 0.04);
  q.x *= 0.1;
  return 0.5 + (latticeNoise(q * 48.0) - 0.5) * 0.631;
}

// scale a uv about the screen center
vec2 zoomAbout(vec2 uv, float s) {
  return (uv - 0.5) * s + 0.5;
}

void main() {
  // where the seam sits for this pixel, nudged a little by the jitter
  float front = uProgress - 0.05 + seamJitter(vUv, uTime) * 0.06;

  // 0 above the seam, 1 below it; the high power keeps the band thin but soft
  float ramp = clamp(2.0 * front - vUv.y + 0.5, 0.0, 1.0);
  float m = pow(ramp * ramp * (3.0 - 2.0 * ramp), 20.0);

  vec4 outgoing = texture2D(uFrom, zoomAbout(vUv, 1.0 - m));
  vec4 incoming = texture2D(uTo, zoomAbout(vUv, m));
  gl_FragColor = mix(outgoing, incoming, m);
  #include <colorspace_fragment>
}
`

export interface SeamWipe {
  material: ShaderMaterial
  /** draw the blend of two scene textures at eased progress p (0..1) into target (null = screen) */
  render(from: Texture, to: Texture, progress: number, target?: WebGLRenderTarget | null, timeSeconds?: number): void
  dispose(): void
}

export function createSeamWipe(renderer: WebGLRenderer): SeamWipe {
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uFrom: { value: null },
      uTo: { value: null },
      uProgress: { value: 0 },
      uTime: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  })
  const quad = new Mesh(new PlaneGeometry(2, 2), material)
  quad.frustumCulled = false
  const scene = new Scene()
  scene.add(quad)
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const start = performance.now()

  return {
    material,
    render(from, to, progress, target = null, timeSeconds) {
      material.uniforms.uFrom.value = from
      material.uniforms.uTo.value = to
      material.uniforms.uProgress.value = progress
      material.uniforms.uTime.value = timeSeconds ?? (performance.now() - start) / 1000
      const prev = renderer.getRenderTarget()
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
      renderer.setRenderTarget(prev)
    },
    dispose() {
      quad.geometry.dispose()
      material.dispose()
    },
  }
}

export interface PlaySeamWipeOptions {
  duration?: number
  ease?: (x: number) => number
  /** called every frame with eased progress (feed it to SeamWipe.render) and raw linear progress */
  onUpdate: (eased: number, linear: number) => void
  /** fires once when linear progress passes SEAM_WIPE.cueAt / duration */
  onCue?: () => void
  onComplete?: () => void
  /** run backwards (incoming to outgoing), e.g. for the browser back button */
  reverse?: boolean
}

/** Drive a wipe on requestAnimationFrame. Resolves when it lands; cancel() stops it where it is. */
export function playSeamWipe(options: PlaySeamWipeOptions): { done: Promise<void>; cancel: () => void } {
  const { duration = SEAM_WIPE.duration, ease = easeInOutQuint, onUpdate, onCue, onComplete, reverse = false } = options
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
  let raf = 0
  let cued = false
  let resolve!: () => void
  const done = new Promise<void>((r) => (resolve = r))

  const finish = () => {
    onUpdate(reverse ? 0 : 1, reverse ? 0 : 1)
    onComplete?.()
    resolve()
  }
  if (reduced) {
    onCue?.()
    finish()
    return { done, cancel: () => {} }
  }

  const t0 = performance.now()
  const frame = (now: number) => {
    const linear = Math.min(1, (now - t0) / 1000 / duration)
    if (!cued && linear * duration >= SEAM_WIPE.cueAt) {
      cued = true
      onCue?.()
    }
    const x = reverse ? 1 - linear : linear
    onUpdate(ease(x), x)
    if (linear < 1) raf = requestAnimationFrame(frame)
    else {
      onComplete?.()
      resolve()
    }
  }
  raf = requestAnimationFrame(frame)
  return {
    done,
    cancel: () => {
      cancelAnimationFrame(raf)
      resolve()
    },
  }
}
