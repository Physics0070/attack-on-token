import { useEffect, useRef, useState } from 'react'
import { CHAPTERS, fx, useStore } from '../state/store'
import { audio } from '../audio/engine'
import { EGG_LINES } from '../content/copy'
import './hud.css'

function Ticker({ value }: { value: number }) {
  const [v, setV] = useState(value)
  const ref = useRef(value)
  useEffect(() => {
    let raf = 0
    const step = () => {
      ref.current += (value - ref.current) * 0.14
      if (Math.abs(value - ref.current) < 0.6) ref.current = value
      setV(Math.round(ref.current))
      if (ref.current !== value) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{v.toLocaleString('en-US')}</>
}

export default function Hud({ onReset }: { onReset: () => void }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const logoClicks = useRef(0)
  const logoT = useRef<number>(0)
  const chapter = s.chapter

  const toggleSound = () => {
    if (!s.audio.enabled) { audio.init(); audio.music.play('ambient'); return }
    s.setAudio({ muted: !s.audio.muted })
    if (!s.audio.muted) fx.subtitle(EGG_LINES.mute[Math.floor(Math.random() * EGG_LINES.mute.length)], 'SYSTEM', 2200)
  }
  const logo = () => {
    logoClicks.current++
    clearTimeout(logoT.current)
    logoT.current = window.setTimeout(() => (logoClicks.current = 0), 1400)
    audio.sfx('tick')
    if (logoClicks.current >= 7) {
      logoClicks.current = 0
      const l = EGG_LINES.logo7; fx.subtitle(l[Math.floor(Math.random() * l.length)], 'ARLO', 4200)
      fx.meme('sigma'); audio.sfx('boom'); fx.shake(500)
      s.incFlag('eggs'); s.bump('aura', 777)
      s.unlock('logo7', 'Brand Loyalty', 'You clicked the logo seven times. It has filed this under "engagement".')
    }
  }
  const go = (i: number) => {
    audio.sfx('whoosh')
    document.querySelector(`[data-chapter="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const susCls = s.suspicion >= 70 ? 'hot' : ''
  return (
    <header className="hud">
      <button className="hud-logo" onClick={logo} aria-label="Arlo Pemberton-Vex logo"><i />APV<sup>™</sup></button>
      <div className="hud-stats" role="group" aria-label="Session statistics">
        <div className="stat"><span className="label">Delusion Index</span><div className="bar"><b style={{ width: `${s.delusion}%`, background: 'var(--brass)' }} /></div><em>{Math.round(s.delusion)}</em></div>
        <div className={`stat ${susCls}`}><span className="label">Site Suspicion</span><div className="bar"><b style={{ width: `${s.suspicion}%`, background: 'var(--verm)' }} /></div><em>{Math.round(s.suspicion)}</em></div>
        <div className="stat pg"><span className="label">Page</span><em>{s.page}/2</em></div>
        <div className="stat aura"><span className="label">Aura</span><em className={s.aura < 0 ? 'neg' : ''}><Ticker value={s.aura} /></em></div>
      </div>
      <div className="hud-right">
        <button className="hud-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Sound settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 6h3l4-3v10l-4-3H2z" />{s.audio.enabled && !s.audio.muted ? <path d="M11.5 5.5c1 1.4 1 3.6 0 5M13.3 3.8c2 2.4 2 5.9 0 8.4" /> : <path d="M11 6l4 4M15 6l-4 4" />}</svg>
          <span>{!s.audio.enabled ? 'Sound off' : s.audio.muted ? 'Muted' : 'Sound'}</span>
        </button>
        <button className="hud-btn" onClick={() => { audio.sfx('click'); onReset() }} aria-label="Reset timeline"><span>↺ Reset</span></button>
      </div>
      {open && (
        <div className="panel sound-panel" role="dialog" aria-label="Audio mixer">
          <div className="label">Audio mixer</div>
          <div className="sp-row"><button className={`btn ${s.audio.enabled && !s.audio.muted ? '' : 'hot'}`} onClick={toggleSound}>{!s.audio.enabled ? 'Enable sound' : s.audio.muted ? 'Unmute' : 'Mute'}</button></div>
          {(['master', 'music', 'sfx', 'voice', 'ambient'] as const).map((k) => (
            <label className="sp-row" key={k}><span className="label">{k}</span>
              <input type="range" min={0} max={1} step={0.01} value={s.audio[k]} onChange={(e) => s.setAudio({ [k]: parseFloat(e.target.value) })} aria-label={`${k} volume`} /></label>
          ))}
          <div className="label dim" style={{ textTransform: 'none', letterSpacing: 0 }}>Everything works muted. Voice uses your browser's built-in speech.</div>
        </div>
      )}
      <nav className="hud-nav" aria-label="Chapters">
        {CHAPTERS.map((c, i) => ({ c, i })).filter(({ i }) => (s.page === 1 ? i < 3 : i >= 3)).map(({ c, i }) => (
          <button key={c.id} className={i === chapter ? 'on' : ''} onClick={() => go(i)} aria-label={`Go to ${c.name}`} aria-current={i === chapter}>
            <span>{c.no} · {c.name}</span><i />
          </button>
        ))}
      </nav>
    </header>
  )
}
