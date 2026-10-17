import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { useStore, fx } from '../state/store'
import { audio } from '../audio/engine'
import './Captcha.css'

/* ------------------------------------------------------------------ */
/* CAPTCHA of Self-Awareness: failure never ends it, it just mocks you */
/* ------------------------------------------------------------------ */

interface Result { pass: boolean; delta: number; msg: string; sub?: string; aura?: number }
interface Ctx {
  nudge: (delta: number, why: string, fail?: boolean) => void
  finish: (r: Result) => void
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v))

function useTicker(target: number, ms = 700) {
  const [v, setV] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    const t0 = performance.now()
    const a = cur.current
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      cur.current = a + (target - a) * (1 - Math.pow(1 - k, 3))
      setV(cur.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

const rng = (seed: number) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const shuffle = <T,>(arr: T[], r: () => number) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ================= procedural tiles ================= */
const BONE = '#ece4d2', BONE2 = '#a79f8b', VERM = '#ff4b1f', BRASS = '#d4a84a', ACID = '#cfff2e', DARK = '#2a251f'

type R = () => number
const SCENE: Record<string, (r: R) => ReactNode> = {
  light: (r) => {
    const lit = Math.floor(r() * 3)
    const col = [VERM, BRASS, ACID][lit]
    return (
      <g transform={`translate(${(r() * 14 - 7).toFixed(1)} ${(r() * 6 - 3).toFixed(1)}) translate(50 50) scale(${(0.88 + r() * 0.22).toFixed(2)}) translate(-50 -50)`}>
        <rect x="48" y="58" width="4" height="34" fill={BONE2} />
        <rect x="37" y="12" width="26" height="50" rx="3" fill="#0d0b08" stroke={BONE2} strokeWidth="1.5" />
        {[0, 1, 2].map((i) => <circle key={i} cx="50" cy={25 + i * 13} r="5.5" fill={i === lit ? col : DARK} />)}
        {r() > 0.5 && <rect x="63" y="20" width="14" height="3" fill={BONE2} />}
      </g>
    )
  },
  tree: (r) => (
    <g transform={`translate(${r() * 10 - 5} 0)`}>
      <rect x="47" y="56" width="6" height="34" fill="#5b4a37" />
      <circle cx="50" cy="40" r={20 + r() * 6} fill="#3f4c33" />
      <circle cx={38 + r() * 6} cy="48" r="13" fill="#4a5a3a" />
      <circle cx={60 - r() * 6} cy="47" r="12" fill="#364429" />
    </g>
  ),
  car: (r) => {
    const c = [VERM, BONE2, BRASS, '#6a6254'][Math.floor(r() * 4)]
    return (
      <g transform={`translate(0 ${r() * 6 - 2})`}>
        <path d="M14 66 L18 52 Q22 44 32 44 L64 44 Q74 44 80 54 L88 62 L88 70 L14 70 Z" fill={c} />
        <path d="M26 48 L32 48 L32 56 L22 56 Z M38 48 L62 48 L68 56 L38 56 Z" fill="#0d0b08" opacity="0.8" />
        <circle cx="30" cy="72" r="8" fill="#0d0b08" stroke={BONE2} strokeWidth="2" />
        <circle cx="72" cy="72" r="8" fill="#0d0b08" stroke={BONE2} strokeWidth="2" />
      </g>
    )
  },
  hydrant: (r) => (
    <g transform={`translate(${r() * 12 - 6} 0)`}>
      <rect x="40" y="46" width="20" height="40" fill={VERM} />
      <path d="M38 46 Q50 28 62 46 Z" fill={VERM} />
      <rect x="33" y="56" width="34" height="8" fill={VERM} />
      <rect x="36" y="82" width="28" height="6" fill="#7a2410" />
      <circle cx="50" cy="36" r="3" fill="#0d0b08" />
    </g>
  ),
  cross: (r) => (
    <g transform={`skewX(${r() * 14 - 7})`}>
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={14 + i * 3 - 2} y={22 + i * 13} width={72 - i * 6} height="8" fill={BONE} opacity={0.85 - i * 0.05} />)}
    </g>
  ),
  building: (r) => {
    const rows = 4 + Math.floor(r() * 2)
    return (
      <g>
        <rect x="22" y="14" width="56" height="78" fill="#3a342c" stroke={BONE2} strokeWidth="1" />
        {Array.from({ length: rows * 3 }, (_, i) => (
          <rect key={i} x={28 + (i % 3) * 18} y={20 + Math.floor(i / 3) * (64 / rows)} width="10" height="8" fill={r() > 0.6 ? BRASS : '#14110e'} />
        ))}
      </g>
    )
  },
  bike: (r) => (
    <g transform={`translate(${r() * 8 - 4} 0)`} fill="none" stroke={BONE} strokeWidth="2.4">
      <circle cx="30" cy="68" r="15" /><circle cx="70" cy="68" r="15" />
      <path d="M30 68 L46 44 L64 44 L70 68 M46 44 L54 68 L30 68 M40 40 L50 40" />
    </g>
  ),
  cone: (r) => (
    <g transform={`translate(${r() * 14 - 7} 0)`}>
      <path d="M50 20 L68 82 L32 82 Z" fill={VERM} />
      <path d="M45 40 L55 40 L58 52 L42 52 Z" fill={BONE} />
      <rect x="26" y="82" width="48" height="6" fill="#0d0b08" stroke={BONE2} />
    </g>
  ),
  lamp: (r) => (
    <g transform={`translate(${r() * 10 - 5} 0)`}>
      <rect x="48" y="34" width="4" height="56" fill={BONE2} />
      <path d="M50 34 Q50 16 70 16" fill="none" stroke={BONE2} strokeWidth="4" />
      <ellipse cx="70" cy="20" rx="9" ry="5" fill={BRASS} />
    </g>
  ),
  stop: (r) => (
    <g transform={`translate(${r() * 8 - 4} 0)`}>
      <rect x="48" y="58" width="4" height="34" fill={BONE2} />
      <polygon points="35,22 65,22 76,33 76,53 65,64 35,64 24,53 24,33" fill={VERM} stroke={BONE} strokeWidth="2" />
      <text x="50" y="47" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="13" fill={BONE}>STOP</text>
    </g>
  ),
}
const NOT_LIGHT = ['tree', 'car', 'hydrant', 'cross', 'building', 'bike', 'cone', 'lamp', 'stop']

/* round-2 ego tiles */
interface EgoItem { k: string; label: string; shiny?: boolean; yours?: boolean; loud?: boolean; gold?: boolean }
const EGO: EgoItem[] = [
  { k: 'mirror', label: 'mirror', shiny: true, yours: true },
  { k: 'crown', label: 'crown', shiny: true, gold: true },
  { k: 'trophy', label: 'trophy', shiny: true, gold: true, yours: true },
  { k: 'mega', label: 'megaphone', loud: true },
  { k: 'phone', label: 'selfie', shiny: true, yours: true },
  { k: 'mom', label: 'mom (proud)', yours: true },
  { k: 'tab', label: 'tab 47' },
  { k: 'sign', label: 'i love me', loud: true, yours: true },
  { k: 'fridge', label: 'fridge' },
]
const EGO_ART: Record<string, ReactNode> = {
  mirror: (<g><ellipse cx="50" cy="44" rx="22" ry="28" fill="#1a1612" stroke={BRASS} strokeWidth="4" /><path d="M38 30 L58 22 M36 44 L60 34" stroke={BONE} strokeWidth="2.5" opacity="0.7" /><rect x="46" y="72" width="8" height="14" fill={BRASS} /></g>),
  crown: (<g><path d="M22 66 L26 34 L40 50 L50 28 L60 50 L74 34 L78 66 Z" fill={BRASS} /><rect x="22" y="66" width="56" height="8" fill="#b08a34" /><circle cx="26" cy="32" r="3" fill={VERM} /><circle cx="50" cy="26" r="3" fill={VERM} /><circle cx="74" cy="32" r="3" fill={VERM} /></g>),
  trophy: (<g><path d="M32 24 H68 V44 Q68 60 50 62 Q32 60 32 44 Z" fill={BRASS} /><path d="M32 30 H22 Q22 46 34 48 M68 30 H78 Q78 46 66 48" fill="none" stroke={BRASS} strokeWidth="3" /><rect x="46" y="62" width="8" height="12" fill={BRASS} /><rect x="36" y="74" width="28" height="8" fill="#b08a34" /></g>),
  mega: (<g><path d="M24 40 L60 24 V66 L24 52 Z" fill={BONE} /><rect x="16" y="40" width="10" height="12" fill={BONE2} /><path d="M68 34 Q78 45 68 56 M74 28 Q90 45 74 62" fill="none" stroke={VERM} strokeWidth="3" /></g>),
  phone: (<g><rect x="34" y="16" width="32" height="64" rx="5" fill="#0d0b08" stroke={BONE} strokeWidth="2.5" /><circle cx="50" cy="42" r="9" fill={BONE2} /><path d="M38 66 Q50 50 62 66" fill={BONE2} /><circle cx="50" cy="22" r="1.6" fill={BONE} /></g>),
  mom: (<g><rect x="26" y="18" width="48" height="58" fill="#14110e" stroke={BRASS} strokeWidth="3" /><circle cx="50" cy="42" r="10" fill={BONE2} /><path d="M32 70 Q50 48 68 70 Z" fill={BONE2} /><path d="M42 40 q2 2 4 0 M54 40 q2 2 4 0 M44 47 q6 5 12 0" fill="none" stroke="#14110e" strokeWidth="1.4" /></g>),
  tab: (<g><path d="M14 30 H40 L46 22 H86 V76 H14 Z" fill="#14110e" stroke={BONE2} strokeWidth="2" /><rect x="14" y="30" width="72" height="6" fill={BONE2} /><text x="50" y="58" textAnchor="middle" fontFamily="monospace" fontSize="10" fill={BONE2}>Untitled (47)</text><path d="M78 24 l5 5 m0 -5 l-5 5" stroke={VERM} strokeWidth="1.5" /></g>),
  sign: (<g><rect x="48" y="52" width="4" height="36" fill={BONE2} /><rect x="16" y="20" width="68" height="34" fill={BONE} /><text x="50" y="43" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="13" fill="#0b0907">I ♥ ME</text></g>),
  fridge: (<g><rect x="30" y="12" width="40" height="78" fill="#6a6254" stroke={BONE2} strokeWidth="2" /><line x1="30" y1="38" x2="70" y2="38" stroke={BONE2} strokeWidth="2" /><rect x="35" y="22" width="3" height="10" fill={BONE} /><rect x="35" y="46" width="3" height="16" fill={BONE} /></g>),
}

function TileBg({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="100" height="100" fill="#1b1713" />
      <rect y="86" width="100" height="14" fill="#14110e" />
      <line x1="0" y1="86" x2="100" y2="86" stroke="#3a342c" strokeWidth="1" />
      {children}
      {label && <text x="50" y="97" textAnchor="middle" fontFamily="monospace" fontSize="7" fill={BONE2} letterSpacing="1">{label.toUpperCase()}</text>}
    </svg>
  )
}

/* ================= round 1: traffic lights (functional) ================= */
function Round1({ ctx }: { ctx: Ctx }) {
  const [attempt, setAttempt] = useState(0)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [note, setNote] = useState('')
  const grid = useMemo(() => {
    const r = rng(Math.floor(Math.random() * 1e9) + attempt)
    const n = 2 + Math.floor(r() * 3)
    const pos = new Set(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], r).slice(0, n))
    return Array.from({ length: 9 }, (_, i) => ({
      kind: pos.has(i) ? 'light' : NOT_LIGHT[Math.floor(r() * NOT_LIGHT.length)],
      seed: Math.floor(r() * 1e9),
      ok: pos.has(i),
    }))
  }, [attempt])

  const toggle = (i: number) => {
    audio.sfx('click', { vol: 0.5 })
    setSel((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  }
  const verify = () => {
    audio.init()
    const good = grid.every((t, i) => t.ok === sel.has(i))
    if (good) {
      ctx.finish({
        pass: true,
        delta: attempt === 0 ? 12 : 6,
        msg: 'Verified. You can see a traffic light.',
        sub: attempt === 0 ? 'Baseline human acquired. It will not last.' : 'Eventually human. The system took notes.',
      })
    } else if (attempt === 0) {
      ctx.nudge(-4, 'Incorrect. Please try again.', true)
      setNote('Incorrect. Please try again. (A new set of squares has been issued.)')
      setSel(new Set())
      setAttempt(1)
    } else {
      ctx.finish({ pass: false, delta: -6, msg: 'Incorrect, again.', sub: 'It was a traffic light. It has been a traffic light since 1868.' })
    }
  }

  return (
    <div className="cap-round">
      <div className="cap-grid" role="group" aria-label="Image tiles">
        {grid.map((t, i) => (
          <button key={`${attempt}-${i}`} className={`cap-tile ${sel.has(i) ? 'sel' : ''}`} aria-pressed={sel.has(i)} aria-label={`Tile ${i + 1}`} onClick={() => toggle(i)}>
            <TileBg>{SCENE[t.kind](rng(t.seed))}</TileBg>
            <span className="cap-tick">✓</span>
          </button>
        ))}
      </div>
      {note && <p className="cap-note hot">{note}</p>}
      <div className="cap-actions">
        <button className="btn hot" onClick={verify}>Verify</button>
        <span className="label dim">If there are none, click verify.</span>
      </div>
    </div>
  )
}

/* ================= round 2: your ego (the rule changes under you) ================= */
const CRITERIA: { k: 'shiny' | 'yours' | 'loud' | 'gold'; text: string }[] = [
  { k: 'shiny', text: 'is shiny' },
  { k: 'loud', text: 'is loud' },
  { k: 'gold', text: 'is gold' },
  { k: 'yours', text: 'you would claim as yours' },
]
function Round2({ ctx }: { ctx: Ctx }) {
  const items = useMemo(() => shuffle(EGO, rng(Math.floor(Math.random() * 1e9))), [])
  const [crit, setCrit] = useState(0)
  const [read, setRead] = useState<Record<number, 'ego' | 'not'>>({})
  const [clicks, setClicks] = useState(0)
  const [line, setLine] = useState('Click a square. The system will tell you whether it is ego.')
  const order = useRef(shuffle([0, 1, 2, 3], rng(Math.floor(Math.random() * 1e9))))
  const cur = CRITERIA[order.current[crit % 4]]
  const egoCount = Object.values(read).filter((v) => v === 'ego').length

  const click = (i: number) => {
    const it = items[i]
    const hit = !!it[cur.k]
    audio.sfx(hit ? 'ding' : 'tick', { vol: 0.6 })
    setRead((r) => ({ ...r, [i]: hit ? 'ego' : 'not' }))
    setLine(
      hit
        ? ['Ego detected.', 'Ego confirmed. Please do not look at it.', 'That is ego. You knew that.'][clicks % 3]
        : ['Not ego. (That is also what Arlo says about his ego.)', 'No ego here. Rare.', 'Negative. The ego is elsewhere, probably nearby, probably talking.'][clicks % 3],
    )
    setClicks((c) => c + 1)
    setCrit((c) => c + 1)
    if ((clicks + 1) % 2 === 0) fx.subtitle('The rule has changed.', 'VERIFY-ISH', 1600)
  }
  const verify = () => {
    audio.init()
    if (egoCount >= 3) {
      ctx.finish({ pass: true, delta: 10, aura: -60, msg: `Ego located in ${egoCount} squares. Self-awareness: adequate.`, sub: 'Please note that you pointed at your own ego three times and did not flinch.' })
    } else if (egoCount === 0) {
      ctx.finish({ pass: false, delta: -8, msg: 'No ego detected. Denial is an ego trait.', sub: 'Verification failed because you are too humble to pass. Arlo would have clicked all nine.' })
    } else {
      ctx.finish({ pass: false, delta: -5, msg: `Only ${egoCount} of the required 3 ego squares.`, sub: 'Your ego is evasive. A search party has been sent. The search party is also your ego.' })
    }
  }

  return (
    <div className="cap-round">
      <div className="cap-crit" key={crit}>
        <span className="label">CURRENT CRITERION</span>
        <b>a square that {cur.text}</b>
        <span className="label dim">(will change)</span>
      </div>
      <div className="cap-grid" role="group" aria-label="Ego tiles">
        {items.map((it, i) => (
          <button key={it.k} className={`cap-tile ego ${read[i] ?? ''}`} aria-label={`${it.label}${read[i] ? `, ${read[i] === 'ego' ? 'ego' : 'not ego'}` : ''}`} onClick={() => click(i)}>
            <TileBg label={it.label}>{EGO_ART[it.k]}</TileBg>
            {read[i] && <span className={`cap-read ${read[i]}`}>{read[i] === 'ego' ? 'EGO' : 'NOT EGO'}</span>}
          </button>
        ))}
      </div>
      <p className="cap-note">{line}</p>
      <div className="cap-actions">
        <button className="btn hot" onClick={verify} disabled={clicks === 0}>Verify</button>
        <span className="label dim">Ego located: {egoCount} / 3</span>
      </div>
    </div>
  )
}

/* ================= round 3: are you a robot ================= */
const DEFS = [
  { t: 'ROBOT, n.: a being that does what it is told. See: employee.', q: "Define 'employee'" },
  { t: 'EMPLOYEE, n.: a robot with a lanyard and a lunch break. See: Arlo, who has neither.', q: "Define 'Arlo'" },
  { t: 'ARLO, n.: see ARLO.', q: '' },
]
function Round3({ ctx }: { ctx: Ctx }) {
  const [def, setDef] = useState(0)
  const [shown, setShown] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [recycle, setRecycle] = useState(0)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const yes = () => {
    if (busy) return
    audio.init()
    setBusy(true)
    audio.say('Honesty detected. Robots cannot lie. Please stand by for recycling.', { voice: 'robot' })
    audio.sfx('error')
    let p = 0
    timer.current = window.setInterval(() => {
      p += 4
      setRecycle(p)
      if (p % 20 === 0) audio.sfx('tick', { vol: 0.4 })
      if (p >= 100) {
        if (timer.current) clearInterval(timer.current)
        ctx.finish({ pass: false, delta: -12, msg: 'Honesty detected. Only robots are honest.', sub: 'You have been classified as a robot and recycled into a mildly worse robot.' })
      }
    }, 90)
  }
  const no = () => {
    if (busy) return
    audio.init()
    setBusy(true)
    audio.say('That is exactly what a robot would say. Thank you for your cooperation, unit.', { voice: 'robot' })
    ctx.finish({ pass: false, delta: -7, msg: 'That is exactly what a robot would say.', sub: 'Denial is the first stage of becoming Arlo.', aura: -30 })
  }
  const define = () => {
    if (busy) return
    audio.init()
    audio.sfx('tick')
    const d = DEFS[def]
    setShown((s) => [...s, d.t])
    if (def >= DEFS.length - 1) {
      setBusy(true)
      ctx.finish({ pass: true, delta: 6, msg: 'Stalling detected. A deeply human behaviour.', sub: 'You asked a machine to define itself and it looped. Credit to you.' })
    } else setDef(def + 1)
  }

  return (
    <div className="cap-round">
      <div className="cap-robot">
        <button className="btn" onClick={yes} disabled={busy}>Yes</button>
        <button className="btn" onClick={no} disabled={busy}>No</button>
        <button className="btn ghost" onClick={define} disabled={busy}>{def === 0 ? 'Define robot' : DEFS[def - 1].q}</button>
      </div>
      {shown.length > 0 && (
        <ul className="cap-defs">
          {shown.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
      {recycle > 0 && (
        <div className="cap-recycle" role="progressbar" aria-valuenow={recycle} aria-valuemin={0} aria-valuemax={100}>
          <span className="label">RECYCLING UNIT... {recycle}%</span>
          <div><i style={{ width: `${recycle}%` }} /></div>
        </div>
      )}
      <p className="label dim">Every answer is punished. They are punished differently.</p>
    </div>
  )
}

/* ================= round 4: judged live ================= */
const ADJ = new Set(
  'beautiful,gorgeous,stunning,golden,red,orange,pink,warm,cold,big,huge,vast,glorious,magnificent,peaceful,calm,serene,vibrant,dreamy,breathtaking,lovely,pretty,bright,dark,soft,gentle,endless,radiant,fiery,majestic,amazing,incredible,epic,fantastic,wonderful,cozy,quiet,burning,glowing,shimmering,crisp,hazy,purple,blue,yellow,sad,lonely,nice,good,great,perfect,romantic,mellow,rich,deep,orangey,lazy,tender'.split(','),
)
const AI_WORDS = /\b(tapestry|testament|delve|symphony of|as an ai|canvas of)\b/i
const ARLO_WORDS = /(synerg|leverage|disrupt|paradigm|ecosystem|scalable|pivot|visionary|10x|thought leader)/i

interface Judge { adj: number; words: number; dash: number; ex: number; line: string; delta: number; pass: boolean }
function judge(text: string): Judge {
  const t = text.trim()
  const w = t.toLowerCase().match(/[a-z']+/g) ?? []
  const adj = w.filter((x) => ADJ.has(x)).length
  const dash = (t.match(/[—–]/g) ?? []).length
  const ex = (t.match(/!/g) ?? []).length
  let line = '', delta = 0
  if (!t) { line = 'Waiting. Robots do not hesitate. You are hesitating. Promising.'; delta = 0 }
  else if (AI_WORDS.test(t)) { line = "'Tapestry'? That is how a language model describes a sunset."; delta = -20 }
  else if (ARLO_WORDS.test(t)) { line = 'Business jargon in a sunset. Arlo detected.'; delta = -15 }
  else if (adj >= 3) { line = `Your answer has ${adj} adjectives, a bit much.`; delta = -4 }
  else if (dash >= 1) { line = 'An em dash. Bold. Also very machine.'; delta = -6 }
  else if (ex >= 2) { line = 'Calm down. It is a sunset, not a product launch.'; delta = -3 }
  else if (t.length > 240) { line = 'That is a thesis. Sunsets last four minutes.'; delta = -5 }
  else if (w.length < 3) { line = 'Terse. Some would say menacing.'; delta = 2 }
  else if (adj >= 1) { line = `${adj} adjective${adj > 1 ? 's' : ''}. Tasteful. Suspiciously well-adjusted.`; delta = 12 }
  else { line = 'No adjectives. Bleak but honest.'; delta = 6 }
  return { adj, words: w.length, dash, ex, line, delta, pass: delta > 0 }
}
function Round4({ ctx }: { ctx: Ctx }) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const j = useMemo(() => judge(text), [text])
  const lastLine = useRef('')
  useEffect(() => {
    if (text && j.line !== lastLine.current) {
      lastLine.current = j.line
      audio.sfx('tick', { vol: 0.35, pitch: j.delta < 0 ? 0.7 : 1.3 })
    }
  }, [j, text])
  const submit = () => {
    if (done) return
    audio.init()
    setDone(true)
    const parts = [`${j.adj} adjective${j.adj === 1 ? '' : 's'}`, `${j.words} words`]
    if (j.dash) parts.push(`${j.dash} em dash${j.dash > 1 ? 'es' : ''}`)
    ctx.finish({ pass: j.pass, delta: j.delta, msg: 'Answer accepted. All answers are.', sub: `Final judgment: ${j.line} (${parts.join(', ')})` })
  }
  return (
    <div className="cap-round">
      <label className="label" htmlFor="cap-sunset">Any answer is accepted. None is forgiven.</label>
      <textarea
        id="cap-sunset"
        className="cap-text"
        rows={3}
        value={text}
        disabled={done}
        placeholder="The sun went down and..."
        onChange={(e) => setText(e.target.value)}
        maxLength={400}
      />
      <div className="cap-judge" aria-live="polite">
        <span className="label hot">LIVE JUDGMENT</span>
        <p>{j.line}</p>
        <div className="cap-counters">
          <span><b>{j.adj}</b> adjectives</span>
          <span><b>{j.words}</b> words</span>
          <span><b>{j.dash}</b> em dashes</span>
        </div>
      </div>
      <div className="cap-actions">
        <button className="btn hot" onClick={submit} disabled={done}>Submit</button>
      </div>
    </div>
  )
}

/* ================= round 5: hold with feeling ================= */
const HOLD_MS = 3200
function Round5({ ctx }: { ctx: Ctx }) {
  const [prog, setProg] = useState(0)
  const [holding, setHolding] = useState(false)
  const [msg, setMsg] = useState('Press and hold. Do it like you mean it.')
  const [feel, setFeel] = useState(0)
  const [resets, setResets] = useState(0)
  const R = useRef({ on: false, kb: false, t0: 0, sx: 0, sy: 0, lx: 0, ly: 0, win: 0, winT: 0, lastMove: 0, done: false, resets: 0, warned: false })

  const reset = useCallback((why: string) => {
    const r = R.current
    if (!r.on) return
    r.on = false
    r.resets += 1
    setHolding(false)
    setProg(0)
    setFeel(0)
    setResets(r.resets)
    setMsg(why)
    ctx.nudge(-3, why, true)
    if (r.resets >= 3 && !r.done) {
      r.done = true
      audio.say('Fine. Pity pass.', { voice: 'robot' })
      window.setTimeout(() => ctx.finish({ pass: true, delta: 2, msg: 'Pity pass.', sub: 'Defeated by your persistence. Three attempts. Feeling: reluctantly accepted.' }), 700)
    }
  }, [ctx])

  const begin = (kb: boolean, x = 0, y = 0) => {
    const r = R.current
    if (r.on || r.done) return
    audio.init()
    const now = performance.now()
    Object.assign(r, { on: true, kb, t0: now, sx: x, sy: y, lx: x, ly: y, win: 0, winT: now, lastMove: now, warned: false })
    setHolding(true)
    setMsg(kb ? 'Keyboard hold. Feeling: dubious.' : 'Hold.')
    if (r.resets === 0) audio.say('Please confirm you are a person. With feeling.', { voice: 'robot' })
  }

  useEffect(() => {
    let raf = 0
    const loop = (now: number) => {
      const r = R.current
      if (r.on && !r.done) {
        const el = now - r.t0
        const p = Math.min(1, el / HOLD_MS)
        setProg(p)
        setMsg((m) => {
          const nm = p < 0.33 ? 'Hold.' : p < 0.66 ? 'Hold with feeling.' : 'More feeling.'
          return /^(Hold|More)/.test(m) || m.startsWith('Keyboard') ? (r.kb ? m : nm) : m
        })
        if (now - r.winT > 400) {
          const w = r.win
          r.win = 0
          r.winT = now
          setFeel(r.kb ? 45 : clamp(w * 8))
          if (!r.kb && w > 28) reset('Too tense. Your hand is trembling like a man reading his own bio.')
        }
        if (!r.kb && r.on) {
          const still = now - r.lastMove
          if (still > 1000 && !r.warned) {
            r.warned = true
            setMsg('You are very still. Robots are very still. Feeling: 0%.')
            audio.sfx('deny', { vol: 0.4 })
          }
          if (still > 2100 && el > 2100) reset('Too steady. Robots do not tremble. A little tremble is allowed.')
        }
        if (r.on && p >= 1) {
          r.on = false
          r.done = true
          setHolding(false)
          const k = r.kb
          audio.say('Feeling: acceptable. Proceed, person.', { voice: 'robot' })
          ctx.finish({
            pass: true,
            delta: k ? 6 : Math.max(2, 14 - 3 * r.resets),
            msg: k ? 'Feeling: dubious. Accepted.' : 'Feeling accepted.',
            sub: k ? 'Keyboards cannot tremble. The system chose to believe you.' : r.resets ? `It took ${r.resets + 1} attempts. Persistence is, regrettably, human.` : 'First try. Either a person or very well rehearsed.',
          })
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [ctx, reset])

  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    begin(false, e.clientX, e.clientY)
  }
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const r = R.current
    if (!r.on || r.kb) return
    const d = Math.hypot(e.clientX - r.lx, e.clientY - r.ly)
    r.win += d
    r.lx = e.clientX
    r.ly = e.clientY
    r.lastMove = performance.now()
    if (Math.hypot(e.clientX - r.sx, e.clientY - r.sy) > 32) reset('You drifted. Commitment issues.')
  }
  const onUp = () => {
    const r = R.current
    if (r.on && !r.done) reset('Released early. Commitment issues.')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (!e.repeat) begin(true)
    }
  }
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onUp()
    }
  }

  const C = 2 * Math.PI * 62
  return (
    <div className="cap-round cap-hold-wrap">
      <button
        className={`cap-hold ${holding ? 'on' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={onUp}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="I am a person. Press and hold with feeling."
      >
        <svg viewBox="0 0 150 150" aria-hidden="true">
          <circle cx="75" cy="75" r="62" className="ring-bg" />
          <circle cx="75" cy="75" r="62" className={`ring ${feel > 20 ? 'warm' : ''}`} strokeDasharray={C} strokeDashoffset={C * (1 - prog)} transform="rotate(-90 75 75)" />
        </svg>
        <span className="cap-hold-txt">I AM<br />A PERSON</span>
      </button>
      <div className="cap-hold-info" aria-live="polite">
        <p className="cap-hold-msg">{msg}</p>
        <div className="cap-feel">
          <span className="label">FEELING</span>
          <div><i style={{ width: `${feel}%` }} /></div>
          <b>{Math.round(feel)}%</b>
        </div>
        <span className="label dim">Failed attempts: {resets} / 3 (then the system gives up)</span>
      </div>
    </div>
  )
}

/* ================= round 6: not Arlo ================= */
const ARLOISH = /(pioneer|launch|found(ed|er)|scal(e|ed|ing)|architect|visionar|synerg|disrupt|leverage|paradigm|crush|shipped|10x|aura|award|\bceo\b|revolution|thrilled|humbled|\binvent)/i
const HUMBLE = /(forgot|spilled|burn(t|ed)|missed|late|nap|scroll|procrastinat|ate|cried|tripped|sneez|stub|lost|broke|misplace|yawn|snooze|overslept|cold coffee)/i
function Round6({ ctx }: { ctx: Ctx }) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const arloness = clamp((text.match(new RegExp(ARLOISH.source, 'gi')) ?? []).length * 38 + (/arlo/i.test(text) ? 30 : 0))
  const shown = useTicker(arloness, 400)
  const submit = () => {
    if (done) return
    audio.init()
    const t = text.trim()
    const words = t.split(/\s+/).filter(Boolean).length
    setDone(true)
    if (words < 3)
      return ctx.finish({ pass: false, delta: -4, msg: 'Too short. Humility is not silence.', sub: 'Arlo also gives one-word answers. Usually "disruptive."' })
    if (/arlo/i.test(t))
      return ctx.finish({ pass: false, delta: /\bnot\b/i.test(t) ? -12 : -8, aura: -50, msg: /\bnot\b/i.test(t) ? 'Denial. Classic Arlo.' : 'Suspiciously specific.', sub: 'You typed his name. Nobody types his name unless they are him, or in a lawsuit against him.' })
    if (ARLOISH.test(t))
      return ctx.finish({ pass: false, delta: -10, msg: 'That was an achievement. Arlo detected.', sub: 'The prompt said unimpressive. You launched something. We saw that.' })
    if (HUMBLE.test(t))
      return ctx.finish({ pass: true, delta: 14, msg: 'Verified: a person. A tired one.', sub: 'Genuine unimpressiveness detected. Arlo would sooner die than spill that.' })
    ctx.finish({ pass: true, delta: 6, msg: 'Plausibly not Arlo.', sub: 'Your sentence did not contain a single "leverage." Cautiously cleared.' })
  }
  return (
    <div className="cap-round">
      <label className="label" htmlFor="cap-arlo">Type one sentence about something unimpressive you did recently.</label>
      <textarea id="cap-arlo" className="cap-text" rows={2} value={text} disabled={done} maxLength={200} placeholder="Yesterday I..." onChange={(e) => setText(e.target.value)} />
      <div className="cap-arlometer">
        <span className="label">ARLO-LIKELIHOOD</span>
        <div><i style={{ width: `${shown}%` }} /></div>
        <b>{Math.round(shown)}%</b>
      </div>
      <div className="cap-actions">
        <button className="btn hot" onClick={submit} disabled={done || !text.trim()}>Submit</button>
        <span className="label dim">Do not sound like a founder.</span>
      </div>
    </div>
  )
}

/* ================= shell ================= */
const ROUNDS: { pre: string; big: string; sub?: string; label: string }[] = [
  { pre: 'Select all squares with', big: 'traffic lights', sub: 'The easy one. Enjoy it.', label: 'Image verification' },
  { pre: 'Select all squares containing', big: 'your ego', sub: 'Criteria may be revised without notice.', label: 'Self-awareness' },
  { pre: 'Are you a robot?', big: '(be honest)', label: 'Honesty probe' },
  { pre: 'In your own words,', big: 'describe a sunset', label: 'Free response' },
  { pre: 'Confirm', big: 'I am a person', sub: 'Hold. With feeling.', label: 'Biometric sincerity' },
  { pre: 'Final check:', big: 'prove you are not Arlo', label: 'Identity' },
]

function tierOf(h: number) {
  if (h >= 85) return { t: 'Suspiciously Human', c: 'Please check your own pulse. The system would like to be sure for you.' }
  if (h >= 60) return { t: 'Probably a Person', c: 'The system is leaning in, and then leaning back out.' }
  if (h >= 35) return { t: 'NPC-Adjacent', c: 'Rizz not located. Dialogue tree: three options, all "okay."' }
  return { t: 'Arlo (Confirmed)', c: 'Welcome back. We saved your seat. It is in the founder section.' }
}

export default function Captcha() {
  const [round, setRound] = useState(0)
  const [human, setHuman] = useState(50)
  const [res, setRes] = useState<Result | null>(null)
  const [marks, setMarks] = useState<('pass' | 'fail')[]>([])
  const [done, setDone] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [bump, setBump] = useState<number>(0)

  const hRef = useRef(50)
  const failed = useRef(0)
  const resRef = useRef<Result | null>(null)
  const humanShown = useTicker(human, 900)

  const apply = useCallback((d: number) => {
    hRef.current = clamp(hRef.current + d)
    setHuman(hRef.current)
    setBump(d)
  }, [])

  const ctx: Ctx = useMemo(
    () => ({
      nudge: (delta, why, fail = false) => {
        apply(delta)
        if (fail) {
          failed.current += 1
          useStore.getState().incFlag('captcha.failed')
        }
        audio.sfx('deny')
        fx.shake(180)
        fx.subtitle(why, 'VERIFY-ISH', 2400)
      },
      finish: (r) => {
        if (resRef.current) return
        resRef.current = r
        setRes(r)
        apply(r.delta)
        const st = useStore.getState()
        if (!r.pass) {
          failed.current += 1
          st.incFlag('captcha.failed')
          audio.sfx(r.delta <= -10 ? 'error' : 'deny')
          fx.shake(r.delta <= -10 ? 420 : 240)
        } else audio.sfx('success')
        st.bump('suspicion', r.pass ? -1 : 2)
        if (r.aura) st.bump('aura', r.aura)
        else st.bump('aura', r.pass ? 20 : -20)
        setMarks((m) => [...m, r.pass ? 'pass' : 'fail'])
      },
    }),
    [apply],
  )

  const next = () => {
    audio.sfx('click')
    resRef.current = null
    setRes(null)
    setBump(0)
    if (round >= ROUNDS.length - 1) {
      const score = Math.round(hRef.current)
      const st = useStore.getState()
      st.setFlag('captcha.score', score)
      st.setFlag('captcha.failed', failed.current)
      st.note(`Took the CAPTCHA of Self-Awareness: Humanness ${score}% (${tierOf(score).t}), failed ${failed.current} checks`)
      st.bump('aura', Math.round((score - 50) * 4))
      st.bump('suspicion', Math.round((50 - score) / 6))
      st.unlock('captcha-' + (score >= 60 ? 'human' : score >= 35 ? 'npc' : 'arlo'), tierOf(score).t, `Humanness ${score}%`)
      setDone(true)
      audio.sfx(score >= 60 ? 'fanfare' : 'sadTrombone')
      audio.say(`Humanness: ${score} percent. ${tierOf(score).t}.`, { voice: 'robot' })
      if (score < 35) fx.meme('npc')
      else if (score >= 85) fx.meme('sigma')
    } else setRound(round + 1)
  }

  const again = () => {
    audio.sfx('whoosh')
    hRef.current = 50
    failed.current = 0
    resRef.current = null
    setHuman(50)
    setRes(null)
    setMarks([])
    setRound(0)
    setDone(false)
    setBump(0)
    setRunKey((k) => k + 1)
    const st = useStore.getState()
    st.setFlag('captcha.failed', 0)
    st.setFlag('captcha.score', 50)
  }

  const pos = clamp(humanShown)
  const meta = ROUNDS[round]
  const final = Math.round(human)
  const tier = tierOf(final)
  const serial = useMemo(() => `VRFY-${(Math.floor(Math.random() * 9000) + 1000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 90 + 10)}`, [runKey])
  const body: ReactNode = (() => {
    const k = `${runKey}-${round}`
    switch (round) {
      case 0: return <Round1 key={k} ctx={ctx} />
      case 1: return <Round2 key={k} ctx={ctx} />
      case 2: return <Round3 key={k} ctx={ctx} />
      case 3: return <Round4 key={k} ctx={ctx} />
      case 4: return <Round5 key={k} ctx={ctx} />
      default: return <Round6 key={k} ctx={ctx} />
    }
  })()

  return (
    <section className="panel cap" aria-label="CAPTCHA of Self-Awareness">
      <div className="cap-top">
        <span className="label">MECHANIC 02 · CAPTCHA OF SELF-AWARENESS</span>
        <span className="label dim">{done ? 'COMPLETE' : `CHECK ${round + 1} / ${ROUNDS.length}`}</span>
      </div>
      <h2 className="h-mid">Prove you are <em>a person.</em></h2>
      <p className="lead">Failure is not a dead end. The system will simply keep going, and enjoy it.</p>

      <div className="cap-meter" aria-label={`Humanness ${Math.round(human)} percent`}>
        <div className="cap-meter-head">
          <span className="label">HUMANNESS</span>
          <b className="cap-meter-n">{Math.round(humanShown)}<small>%</small></b>
          {bump !== 0 && <span key={`${round}-${human}`} className={`cap-delta ${bump > 0 ? 'up' : 'down'}`}>{bump > 0 ? '+' : '−'}{Math.abs(bump)}</span>}
        </div>
        <div className="cap-track">
          <i className="z z1" /><i className="z z2" /><i className="z z3" />
          {Array.from({ length: 11 }, (_, i) => <u key={i} style={{ left: `${i * 10}%` }} />)}
          <span className="cap-needle" style={{ left: `${pos}%` }}><em /></span>
        </div>
        <div className="cap-zones"><span>ARLO</span><span>NPC</span><span>HUMAN</span><span>SUSPECT</span></div>
        <div className="cap-pips">
          {ROUNDS.map((_, i) => <i key={i} className={`${marks[i] ?? ''} ${i === round && !done ? 'cur' : ''}`} />)}
        </div>
      </div>

      {!done ? (
        <div className="cap-card">
          <div className="cap-band">
            <span>{meta.pre}</span>
            <h3>{meta.big}</h3>
            {meta.sub && <small>{meta.sub}</small>}
          </div>
          <div className="cap-body">
            {body}
            {res && (
              <div className={`cap-res ${res.pass ? 'pass' : 'fail'}`} role="status">
                <div className="cap-res-top">
                  <span className="stamp">{res.pass ? 'Verified' : 'Failed'}</span>
                  <span className={`cap-chip ${res.delta >= 0 ? 'up' : 'down'}`}>{res.delta >= 0 ? '+' : '−'}{Math.abs(res.delta)} humanness</span>
                </div>
                <p className="cap-res-msg">{res.msg}</p>
                {res.sub && <p className="dim">{res.sub}</p>}
                <button className="btn" onClick={next}>{round >= ROUNDS.length - 1 ? 'Issue certificate' : 'Continue'}</button>
              </div>
            )}
          </div>
          <div className="cap-foot">
            <span className="cap-logo" aria-hidden="true">◐</span>
            <span className="label">VERIFY·ISH™ · {meta.label}</span>
            <span className="label dim">Privacy · Terms · Please don't</span>
          </div>
        </div>
      ) : (
        <div className="cap-cert" role="status">
          <div className="cap-cert-in">
            <span className="label">CERTIFICATE OF HUMANNESS · {serial}</span>
            <p className="cap-cert-pre">This certifies that the bearer, a visitor of Arlo Pemberton-Vex's profile page, scored</p>
            <b className="cap-cert-n">{final}%</b>
            <h3 className="cap-cert-t">{tier.t}</h3>
            <p className="cap-cert-c">{tier.c}</p>
            <div className="cap-cert-marks">
              {ROUNDS.map((r, i) => (
                <span key={i} className={marks[i]}>{marks[i] === 'pass' ? '✓' : '✗'} {r.label}</span>
              ))}
            </div>
            <span className="stamp cap-cert-stamp">{final >= 60 ? 'Mostly Human' : 'Pending Review'}</span>
            <p className="label dim">Failed checks: {failed.current}. Not valid for travel, employment, or being Arlo.</p>
          </div>
          <button className="btn hot" onClick={again}>Take the test again</button>
        </div>
      )}
    </section>
  )
}
