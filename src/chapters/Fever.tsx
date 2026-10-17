import { useEffect, useRef, useState } from 'react'
import { fx, useStore, scrollState } from '../state/store'
import { audio } from '../audio/engine'
import { FEVER_POPUPS } from '../content/copy'
import Reveal from '../ui/Reveal'
import TabHydra from '../mechanics/TabHydra'
import SlotMachine from '../mechanics/SlotMachine'
import Salary from '../mechanics/Salary'
import JobPosting from '../mechanics/JobPosting'

interface Pop { id: number; i: number; x: number; y: number; dodge: number }
let pid = 1

/** Fake Win98 alerts that spawn at the edges while you're in the fever dream. OK spawns more. */
function Popups() {
  const [pops, setPops] = useState<Pop[]>([])
  const cursor = useRef(0)
  const spawn = () => {
    const i = cursor.current++ % FEVER_POPUPS.length
    const edge = Math.random()
    const x = edge < 0.5 ? Math.random() * 10 : 55 + Math.random() * 30
    const y = 12 + Math.random() * 62
    setPops((p) => [...p.slice(-4), { id: pid++, i, x, y, dodge: 0 }])
    audio.sfx('error', { vol: 0.6 })
  }
  useEffect(() => {
    const iv = setInterval(() => {
      const p = scrollState.pos
      if (useStore.getState().started && p > 3.05 && p < 3.9) spawn()
    }, 5200)
    return () => clearInterval(iv)
  }, [])
  const close = (id: number, ok: boolean) => {
    setPops((p) => p.filter((q) => q.id !== id))
    const st = useStore.getState()
    st.bump('suspicion', 1.5); st.incFlag('popups')
    if (ok) { audio.sfx('click'); if (Math.random() < 0.6) setTimeout(spawn, 350); st.bump('aura', 25) }
    if ((st.flags.popups as number) === 8) { fx.meme('fine'); audio.sfx('rimshot'); st.unlock('popups', 'Dialog Fatigue', 'You dismissed 8 system alerts. The system has stopped asking nicely.') }
  }
  return (
    <div className="popups" aria-live="polite">
      {pops.map((p) => {
        const d = FEVER_POPUPS[p.i]
        return (
          <div className="win pop" key={p.id} style={{ left: `${p.x}%`, top: `${p.y}%` }} role="alertdialog" aria-label={d.title}>
            <div className="win-title"><span>{d.title}</span><button className="win-x" onClick={() => close(p.id, false)} aria-label="Close">×</button></div>
            <div className="win-body"><div className="win-icon">!</div><p>{d.body}</p></div>
            <div className="row">
              <button className="win-btn" onClick={() => close(p.id, true)}>{d.ok}</button>
              <button className="win-btn" style={{ transform: `translate(${p.dodge * 40}px, ${p.dodge * -6}px)` }}
                onMouseEnter={() => setPops((a) => a.map((q) => (q.id === p.id && q.dodge < 3 ? { ...q, dodge: q.dodge + 1 } : q)))}
                onClick={() => close(p.id, false)}>{d.cancel}</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Fever() {
  const chapter = useStore((s) => s.chapter)
  useEffect(() => { document.body.classList.toggle('fever-on', chapter === 3); return () => document.body.classList.remove('fever-on') }, [chapter])
  useEffect(() => { if (chapter === 3) { audio.music.play('fever'); audio.sfx('glitch') } else if (chapter === 2 || chapter === 5) audio.music.play('ambient') }, [chapter])
  return (
    <section className="chapter tall" data-chapter={3}>
      <Popups />
      <div className="wrap stack">
        <div className="fever-title">
          <div className="chapter-tag label"><span>04 / 07</span><i /><span className="acid">The Corporate Fever Dream</span></div>
          <Reveal><h2 className="h-display">Synergy has<br /><em>been achieved.</em></h2></Reveal>
          <Reveal delay={120}><p className="lead" style={{ marginTop: 20 }}>Something in the infrastructure has gone warm. Please do not touch the dashboard. Touch the dashboard.</p></Reveal>
        </div>
        <Reveal><TabHydra /></Reveal>
        <Reveal><SlotMachine /></Reveal>
        <Reveal><Salary /></Reveal>
        <Reveal><JobPosting /></Reveal>
      </div>
    </section>
  )
}
