import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createSeamWipe, playSeamWipe, SEAM_WIPE } from '../seam-wipe'

type Mode = 'a' | 'wipe' | 'b'

export function WipePage() {
  const mount = useRef<HTMLDivElement>(null)
  const ui = useRef<HTMLDivElement>(null)
  const go = useRef<(reverse: boolean) => void>(() => {})
  const [at, setAt] = useState<'a' | 'b'>('a')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const host = mount.current
    if (!host) return
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(innerWidth, innerHeight)
    host.appendChild(renderer.domElement)

    // scene A: dusk room, glossy spheres on a floor
    const a = new THREE.Scene()
    a.background = new THREE.Color('#e9c9c2')
    a.fog = new THREE.Fog('#e9c9c2', 6, 22)
    const camA = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100)
    camA.position.set(0, 1.6, 8)
    a.add(new THREE.HemisphereLight('#fff4f0', '#b58c9a', 2.2))
    const sun = new THREE.DirectionalLight('#fff', 2.5)
    sun.position.set(4, 6, 3)
    a.add(sun)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#d9b3ae', roughness: 0.35 }))
    floor.rotation.x = -Math.PI / 2
    a.add(floor)
    const balls = ([[-2.2, 0.9, 0, '#f6efe9'], [0.4, 1.3, -1.5, '#c9a3c8'], [2.6, 0.7, 0.6, '#efe0d0']] as const).map(([x, r, z, c]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), new THREE.MeshStandardMaterial({ color: c, roughness: 0.15, metalness: 0.1 }))
      m.position.set(x, r, z)
      a.add(m)
      return { m, r }
    })

    // scene B: pale gallery of floating cards
    const b = new THREE.Scene()
    b.background = new THREE.Color('#f2f2f0')
    b.fog = new THREE.Fog('#f2f2f0', 8, 30)
    const camB = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100)
    const restB = new THREE.Vector3(0, 0, 9)
    camB.position.copy(restB)
    b.add(new THREE.AmbientLight('#fff', 2.4))
    const cards: THREE.Mesh[] = []
    for (let i = 0; i < 12; i++) {
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 2.1),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(`hsl(${(i * 37) % 360}, 35%, 72%)`) }),
      )
      card.position.set(((i % 4) - 1.5) * 2.2, (Math.floor(i / 4) - 1) * 2.6, -((i * 7) % 4))
      b.add(card)
      cards.push(card)
    }

    const px = () => new THREE.Vector2(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio())
    const rtA = new THREE.WebGLRenderTarget(px().x, px().y)
    const rtB = new THREE.WebGLRenderTarget(px().x, px().y)
    const wipe = createSeamWipe(renderer)
    // world height the camera sees at the cards' depth, so "two screens below" is literal
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camB.fov / 2)) * restB.z

    let mode: Mode = 'a'
    let progress = 0
    let raf = 0
    const tick = (t: number) => {
      const s = t / 1000
      balls.forEach(({ m, r }, i) => (m.position.y = r + Math.sin(s * 0.8 + i) * 0.08))
      cards.forEach((c, i) => (c.rotation.y = Math.sin(s * 0.5 + i) * 0.15))
      if (mode === 'a') {
        renderer.setRenderTarget(null)
        renderer.render(a, camA)
      } else if (mode === 'b') {
        renderer.setRenderTarget(null)
        renderer.render(b, camB)
      } else {
        camB.position.y = restB.y - SEAM_WIPE.incomingRise * viewHeight * (1 - progress)
        renderer.setRenderTarget(rtA)
        renderer.render(a, camA)
        renderer.setRenderTarget(rtB)
        renderer.render(b, camB)
        wipe.render(rtA.texture, rtB.texture, progress, null)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onResize = () => {
      renderer.setSize(innerWidth, innerHeight)
      camA.aspect = camB.aspect = innerWidth / innerHeight
      camA.updateProjectionMatrix()
      camB.updateProjectionMatrix()
      rtA.setSize(px().x, px().y)
      rtB.setSize(px().x, px().y)
    }
    window.addEventListener('resize', onResize)

    go.current = (reverse) => {
      mode = 'wipe'
      setBusy(true)
      playSeamWipe({
        reverse,
        onUpdate: (p) => {
          progress = p
          if (ui.current) {
            ui.current.style.opacity = String(p)
            ui.current.style.transform = `translateY(${(1 - p) * SEAM_WIPE.uiRise * 100}vh)`
          }
        },
        onComplete: () => {
          mode = reverse ? 'a' : 'b'
          camB.position.copy(restB)
          setAt(reverse ? 'a' : 'b')
          setBusy(false)
        },
      })
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      wipe.dispose()
      rtA.dispose()
      rtB.dispose()
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="wipe">
      <div ref={mount} className="wipe__stage" />
      <button className="wipe__go" disabled={busy} onClick={() => go.current(at === 'b')}>
        {at === 'a' ? 'Work' : 'Back'}
      </button>
      <div ref={ui} className="wipe__ui" style={{ opacity: 0 }}>
        <span>All</span>
        <span>Brand</span>
        <span>Digital</span>
        <span>Motion</span>
      </div>
    </div>
  )
}
