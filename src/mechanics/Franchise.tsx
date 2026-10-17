import { useEffect, useRef, useState } from 'react'
import { fx, useStore } from '../state/store'
import { audio } from '../audio/engine'
import { FRANCHISE } from '../content/copy'

const COL: Record<string, string> = { verm: '#ff4b1f', brass: '#d4a84a', acid: '#cfff2e', bone: '#ece4d2' }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function Art({ i, c }: { i: number; c: string }) {
  const shapes = [
    <circle key="a" cx="100" cy="120" r="70" fill="none" stroke={c} strokeWidth="1.2" />,
    <path key="b" d="M0 200 L200 20 L200 200Z" fill={c} opacity=".85" />,
    <g key="c" stroke={c} strokeWidth="1">{Array.from({ length: 14 }, (_, k) => <line key={k} x1={k * 15} y1="0" x2={200 - k * 15} y2="300" />)}</g>,
    <rect key="d" x="40" y="60" width="120" height="120" fill={c} opacity=".9" transform="rotate(14 100 120)" />,
    <g key="e" fill="none" stroke={c} strokeWidth="1.2">{[30, 55, 80, 105].map((r) => <circle key={r} cx="100" cy="140" r={r} />)}</g>,
    <path key="f" d="M20 260 Q100 -20 180 260" fill="none" stroke={c} strokeWidth="14" />,
  ]
  return (
    <svg className="art" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="200" height="300" fill="#14110e" />
      {shapes[i % shapes.length]}
      <rect width="200" height="300" fill="url(#fade)" /><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stopColor="#0b0907" stopOpacity="0" /><stop offset="1" stopColor="#0b0907" stopOpacity=".95" /></linearGradient></defs>
    </svg>
  )
}

export default function Franchise() {
  const [seen, setSeen] = useState<Set<number>>(new Set())
  const [cur, setCur] = useState<number | null>(null)
  const [line, setLine] = useState(-1)
  const [stage, setStage] = useState<'lines' | 'silence' | 'title'>('lines')
  const cancel = useRef(false)

  const close = () => {
    cancel.current = true; audio.stopVoice(); audio.music.resume(); setCur(null)
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && cur !== null) close() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [cur])

  const play = async (i: number) => {
    const f = FRANCHISE[i]
    cancel.current = false
    setCur(i); setLine(-1); setStage('lines')
    audio.music.cut(); audio.sfx('orchestra'); audio.music.swell(2)
    await sleep(900)
    for (let k = 0; k < f.trailer.length && !cancel.current; k++) {
      setLine(k)
      if (k === f.trailer.length - 1) audio.sfx('boom')
      await audio.say(f.trailer[k], { voice: 'announcer', sub: false, rate: 0.9 })
      await sleep(400)
    }
    if (cancel.current) return
    // bathos: record scratch, total silence, then the title
    audio.sfx('scratch'); setStage('silence'); await sleep(1300)
    if (cancel.current) return
    audio.sfx('boom'); fx.shake(300); setStage('title')
    audio.say(i % 2 ? 'Coming soon. To a reality near you.' : 'Rated: still unemployed.', { voice: 'ai', sub: false })
    await sleep(3200)
    if (cancel.current) return
    setSeen((s) => new Set(s).add(i))
    const st = useStore.getState()
    st.bump('delusion', 4); st.bump('aura', 300); st.incFlag('franchise.seen')
    st.note(`Sat through the trailer for "${f.title}" voluntarily`)
    if ((st.flags['franchise.seen'] as number) >= 4) st.unlock('cinematic', 'Cinematic Universe Enjoyer', 'You watched four trailers for movies that do not exist. Arlo is moved. Arlo is also not a real studio.')
    close()
  }

  const f = cur !== null ? FRANCHISE[cur] : null
  return (
    <div>
      <div className="fr-head">
        <div>
          <div className="label">Mechanic 04 · Unemployment Cinematic Universe</div>
          <h3 className="h-mid" style={{ marginTop: 8 }}>A career, <em className="hot">in theatres</em> nowhere.</h3>
        </div>
        <p className="lead dim" style={{ maxWidth: '38ch' }}>Six sequels of professional setbacks, framed as prestige cinema. Click a poster. Sound recommended; the ending is a bit.</p>
      </div>
      <div className="fr-strip" role="list">
        {FRANCHISE.map((m, i) => (
          <button key={m.title} role="listitem" className={`fr-card ${seen.has(i) ? 'seen' : ''}`} onClick={() => { audio.sfx('click'); play(i) }} data-cursor="play trailer" aria-label={`Play trailer: ${m.title}`}>
            <Art i={i} c={COL[m.accent]} />
            <span className="ph label" style={{ color: COL[m.accent] }}>{m.phase} · {m.year}</span>
            <span><span className="t" style={{ display: 'block' }}>{m.title}</span><span className="label" style={{ display: 'block', marginTop: 8, textTransform: 'none', letterSpacing: 0 }}>{m.tagline}</span></span>
          </button>
        ))}
      </div>
      {f && (
        <div className="trailer" role="dialog" aria-label={`Trailer: ${f.title}`} aria-live="polite">
          <button className="btn ghost trailer-x" onClick={close}>Skip · Esc</button>
          {stage === 'lines' && line >= 0 && <div key={line} className={`trailer-line ${line === f.trailer.length - 1 ? 'big' : ''}`}>{f.trailer[line]}</div>}
          {stage === 'silence' && <div className="label" style={{ opacity: 0.4 }}>. . .</div>}
          {stage === 'title' && <div><div className="trailer-title" style={{ color: COL[f.accent] }}>{f.title}</div><div className="label trailer-rating">{f.rating}</div></div>}
        </div>
      )}
    </div>
  )
}
