import { useEffect, useState } from 'react'
import { fx, useStore } from '../state/store'
import { audio } from '../audio/engine'
import { CHEEVOS } from '../content/copy'
import './gate.css'

const LOADING = [
  [0, 'Initialising visionary core'],
  [14, 'Compiling 3D assets (3)'],
  [31, 'Buffering humility — NOT FOUND'],
  [47, 'Downloading more RAM (legally)'],
  [63, 'Rendering confidence at 4K'],
  [78, 'Politely ignoring 47 tabs'],
  [92, 'Calibrating ego to "reasonable"'],
] as const

const GASLIGHT = [
  { line: null as string | null, label: 'Enter the experience' },
  { line: 'You already entered. I watched you do it.', label: 'Enter' },
  { line: "That's 2 entries. The system recommends stopping.", label: 'Enter (final)' },
  { line: '…Fine. Welcome. Again.', label: '' },
]

export default function Gate() {
  const started = useStore((s) => s.started)
  const [p, setP] = useState(0)
  const [stall, setStall] = useState(false)
  const [n, setN] = useState(0)
  const [busy, setBusy] = useState(false)
  const [gone, setGone] = useState(false)
  const [silent, setSilent] = useState(false)

  useEffect(() => {
    let v = 0, raf = 0, last = performance.now(), hold = 0
    const step = (t: number) => {
      const dt = (t - last) / 1000; last = t
      if (v >= 99 && hold < 1.1) { hold += dt; setStall(true) }
      else { setStall(false); v = Math.min(100, v + dt * (v < 60 ? 55 : 38)) }
      setP(v)
      if (v < 100) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  const ready = p >= 100
  const msg = LOADING.reduce<string>((a, [at, m]) => (p >= at ? m : a), LOADING[0][1])

  const press = (quiet: boolean) => {
    if (busy || !ready) return
    const k = n + 1
    if (!quiet && !useStore.getState().audio.enabled) { audio.init(); audio.music.play('ambient') }
    setSilent(quiet)
    setBusy(true); setN(k)
    useStore.getState().incFlag('gaslit')
    if (k === 1) audio.sfx('click')
    if (k === 2) { audio.sfx('error'); fx.shake(250) }
    if (k >= 3) {
      audio.sfx('boom'); audio.sfx('orchestra'); fx.flash('#ece4d2')
      const c = CHEEVOS.gate; useStore.getState().unlock('gate', c.title, c.desc)
      const g3 = CHEEVOS.gaslit3; setTimeout(() => useStore.getState().unlock('gaslit3', g3.title, g3.desc), 1600)
      useStore.getState().note('Entered the site three times to be allowed in once')
      useStore.getState().bump('delusion', 6)
      setTimeout(() => { useStore.setState({ started: true }); audio.music.play('dramatic'); setTimeout(() => setGone(true), 1400) }, 650)
      return
    }
    setTimeout(() => setBusy(false), 900)
  }

  if (gone) return null
  const g = GASLIGHT[Math.min(n, 3)]
  return (
    <div className={`gate ${started ? 'out' : ''}`} role="dialog" aria-label="Entry gate">
      <div className="gate-top label"><span>Vexxity Labs · Immersive Profile v∞.0</span><span>Cert. No. 0001 (self-issued)</span></div>
      <div className="gate-mid">
        <h1 className="h-display">Arlo<br /><em>Pemberton</em>–Vex</h1>
        <p className="lead">{ready ? (g.line ?? 'A cinematic experience. Mostly accurate.') : 'Preparing a profile of unusual size.'}</p>
        {g.line && ready && <p className="gate-msg" role="status" key={n}>{g.line}</p>}
        <div className="gate-bar" aria-hidden><b style={{ width: `${p}%` }} /></div>
        <div className="gate-meta label"><span>{ready ? 'Ready' : stall ? '99% — recalculating self-worth' : msg}</span><span>{Math.floor(p)}%</span></div>
        <div className="gate-btns">
          <button className="btn hot" onClick={() => press(false)} disabled={!ready || busy} data-cursor={n ? 'again?' : 'yes'}>{busy && n >= 1 ? 'Entering…' : g.label || 'Enter'}</button>
          <button className="btn ghost" onClick={() => press(true)} disabled={!ready || busy}>Enter silently</button>
        </div>
        <p className="label dim gate-hint">{silent ? 'Sound stays off. Arlo respects your decision, privately.' : 'Best with sound. Never autoplays — it waits for you.'}</p>
      </div>
      <div className="gate-bot label"><span>Contains: flashing, voices, mild ego</span><span>Tip: scroll. Eventually.</span></div>
    </div>
  )
}
