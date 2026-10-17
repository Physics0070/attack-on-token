import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { useStore, fx } from '../state/store'
import { audio } from '../audio/engine'
import './Inflation.css'

/* ------------------------------------------------------------------ */
/* Achievement Inflation Machine                                       */
/* hold to pump -> tiers upgrade -> release to bank, or hold into pop  */
/* ------------------------------------------------------------------ */

const THR = [12, 30, 50, 72, 92] // pressure at which tier 1..5 is reached
const RED = 92 // red zone starts at tier V
const BURST = 112 // pressure at which it pops
const DIAL_MAX = 120
const BANK_AURA = [0, 40, 120, 260, 520, 1000]
const TIER_NAME = ['Mundane', 'Initiative', 'Industry Shaker', 'Paradigm', 'Civilizational', 'Cosmic']
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V']
const FINE = [
  'Witnessed by: nobody.',
  'Sources: Arlo.',
  'Peer review: Arlo, again.',
  'Fact-check pending since 2019.',
  'The fact-checker has been let go.',
  'Reality has filed a formal complaint.',
]

interface AchSet { base: string; titles: string[]; heads: string[]; audit: string }
const SETS: AchSet[] = [
  {
    base: 'coffee',
    titles: [
      'Made a cup of coffee',
      'Pioneered a Hot Beverage Initiative',
      'Revolutionized Morning Caffeination Infrastructure',
      'Architected the Global Caffeine Paradigm Shift',
      'Single-Handedly Resolved the Bean Question and Saved Civilization',
      'Invented Warmth. Credited with the Sun.',
    ],
    heads: [
      'Local Man Makes Coffee',
      'Vexxity Labs Announces Hot Beverage Initiative',
      'Industry Reels as Arlo Disrupts Mornings',
      "World Economy 'Basically Runs on Arlo's Coffee,' Says Arlo",
      'Bean Crisis Over; Historians Thank Arlo, Arlo Confirms',
      'Before Arlo, Nothing Was Hot, Confirm Sources (Arlo)',
    ],
    audit: 'Independent audit: the coffee was instant.',
  },
  {
    base: 'nap',
    titles: [
      'Took a nap',
      'Pioneered Restorative Horizontal Strategy',
      'Disrupted the Wakefulness Economy',
      'Architected a Rest-First Global Paradigm',
      'Single-Handedly Ended Tiredness (Provisional)',
      'Invented Dreams. Licensing Them Q3.',
    ],
    heads: [
      'Local Man Lies Down',
      'Vexxity Labs Unveils Horizontal Strategy',
      "Sleep Industry 'Stunned,' 'Unaware,' Says Arlo",
      'UN Considers Naps an Official Language',
      'Fatigue Retires, Cites Arlo',
      "Dreams Were Arlo's Idea All Along, Confirms Arlo",
    ],
    audit: 'Independent audit: he was on his phone the whole time.',
  },
  {
    base: 'email',
    titles: [
      'Replied "k" to an email',
      'Pioneered Asynchronous Stakeholder Alignment',
      'Revolutionized Single-Syllable Leadership',
      'Redefined Global Communication Bandwidth',
      'Ended Miscommunication Across Three Continents',
      'Authored the 11th Letter of the Alphabet',
    ],
    heads: [
      'Man Types Letter, Sends',
      "Vexxity Labs Launches 'K' Framework",
      'Alphabet Reorganizes Around Letter K',
      "Diplomats Adopt 'K' Over Treaty Language",
      "Tower of Babel Reopens, Citing Arlo's K",
      'Historians: Letters Were Rough Drafts Until K',
    ],
    audit: 'Independent audit: the email said "unsubscribe."',
  },
]

interface Slot { x: number; y: number; rot: number; s: number; kind: 'rosette' | 'shield' | 'star' | 'laurel'; label: string; tone: 'brass' | 'verm' | 'bone'; tier: number }
const SLOTS: Slot[] = [
  { tier: 1, x: 12, y: 24, rot: -14, s: 1, kind: 'rosette', label: 'BEST\nCOFFEE\nEVER', tone: 'brass' },
  { tier: 1, x: 87, y: 27, rot: 10, s: 0.95, kind: 'star', label: "WORLD'S\n1ST", tone: 'bone' },
  { tier: 2, x: 7, y: 54, rot: -8, s: 1.05, kind: 'shield', label: 'TOP\n0.1%', tone: 'verm' },
  { tier: 2, x: 93, y: 57, rot: 12, s: 1, kind: 'laurel', label: 'AWARD\nWINNING', tone: 'brass' },
  { tier: 2, x: 50, y: 9, rot: 0, s: 0.9, kind: 'rosette', label: 'VERIFIED\n(BY ME)', tone: 'bone' },
  { tier: 3, x: 19, y: 80, rot: -6, s: 1.1, kind: 'rosette', label: 'SYNERGY\nCERT.', tone: 'verm' },
  { tier: 3, x: 80, y: 82, rot: 8, s: 1.05, kind: 'shield', label: 'PEER\nREVIEWED\n(BY DAD)', tone: 'brass' },
  { tier: 3, x: 29, y: 12, rot: -18, s: 0.85, kind: 'star', label: '5/5\nSTARS', tone: 'brass' },
  { tier: 4, x: 68, y: 12, rot: 14, s: 1, kind: 'laurel', label: "MOM'S\nCHOICE", tone: 'bone' },
  { tier: 4, x: 7, y: 78, rot: -20, s: 0.95, kind: 'rosette', label: 'GAME\nCHANGER', tone: 'brass' },
  { tier: 4, x: 93, y: 82, rot: 18, s: 0.95, kind: 'star', label: 'ICON', tone: 'verm' },
  { tier: 5, x: 50, y: 88, rot: 0, s: 1.25, kind: 'rosette', label: 'COSMIC\nLAUREATE', tone: 'brass' },
  { tier: 5, x: 38, y: 93, rot: -10, s: 0.9, kind: 'shield', label: 'PRIZE-\nADJACENT', tone: 'bone' },
  { tier: 5, x: 63, y: 93, rot: 9, s: 0.9, kind: 'star', label: 'HISTORIC', tone: 'verm' },
  { tier: 5, x: 77, y: 8, rot: 6, s: 1, kind: 'laurel', label: 'BEYOND\nGOD-TIER', tone: 'brass' },
]

const starPts = (n: number, r1: number, r2: number) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI * i) / n - Math.PI / 2
    const r = i % 2 ? r2 : r1
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')

const TONE = { brass: '#d4a84a', verm: '#ff4b1f', bone: '#ece4d2' }

function Badge({ slot }: { slot: Slot }) {
  const c = TONE[slot.tone]
  const lines = slot.label.split('\n')
  const start = 52 - ((lines.length - 1) * 11) / 2
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      {slot.kind === 'rosette' && (
        <>
          <polygon points={starPts(14, 49, 41)} fill={c} />
          <circle cx="50" cy="50" r="33" fill="none" stroke="#0b0907" strokeWidth="1.4" />
        </>
      )}
      {slot.kind === 'star' && (
        <>
          <polygon points={starPts(8, 49, 33)} fill={c} />
          <circle cx="50" cy="50" r="24" fill="none" stroke="#0b0907" strokeWidth="1.2" strokeDasharray="2 2" />
        </>
      )}
      {slot.kind === 'shield' && (
        <>
          <path d="M14 10 H86 V54 C86 76 66 90 50 96 C34 90 14 76 14 54 Z" fill={c} />
          <path d="M20 16 H80 V53 C80 71 64 83 50 89 C36 83 20 71 20 53 Z" fill="none" stroke="#0b0907" strokeWidth="1.2" />
        </>
      )}
      {slot.kind === 'laurel' && (
        <>
          <circle cx="50" cy="50" r="42" fill="#0b0907" stroke={c} strokeWidth="3" />
          {Array.from({ length: 9 }, (_, i) => {
            const a = 200 + i * 17
            const rad = (a * Math.PI) / 180
            const lx = 50 + 44 * Math.cos(rad)
            const ly = 50 + 44 * Math.sin(rad)
            const rx = 100 - lx
            return (
              <g key={i} fill={c}>
                <ellipse cx={lx} cy={ly} rx="3.2" ry="7" transform={`rotate(${a + 90} ${lx} ${ly})`} />
                <ellipse cx={rx} cy={ly} rx="3.2" ry="7" transform={`rotate(${-a - 90} ${rx} ${ly})`} />
              </g>
            )
          })}
        </>
      )}
      <text textAnchor="middle" className={`infl-btxt ${slot.kind === 'laurel' ? 'light' : ''}`} fontSize={lines.length > 2 ? 10 : 11.5}>
        {lines.map((l, i) => (
          <tspan key={i} x="50" y={start + i * 11.5}>{l}</tspan>
        ))}
      </text>
    </svg>
  )
}

/* ---- dial geometry ---- */
const CX = 130, CY = 132, R = 100
const A0 = -112, A1 = 112
const ang = (p: number) => A0 + (Math.min(p, DIAL_MAX) / DIAL_MAX) * (A1 - A0)
const pt = (a: number, r: number) => {
  const rad = (a * Math.PI) / 180
  return [CX + r * Math.sin(rad), CY - r * Math.cos(rad)] as const
}
const arc = (p0: number, p1: number, r: number) => {
  const [x0, y0] = pt(ang(p0), r)
  const [x1, y1] = pt(ang(p1), r)
  const large = ang(p1) - ang(p0) > 180 ? 1 : 0
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`
}

/* tween a number toward target */
function useTicker(target: number, ms = 600) {
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

type Phase = 'idle' | 'pumping' | 'banked' | 'popping' | 'burst'

export default function Inflation() {
  const delusion = useStore((s) => s.delusion)
  const delusionShown = useTicker(delusion, 700)

  const [p, setP] = useState(0)
  const [tier, setTier] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [badges, setBadges] = useState<number[]>([]) // indices into SLOTS
  const [attempt, setAttempt] = useState(0)
  const [showWin, setShowWin] = useState(false)
  const [holding, setHolding] = useState(false)
  const [bankedTier, setBankedTier] = useState(0)
  const [scatter, setScatter] = useState(false)

  const pRef = useRef(0)
  const tierRef = useRef(0)
  const phaseRef = useRef<Phase>('idle')
  const holdRef = useRef(false)
  const attemptRef = useRef(0)
  const timers = useRef<number[]>([])
  const cutPending = useRef(false)
  const lastInflate = useRef(0)
  const lastTick = useRef(0)

  const set = SETS[attempt % SETS.length]
  const heldAura = useTicker(BANK_AURA[tier], 500)

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
  }, [])

  const setPhaseBoth = (ph: Phase) => {
    phaseRef.current = ph
    setPhase(ph)
  }

  /* ---------------- tier up ---------------- */
  const tierUp = useCallback((t: number) => {
    tierRef.current = t
    setTier(t)
    const st = useStore.getState()
    st.bump('delusion', t === 5 ? 8 : 5)
    st.bump('suspicion', 3)
    const prev = (st.flags['inflation.peak'] as number) || 0
    if (t > prev) st.setFlag('inflation.peak', t)
    setBadges((b) => [...b, ...SLOTS.map((s, i) => (s.tier === t ? i : -1)).filter((i) => i >= 0)])
    audio.sfx('ding', { pitch: 1 + t * 0.12 })
    fx.shake(140 + t * 70)
    if (t === 3) audio.sfx('orchestra', { vol: 0.55 })
    if (t === 4) {
      audio.music.swell(2.6)
      audio.say('Ladies and gentlemen: he is still holding.', { voice: 'announcer', rate: 1.05 })
    }
    if (t === 5) {
      audio.sfx('orchestra', { vol: 0.9 })
      audio.sfx('riser')
      fx.flash('#d4a84a')
      fx.subtitle('RELEASE. (He would not.)', 'THE MACHINE', 3000)
    }
  }, [])

  /* ---------------- bank ---------------- */
  const bank = useCallback(() => {
    const t = tierRef.current
    setPhaseBoth('banked')
    setBankedTier(t)
    const st = useStore.getState()
    const gain = BANK_AURA[t]
    st.bump('aura', gain)
    audio.sfx('coin')
    if (t >= 4) audio.sfx('cashRegister')
    if (t === 5) {
      audio.sfx('fanfare')
      fx.meme('stonks')
      st.unlock('inflation-max', 'Pressure Cooker', 'Banked a Tier V achievement without exploding. Allegedly.')
    } else if (t >= 3) fx.meme('aura', `+${gain}`)
    st.note(
      `Inflated "${SETS[attemptRef.current % SETS.length].titles[0]}" up to Tier ${ROMAN[t]} (${TIER_NAME[t]}) and banked it for +${gain} aura`,
    )
  }, [])

  /* ---------------- burst ---------------- */
  const burst = useCallback(() => {
    holdRef.current = false
    setHolding(false)
    setPhaseBoth('popping')
    const st = useStore.getState()
    st.setFlag('inflation.burst', true)
    st.bump('aura', -500)
    audio.stopVoice()
    audio.music.cut()
    cutPending.current = true
    audio.sfx('pop')
    fx.shake(900)
    fx.flash('#ff4b1f')
    fx.meme('skull')
    setScatter(true)
    st.note(
      `Held "${SETS[attemptRef.current % SETS.length].titles[0]}" past Tier V until it burst (-500 aura, Achievement.exe crashed)`,
    )
    later(() => {
      audio.music.resume()
      cutPending.current = false
      audio.sfx('sadTrombone')
      later(() => audio.sfx('error'), 500)
      setShowWin(true)
      setPhaseBoth('burst')
      fx.glitch(500)
    }, 1200)
  }, [later])

  /* ---------------- main loop ---------------- */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const ph = phaseRef.current
      if (ph === 'idle' || ph === 'pumping') {
        let np = pRef.current
        if (holdRef.current) {
          np += (14 + 0.1 * np) * dt
          if (now - lastInflate.current > 120) {
            lastInflate.current = now
            audio.sfx('inflate', { level: Math.min(1, np / BURST), vol: 0.45 })
          }
          if (np >= RED && now - lastTick.current > 95) {
            lastTick.current = now
            audio.sfx('tick', { vol: 0.5, pitch: 1.4 })
          }
          for (let t = tierRef.current + 1; t <= 5; t++) if (np >= THR[t - 1]) tierUp(t)
          if (np >= BURST) {
            pRef.current = BURST
            setP(BURST)
            burst()
          }
        } else if (np > 0) {
          np = Math.max(0, np - 70 * dt)
          if (np === 0 && ph === 'idle' && tierRef.current === 0) setPhaseBoth('idle')
        }
        if (phaseRef.current === 'idle' || phaseRef.current === 'pumping') {
          if (np !== pRef.current) {
            pRef.current = np
            setP(np)
          }
        }
      } else if (ph === 'banked' && pRef.current > 0) {
        // after banking, pressure bleeds off but the plaque stays inflated
        const np = Math.max(0, pRef.current - 38 * dt)
        pRef.current = np
        setP(np)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tierUp, burst])

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      if (cutPending.current) audio.music.resume()
    },
    [],
  )

  /* ---------------- input ---------------- */
  const startHold = () => {
    const ph = phaseRef.current
    if (ph !== 'idle' && ph !== 'pumping') return
    if (holdRef.current) return
    audio.init()
    holdRef.current = true
    setHolding(true)
    setPhaseBoth('pumping')
  }
  const release = () => {
    if (!holdRef.current) return
    holdRef.current = false
    setHolding(false)
    if (phaseRef.current !== 'pumping') return
    if (tierRef.current >= 1) {
      bank()
    } else {
      setPhaseBoth('idle')
      if (pRef.current > 0.5) audio.sfx('deflate')
    }
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (!e.repeat) startHold()
    }
  }
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      release()
    }
  }
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    startHold()
  }

  /* ---------------- replay ---------------- */
  const replay = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (cutPending.current) { audio.music.resume(); cutPending.current = false }
    pRef.current = 0
    tierRef.current = 0
    holdRef.current = false
    attemptRef.current += 1
    setAttempt(attemptRef.current)
    setP(0)
    setTier(0)
    setBadges([])
    setShowWin(false)
    setScatter(false)
    setBankedTier(0)
    setHolding(false)
    setPhaseBoth('idle')
    audio.sfx('click')
  }

  /* ---------------- derived ---------------- */
  const pn = Math.min(1, p / BURST)
  const danger = p >= RED && (phase === 'pumping' || phase === 'idle')
  const reach = Math.round(Math.pow(p, 3) * 0.9)
  const angle = ang(p) + (p > 60 && phase === 'pumping' ? Math.sin(performance.now() / 38) * (p / 40) : 0)
  const title = set.titles[tier]
  const head = set.heads[tier]
  const live =
    phase === 'banked'
      ? `Banked Tier ${ROMAN[bankedTier]}, ${TIER_NAME[bankedTier]}. ${head}.`
      : phase === 'burst'
        ? 'It burst. Achievement.exe has stopped working.'
        : `Tier ${ROMAN[tier]}: ${title}`

  const hint = (() => {
    if (phase === 'banked' || phase === 'burst' || phase === 'popping') return ''
    if (!holding) return tier === 0 ? 'Hold the button (or Space) to pump. Release to bank the tier. Do not be greedy.' : 'Pressure bleeding off. Hold again?'
    if (tier === 0) return 'That is barely an achievement. Keep pumping.'
    if (tier === 1) return 'Press release drafted. Legal has not been consulted.'
    if (tier === 2) return 'The coffee is now "an industry."'
    if (tier === 3) return 'Reality is still in the room. For now.'
    if (tier === 4) return 'It is fine. Everything is fine. Nothing is audited.'
    return 'RELEASE. RELEASE. RELEASE.'
  })()

  const stageVars = { '--p': pn.toFixed(3), '--tier': tier } as CSSProperties

  return (
    <section className={`panel infl ${danger ? 'danger' : ''} ${phase === 'burst' || phase === 'popping' ? 'busted' : ''}`} aria-label="Achievement Inflation Machine">
      <div className="infl-head">
        <span className="label">MECHANIC 01 · ACHIEVEMENT INFLATION MACHINE</span>
        <span className="label dim">ATTEMPT {String(attempt + 1).padStart(2, '0')}</span>
      </div>
      <h2 className="h-mid">
        Inflate a <em>mundane</em> achievement.
      </h2>
      <p className="lead">
        Hold to pump. Each tier makes Arlo's accomplishment more important and slightly less true. Release to bank it. Hold past
        the red and it bursts, and so do you.
      </p>

      <div className="infl-grid">
        {/* ---------------- stage ---------------- */}
        <div className="infl-stage" style={stageVars}>
          <div className="infl-badges" aria-hidden="true">
            {badges.map((si, n) => {
              const s = SLOTS[si]
              const fly = {
                '--bx': `${(((si * 53) % 17) - 8) * 40}px`,
                '--by': `${-180 - ((si * 37) % 11) * 28}px`,
                '--br': `${(((si * 71) % 13) - 6) * 140}deg`,
              }
              return (
                <div
                  key={`${attempt}-${si}`}
                  className={`infl-badge ${scatter ? 'fly' : ''}`}
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    '--rot': `${s.rot}deg`,
                    '--sz': s.s,
                    '--d': `${(n % 4) * 60}ms`,
                    ...fly,
                  } as CSSProperties}
                >
                  <Badge slot={s} />
                </div>
              )
            })}
          </div>

          <div className={`infl-plaque t${tier} ${phase === 'popping' || phase === 'burst' ? 'popped' : ''} ${holding && tier >= 3 ? 'quake' : ''}`}>
            <span className="infl-plaque-no">
              ACHIEVEMENT №{String(1 + (attempt % 7)).padStart(4, '0')} · TIER {ROMAN[tier]} · {TIER_NAME[tier].toUpperCase()}
            </span>
            <h3 key={title} className="infl-title">
              {phase === 'burst' || phase === 'popping' ? <s>{title}</s> : title}
            </h3>
            {(phase === 'burst' || phase === 'popping') && <p className="infl-title infl-flat">{set.titles[0]}. (Instant.)</p>}
            <div className="infl-rule" />
            <p className="infl-fine">{FINE[tier]}</p>
          </div>

          <div className="infl-wire" key={head}>
            <span className="infl-wire-tag">{tier === 0 ? 'LOCAL' : 'BREAKING'}</span>
            <span className="infl-wire-txt">{head}</span>
          </div>

          {showWin && (
            <div className="win infl-win" role="alertdialog" aria-label="Achievement.exe has stopped working">
              <div className="win-title">
                <span>Achievement.exe</span>
                <button className="win-x" onClick={replay} aria-label="Close and replay">x</button>
              </div>
              <div className="win-body">
                <div className="win-icon">!</div>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 6 }}>Achievement.exe has stopped working</p>
                  <p style={{ marginBottom: 6 }}>
                    A problem caused the program to stop working correctly: it contained more hubris than the host could hold.
                    Windows will close the program and notify you if a solution to "being normal" is available.
                  </p>
                  <p style={{ fontSize: 11, color: '#404040' }}>Fault module: HUBRIS.DLL · Exception: 0x0000C0FFEE</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '0 12px 12px' }}>
                <button className="win-btn" onClick={() => audio.sfx('error')}>Debug</button>
                <button className="win-btn" onClick={replay} autoFocus>Close program</button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- controls ---------------- */}
        <div className="infl-side">
          <div className="infl-gauge">
            <svg viewBox="0 0 260 168" role="img" aria-label={`Pressure gauge at ${Math.round(pn * 100)} percent`}>
              <path d={arc(0, RED, R)} className="g-main" />
              <path d={arc(RED, BURST, R)} className="g-red" />
              <path d={arc(BURST, DIAL_MAX, R)} className="g-void" />
              {Array.from({ length: 25 }, (_, i) => {
                const pp = (i * DIAL_MAX) / 24
                const [x0, y0] = pt(ang(pp), R - 4)
                const [x1, y1] = pt(ang(pp), R - (i % 3 === 0 ? 14 : 9))
                return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className="g-tick" />
              })}
              {THR.map((th, i) => {
                const [x0, y0] = pt(ang(th), R + 3)
                const [x1, y1] = pt(ang(th), R + 12)
                const [tx, ty] = pt(ang(th), R + 22)
                return (
                  <g key={i} className={tier > i ? 'g-tier on' : 'g-tier'}>
                    <line x1={x0} y1={y0} x2={x1} y2={y1} />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle">{ROMAN[i + 1]}</text>
                  </g>
                )
              })}
              <text x={pt(ang(102), R - 28)[0]} y={pt(ang(102), R - 28)[1]} className="g-burst" textAnchor="middle">POP</text>
              <g transform={`rotate(${angle} ${CX} ${CY})`}>
                <line x1={CX} y1={CY + 12} x2={CX} y2={CY - R + 16} className="g-needle" />
                <polygon points={`${CX - 3},${CY - R + 22} ${CX + 3},${CY - R + 22} ${CX},${CY - R + 8}`} className="g-needle-tip" />
              </g>
              <circle cx={CX} cy={CY} r="9" className="g-hub" />
              <text x={CX} y={CY + 30} textAnchor="middle" className="g-read">{Math.round(pn * 100)}%</text>
            </svg>
          </div>

          <div className="infl-stats">
            <div>
              <span className="label">Press reach</span>
              <b>{reach.toLocaleString('en-US')}</b>
            </div>
            <div>
              <span className="label">Banked value</span>
              <b className="brass">+{Math.round(heldAura)}</b>
            </div>
            <div>
              <span className="label">If it pops</span>
              <b className="hot">−500</b>
            </div>
          </div>

          <div className="infl-delusion">
            <div className="infl-dl-row">
              <span className="label">Arlo Delusion</span>
              <b>{delusionShown.toFixed(0)}<small>/100</small></b>
            </div>
            <div className="infl-dl-bar"><i style={{ width: `${delusionShown}%` }} /></div>
          </div>

          {(phase === 'idle' || phase === 'pumping') && (
            <button
              className={`infl-pump ${holding ? 'on' : ''}`}
              onPointerDown={onPointerDown}
              onPointerUp={release}
              onPointerCancel={release}
              onLostPointerCapture={release}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onBlur={release}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Hold to pump the achievement. Release to bank."
            >
              <span className="infl-pump-fill" style={{ transform: `scaleY(${pn})` }} />
              <span className="infl-pump-txt">{holding ? (danger ? 'RELEASE' : 'PUMPING') : 'HOLD TO PUMP'}</span>
              <span className="infl-pump-sub">pointer / touch / space</span>
            </button>
          )}

          {hint && <p className={`infl-hint ${danger ? 'hot' : 'dim'}`}>{hint}</p>}

          {phase === 'banked' && (
            <div className="infl-result">
              <span className="stamp">Banked · Tier {ROMAN[bankedTier]}</span>
              <p className="infl-res-head">{head}</p>
              <p className="dim">+{BANK_AURA[bankedTier]} aura. {bankedTier === 0 ? 'Nothing happened, and was banked.' : set.audit}</p>
              <button className="btn" onClick={replay}>Inflate something else</button>
            </div>
          )}
          {(phase === 'burst' || phase === 'popping') && !showWin && <p className="infl-hint hot">...</p>}
          {phase === 'burst' && (
            <div className="infl-result bad">
              <span className="stamp">Burst · −500 aura</span>
              <p className="infl-res-head">"Arlo's Greatest Achievement" Pops, Leaves Coffee</p>
              <p className="dim">The pressure was real. The achievement never was.</p>
              <button className="btn hot" onClick={replay}>Replay</button>
            </div>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{live}</p>
    </section>
  )
}
