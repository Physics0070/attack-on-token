import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useStore, fx } from './state/store'
import { audio } from './audio/engine'
import { EGG_LINES } from './content/copy'
import { useScrollDriver } from './hooks/useScrollDriver'
import { useEggs } from './hooks/useEggs'
import { installChaos } from './chaos/chaos'
import Hud from './ui/Hud'
import Overlay from './ui/Overlay'
import Cursor from './ui/Cursor'
import Gate from './ui/Gate'
import Arrival from './chapters/Arrival'
import Legend from './chapters/Legend'
import Interrogation from './chapters/Interrogation'
import Fever from './chapters/Fever'
import Boss from './chapters/Boss'
import Consequences from './chapters/Consequences'
import Final from './chapters/Final'

const Experience = lazy(() => import('./scene/Experience'))

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false }
}

export default function App() {
  const [resetKey, setResetKey] = useState(0)
  const webgl = useMemo(hasWebGL, [])
  const low = useMemo(() => matchMedia('(max-width: 720px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4, [])
  const started = useStore((s) => s.started)
  const suspicion = useStore((s) => s.suspicion)
  const page = useStore((s) => s.page)
  useScrollDriver(resetKey, page)
  useEggs()
  useEffect(() => installChaos(), [])

  // lock scrolling behind the gate
  useEffect(() => { document.documentElement.style.overflow = started ? '' : 'hidden'; if (!started) window.scrollTo(0, 0) }, [started])
  // suspicion tiers decorate every .claim on the page
  useEffect(() => {
    const b = document.body
    b.classList.toggle('sus1', suspicion >= 25); b.classList.toggle('sus2', suspicion >= 55); b.classList.toggle('sus3', suspicion >= 85)
  }, [suspicion])
  useEffect(() => {
    const onReset = () => {
      audio.stopVoice(); audio.music.resume(); audio.music.play('ambient')
      useStore.getState().reset(); setResetKey((k) => k + 1)
      window.scrollTo({ top: 0, behavior: 'auto' })
      const l = EGG_LINES.reset; fx.subtitle(l[Math.floor(Math.random() * l.length)], 'ARLO', 4000)
    }
    window.addEventListener('apv:reset', onReset)
    return () => window.removeEventListener('apv:reset', onReset)
  }, [])

  return (
    <>
      <div className="stage" aria-hidden>
        {webgl ? <Suspense fallback={null}><Experience low={low} /></Suspense> : <div className="nogl" />}
      </div>
      <Cursor />
      <Hud onReset={() => window.dispatchEvent(new CustomEvent('apv:reset'))} />
      <Overlay />
      <Gate />
      {!webgl && <div className="nogl-note label" role="note">WebGL unavailable — the 3D world is off. Arlo is still on.</div>}
      <main className="scroller" key={resetKey}>
        {page === 1 ? (<><Arrival /><Legend /><Interrogation /></>) : (<><Fever /><Boss /><Consequences /><Final /></>)}
      </main>
    </>
  )
}
