import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { fx, useStore } from '../state/store'
import './Salary.css'

/* ------------------------------------------------------------------ */
/* Mechanic: Salary Negotiation Simulator                              */
/* Arlo is hiring YOU. He opens at $0 ("exposure"). It gets worse.      */
/* ------------------------------------------------------------------ */

const MAX = 1_200_000
const MILLION = 1_000_000
const tToV = (t: number) => { const v = MAX * t * t * t; const step = v < 10000 ? 10 : v < 100000 ? 100 : 500; return Math.round(v / step) * step }
const vToT = (v: number) => Math.cbrt(Math.max(0, Math.min(MAX, v)) / MAX)
const T_M = vToT(MILLION)
const money = (v: number) => '$' + Math.round(v).toLocaleString('en-US')
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

type Mood = 'smug' | 'thinking' | 'sweat' | 'panic' | 'faint' | 'sad'
type Result = null | 'walked' | 'paying' | 'paid' | 'employed' | 'million'

const LADDER: [string, number][] = [
  ['Equity in a Notion page (vesting: never)', 9000],
  ['Unlimited PTO (non-redeemable)', 14000],
  ['A LinkedOut recommendation (self-written)', 6000],
  ['Founding-team lanyard', 2500],
  ['Free coffee (bring your own)', 1200],
  ['Mentorship from a man with 1 employee', 40000],
  ['Offsite, in the living room', 25000],
  ['Dental (verbal)', 18000],
  ["Title: 'Chief of Things'", 60000],
  ['Signed headshot of Arlo', 150000],
  ['Series Z allocation (imaginary)', 400000],
]
function breakdown(v: number): [string, number][] {
  let rem = v; const out: [string, number][] = []
  for (const [n, a] of LADDER) if (a <= rem) { out.push([n, a]); rem -= a }
  out.push(['Exposure', rem])
  return out
}

const BANDS: [number, string, Mood][] = [
  [0, 'Exposure is the currency of the future.', 'smug'],
  [1500, "One and a half thousand. In exposure, that's like six figures.", 'smug'],
  [6000, "Careful. You're approaching 'compensation' territory.", 'thinking'],
  [15000, 'This is where we usually shake hands and I stop answering.', 'thinking'],
  [30000, 'I consulted my accountant. (Mom.) She says be nice.', 'sweat'],
  [60000, "That's... a lot of exposure.", 'sweat'],
  [150000, "Per annum? We're a startup. What is a 'year'?", 'panic'],
  [400000, 'I will be emailing you from a different account.', 'panic'],
  [800000, 'You are not a serious person. (Compliment.)', 'panic'],
]
const DODGES = ['The slider has feelings.', 'Whoops. It slipped.', "That's not a real number, though.", "Slider's tired. Union rules.", 'I touched nothing.']
const WALK: [number, string][] = [
  [0, 'Wait.'], [1700, "$100. Cash. (Monopoly.)"], [3400, "I'll add dental."], [5200, "I'm outside your door. Metaphorically. Check."],
  [7000, 'Mom says come back.'], [8800, 'You have 14 voicemails.'], [10600, 'Fine. YOU pay ME. I accept this as a compromise.'],
]
const JOKE = 'THIS IS A JOKE '

function ArloFace({ mood }: { mood: Mood }) {
  return (
    <svg className={`sa-face m-${mood}`} viewBox="0 0 100 100" role="img" aria-label={`Arlo looks ${mood}`}>
      <g className="sa-head">
        <path d="M22 44 C18 14 56 6 80 26 C84 32 82 40 80 44" className="sa-hair" />
        <ellipse cx="50" cy="56" rx="31" ry="36" className="sa-skull" />
        {mood === 'faint' ? (<>
          <path d="M34 48l10 10m0-10L34 58M58 48l10 10m0-10L58 58" className="sa-eye-x" />
          <path d="M38 76c8 6 16 6 24 0" className="sa-mouth" /><rect x="48" y="76" width="6" height="9" rx="3" className="sa-tongue" />
        </>) : (<>
          {mood === 'smug' && <><path d="M32 50h14M56 50h14" className="sa-lid" /><path d="M36 74c8 4 20 2 28-6" className="sa-mouth" /></>}
          {mood === 'thinking' && <><circle cx="39" cy="50" r="3" className="sa-eye" /><circle cx="61" cy="50" r="3" className="sa-eye" /><path d="M54 40l14-5" className="sa-brow" /><path d="M40 74h20" className="sa-mouth" /></>}
          {mood === 'sweat' && <><circle cx="39" cy="52" r="3.4" className="sa-eye" /><circle cx="61" cy="52" r="3.4" className="sa-eye" /><path d="M38 76c8-4 16-4 24 0" className="sa-mouth" /><path d="M78 40q4 8 0 12q-4-4 0-12z" className="sa-drop" /></>}
          {mood === 'panic' && <><circle cx="39" cy="50" r="6" className="sa-eye-big" /><circle cx="61" cy="50" r="6" className="sa-eye-big" /><circle cx="39" cy="50" r="1.6" className="sa-eye" /><circle cx="61" cy="50" r="1.6" className="sa-eye" /><ellipse cx="50" cy="76" rx="8" ry="6" className="sa-mouth-o" /><path d="M78 36q4 8 0 12q-4-4 0-12zM20 44q4 8 0 12q-4-4 0-12z" className="sa-drop" /></>}
          {mood === 'sad' && <><circle cx="39" cy="52" r="3" className="sa-eye" /><circle cx="61" cy="52" r="3" className="sa-eye" /><path d="M38 78c8-6 16-6 24 0" className="sa-mouth" /></>}
        </>)}
        <path d="M30 94c4-14 12-18 20-18s16 4 20 18" className="sa-collar" />
      </g>
    </svg>
  )
}

function Badge({ rounds }: { rounds: number }) {
  return (
    <div className="sa-printer" aria-live="polite">
      <div className="sa-slot" aria-hidden="true" />
      <div className="sa-badge-clip">
        <div className="sa-badge">
          <div className="sa-lanyard" aria-hidden="true" />
          <span className="label">VEXXITY LABS</span>
          <div className="sa-photo" aria-hidden="true"><svg viewBox="0 0 60 60"><circle cx="30" cy="24" r="11" /><path d="M8 58c3-16 12-20 22-20s19 4 22 20" /></svg></div>
          <b className="sa-eno">EMPLOYEE #1</b>
          <span className="stamp sa-unpaid">(unpaid)</span>
          <ul className="sa-bl"><li>Onboarding: 47 tabs</li><li>Start date: immediately</li><li>End date: not applicable</li><li>Rounds negotiated: {rounds}</li></ul>
          <div className="sa-bars" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default function Salary() {
  const sim = useRef({ t: 0, vel: 0, rest: 0, pointer: 0, dragging: false, inDetent: false, startT: 0 })
  const stageRef = useRef(1)
  const resultRef = useRef<Result>(null)
  const roundsRef = useRef(0)
  const askRef = useRef(2500)
  const lastBand = useRef(-1)
  const lastTickN = useRef(0)
  const timers = useRef<number[]>([])
  const bubbleT = useRef(0)
  const lastDodgeT = useRef(0)
  const lastDodgeSay = useRef(0)
  const lastVal = useRef(0)
  const dodges = useRef(0)
  const trackEl = useRef<HTMLDivElement>(null)
  const handleEl = useRef<HTMLDivElement>(null)
  const fillEl = useRef<HTMLDivElement>(null)
  const bandEl = useRef<HTMLDivElement>(null)
  const numEl = useRef<HTMLSpanElement>(null)
  const acceptEl = useRef<HTMLButtonElement>(null)
  const zoneEl = useRef<HTMLDivElement>(null)
  const accOff = useRef({ x: 0, y: 0 })

  const [stage, setStage] = useState(1)
  const [rounds, setRounds] = useState(0)
  const [val, setVal] = useState(0)
  const [result, setResultS] = useState<Result>(null)
  const [mood, setMood] = useState<Mood>('smug')
  const [bubble, setBubble] = useState<{ text: string; thinking: boolean; k: number }>({ text: 'Welcome to Vexxity Labs. We are thrilled to meet you. Please drag the handle to state your salary expectations.', thinking: false, k: 0 })
  const [ask, setAsk] = useState(2500)
  const [tired, setTired] = useState(false)
  const [scale, setScale] = useState(1)
  const [counterOpen, setCounterOpen] = useState(false)
  const [counterVal, setCounterVal] = useState('')
  const [card, setCard] = useState('')
  const [follow, setFollow] = useState(40)
  const [pp, setPp] = useState(0)

  const auraNow = useStore((st) => st.aura)
  const coarse = useMemo(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches, [])
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  const setResult = (r: Result) => { resultRef.current = r; setResultS(r) }

  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(bubbleT.current) }, [])

  /* Arlo says a thing, with a thinking beat */
  const reason = (text: string, m: Mood = 'smug', beat = 420) => {
    clearTimeout(bubbleT.current)
    setMood('thinking')
    setBubble((b) => ({ text: '', thinking: true, k: b.k + 1 }))
    bubbleT.current = window.setTimeout(() => { setMood(m); setBubble((b) => ({ text, thinking: false, k: b.k + 1 })) }, beat)
  }
  const sayNow = (text: string, m: Mood = 'smug') => { clearTimeout(bubbleT.current); setMood(m); setBubble((b) => ({ text, thinking: false, k: b.k + 1 })) }

  /* ---------------- physics loop ---------------- */
  useEffect(() => {
    let raf = 0; let last = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.033, (now - last) / 1000); last = now
      const s = sim.current; const st = stageRef.current
      const track = trackEl.current; if (!track || resultRef.current) return
      const v0 = st < 3 ? tToV(s.t) : s.t * 10000
      const target = s.dragging ? s.pointer : s.rest
      let k = 420
      if (st === 2) k = s.dragging ? 420 / (1 + 8 * Math.max(0, (v0 - 50000) / 150000)) : 240
      if (st === 3) k = s.dragging ? 55 : 200
      const c = 2 * Math.sqrt(k) * (st === 2 && !s.dragging ? 0.4 : 0.8)
      s.vel += (k * (target - s.t) - c * s.vel) * dt
      // stage 2: the slider dodges
      if (st === 2 && s.dragging && v0 > 40000 && now - lastDodgeT.current > 480 && Math.random() < 0.5) {
        lastDodgeT.current = now; s.vel -= rnd(1.2, 2.4)
        if (now - lastDodgeSay.current > 1700) { lastDodgeSay.current = now; sayNow(pick(DODGES), 'sweat'); audio.sfx('deny', { vol: 0.35 }) }
      }
      s.t += s.vel * dt
      if (s.t < 0) { s.t = 0; s.vel = 0 }
      if (s.t > 1) { s.t = 1; s.vel = 0 }
      // display value
      const detent = st < 3 && Math.abs(s.t - T_M) < 0.002
      const v = st < 3 ? (detent ? MILLION : tToV(s.t)) : Math.round((s.t * 10000) / 10) * 10
      if (numEl.current) numEl.current.textContent = (st === 3 ? '-' : '') + money(v)
      if (v !== lastVal.current) { lastVal.current = v; setVal(v) }
      const px = s.t * 100
      if (handleEl.current) handleEl.current.style.left = `${px}%`
      if (fillEl.current) fillEl.current.style.width = `${px}%`
      if (bandEl.current) {
        const w = track.clientWidth
        const diff = (s.pointer - s.t) * w
        if (s.dragging && Math.abs(diff) > 10) { bandEl.current.style.opacity = '1'; bandEl.current.style.left = `${Math.min(s.t, s.pointer) * 100}%`; bandEl.current.style.width = `${Math.abs(diff)}px` }
        else bandEl.current.style.opacity = '0'
      }
      if (s.dragging) {
        const n = Math.floor(s.t * 20)
        if (n !== lastTickN.current) { lastTickN.current = n; audio.sfx('tick', { pitch: 0.6 + s.t * 1.1, vol: 0.4 }) }
        if (st < 3) {
          let bi = -1; for (let i = 0; i < BANDS.length; i++) if (v >= BANDS[i][0]) bi = i
          if (bi > lastBand.current) { lastBand.current = bi; const b = BANDS[bi]; sayNow(b[1], b[2]); if (bi > 0) audio.sfx('coin', { vol: 0.35, pitch: 0.8 + bi * 0.08 }) }
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* idle pressure: stage 2 nudges you down, stage 3 adds late fees */
  useEffect(() => {
    if (result) return
    let n = 0
    const i = window.setInterval(() => {
      const s = sim.current
      if (s.dragging) return
      if (stageRef.current === 2 && s.t > 0.2 && n < 6) { n++; s.rest = s.t * 0.88; sayNow('I took the liberty of adjusting.', 'smug'); audio.sfx('deny', { vol: 0.35 }) }
      if (stageRef.current === 3 && n < 5) { n++; askRef.current += 50; setAsk(askRef.current); s.rest = askRef.current / 10000; sayNow('A late fee has been applied. You were late. Just now.', 'smug'); audio.sfx('error', { vol: 0.4 }) }
    }, 5200)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, result])

  /* ---------------- rounds & stages ---------------- */
  const addRound = () => {
    const n = roundsRef.current + 1
    roundsRef.current = n; setRounds(n)
    const s = useStore.getState()
    s.incFlag('salary.rounds'); s.bump('delusion', 1.5); s.bump('suspicion', 0.8); s.bump('aura', 15)
    if (n === 3) later(enterStage2, 2100)
    if (n === 7) later(enterStage3, 2300)
    return n
  }

  const enterStage2 = () => {
    if (resultRef.current || stageRef.current !== 1) return
    stageRef.current = 2; setStage(2); lastBand.current = -1
    audio.sfx('scratch', { vol: 0.7 }); fx.shake(250)
    sayNow('Quick update. The market has changed. I am the market.', 'sweat')
    audio.say('Quick update. The market has changed. I am the market.', { voice: 'arlo', sub: false })
    useStore.getState().note('Negotiated with Arlo until the salary slider started dodging')
  }

  const enterStage3 = () => {
    if (resultRef.current || stageRef.current !== 2) return
    stageRef.current = 3; setStage(3); setTired(false); dodges.current = 0
    const s = sim.current; s.dragging = false; s.t = 0.25; s.vel = 0; s.rest = 0.25; askRef.current = 2500; setAsk(2500)
    accOff.current = { x: 0, y: 0 }; acceptEl.current?.style.setProperty('--ox', '0px'); acceptEl.current?.style.setProperty('--oy', '0px')
    fx.glitch(650); fx.shake(300); audio.sfx('scratch'); later(() => audio.sfx('rimshot'), 600)
    const line = "Wait. I just ran your numbers. Honestly? You're a liability. We'll need YOU to cover a signing bonus."
    sayNow(line, 'smug'); audio.say(line, { voice: 'arlo', sub: false })
    useStore.getState().note('Was asked to pay Arlo a signing bonus to work for him')
  }

  const respond = (v: number) => {
    if (resultRef.current) return
    const st = stageRef.current
    const n = addRound()
    audio.sfx(st === 1 ? 'click' : 'deny', { vol: 0.6 })
    const s = sim.current
    if (st === 1) {
      s.rest = s.t
      const line = v === 0 ? "You haven't moved. Bold. Respect." : v < 1000 ? pick(['Noted. Exposure it is.', 'Excellent. Your commitment to exposure is on file.']) : v < 15000 ? pick(["A bold ask. I'll take it to the committee. (Me.)", 'Let me run it past legal. (Also me.)']) : pick(["Interesting. I'll circle back. Not soon.", 'Let me check with my CFO. He is a spreadsheet I named Gerald.'])
      reason(line, v > 30000 ? 'sweat' : 'smug')
    } else if (st === 2) {
      const cv = Math.max(0, Math.floor((v * rnd(0.05, 0.3)) / 100) * 100)
      s.rest = vToT(cv)
      reason(`Counter-offer: ${money(cv)} plus a handshake (verbal). Final. Until the next one.`, 'sweat')
      void n
    } else {
      const want = clamp(v, 0, 10000)
      if (want >= askRef.current) { askRef.current = Math.round(want / 10) * 10; reason('Generous! Accepted. I love a self-starter.', 'smug') }
      else { askRef.current = Math.round((askRef.current * 1.12) / 10) * 10; reason(`No. Actually it's ${money(askRef.current)} now. Inflation clause.`, 'smug') }
      setAsk(askRef.current); s.rest = askRef.current / 10000
    }
  }

  /* ---------------- pointer on the track ---------------- */
  const ptT = (e: { clientX: number }) => {
    const r = trackEl.current!.getBoundingClientRect()
    let t = clamp((e.clientX - r.left) / r.width, 0, 1)
    sim.current.inDetent = false
    if (stageRef.current < 3 && Math.abs(t - T_M) < 0.004) { t = T_M; sim.current.inDetent = true }
    return t
  }
  const onDown = (e: React.PointerEvent) => {
    if (resultRef.current) return
    audio.init()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const s = sim.current; s.dragging = true; s.pointer = ptT(e); s.startT = s.t
    lastBand.current = -1
  }
  const onMove = (e: React.PointerEvent) => { if (sim.current.dragging) sim.current.pointer = ptT(e) }
  const onUp = () => {
    const s = sim.current; if (!s.dragging) return
    s.dragging = false
    const st = stageRef.current
    if (st < 3 && s.inDetent) { million(); return }
    if (Math.abs(s.t - s.startT) < 0.012 && Math.abs(s.pointer - s.startT) < 0.012) { s.rest = s.t; return }
    const v = st < 3 ? (Math.abs(s.t - T_M) < 0.002 ? MILLION : tToV(s.pointer)) : Math.round((s.pointer * 10000) / 10) * 10
    respond(v)
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (resultRef.current) return
    const s = sim.current
    const step = e.shiftKey ? 0.05 : 0.01
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); audio.init(); s.rest = clamp(s.rest + step, 0, 1); if (stageRef.current < 3 && Math.abs(s.rest - T_M) < 0.006) s.rest = T_M }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); s.rest = clamp(s.rest - step, 0, 1) }
    else if (e.key === 'Enter') { e.preventDefault(); const st = stageRef.current; if (st < 3 && Math.abs(s.rest - T_M) < 0.002) million(); else respond(st < 3 ? tToV(s.rest) : s.rest * 10000) }
  }

  /* ---------------- counter ---------------- */
  const submitCounter = (e: React.FormEvent) => {
    e.preventDefault(); audio.init()
    const n = parseInt(counterVal.replace(/\D/g, ''), 10)
    setCounterOpen(false); setCounterVal('')
    if (!Number.isFinite(n)) { reason('That is not a number. We are not a charity. (We are, but for me.)'); return }
    if (stageRef.current < 3 && n === MILLION) { million(); return }
    const s = sim.current
    if (stageRef.current < 3) { s.rest = vToT(n); s.vel = 0 }
    if (n > MAX) { reason('That number has too many commas.', 'panic'); addRound(); return }
    respond(n)
  }

  /* ---------------- secret: exactly $1,000,000 ---------------- */
  const million = () => {
    if (resultRef.current) return
    const s = useStore.getState()
    sim.current.dragging = false; sim.current.t = T_M; sim.current.rest = T_M
    setResult('million'); setMood('faint')
    fx.glitch(900); fx.shake(500); fx.flash('#ece4d2'); audio.sfx('thud', { vol: 1 })
    later(() => audio.sfx('cashRegister'), 700)
    later(() => { audio.sfx('jackpot'); fx.meme('stonks') }, 1300)
    s.set({ salaryOutcome: 'walked' })
    s.setFlag('salary.million', true)
    s.bump('aura', 1_000_000); s.bump('delusion', -25)
    s.note('Negotiated Arlo up to exactly $1,000,000, at which point he fainted. The site paid out 1,000,000 aura')
    s.unlock('million', 'Seven Figures (Aura)', 'You named a number so correct that Arlo lost consciousness.')
    sayNow('...', 'faint')
  }

  /* ---------------- outcomes ---------------- */
  const walk = () => {
    audio.init(); audio.sfx('whoosh'); audio.sfx('click', { vol: 0.5 })
    const s = useStore.getState()
    setResult('walked'); setMood('sad'); setFollow(40)
    s.set({ salaryOutcome: 'walked' })
    s.bump('aura', 250); s.bump('delusion', -10); s.bump('suspicion', 4)
    s.note(`Walked away from a job at Vexxity Labs after ${roundsRef.current} rounds. Arlo followed`)
    WALK.forEach(([ms, line], i) => later(() => {
      fx.toast('Arlo', line, i === WALK.length - 1 ? 'error' : 'system')
      audio.sfx(i === WALK.length - 1 ? 'sadTrombone' : 'notify', { vol: 0.6 })
      if (i === 0) audio.say('Wait. Wait!', { voice: 'arlo', sub: false })
      setFollow((f) => Math.max(0, Math.round(f * 0.55)))
    }, ms))
  }

  const accept = () => {
    if (resultRef.current) return
    audio.init()
    const s = useStore.getState()
    setResult('employed'); setMood('smug')
    s.set({ salaryOutcome: 'employed' })
    s.bump('aura', -300); s.bump('delusion', 12); s.bump('suspicion', 6)
    s.note('Accepted a job at Vexxity Labs as Employee #1 (unpaid)')
    audio.sfx('success'); fx.flash('#d4a84a')
    for (let k = 0; k < 9; k++) later(() => audio.sfx('tick', { pitch: 0.6 + k * 0.05, vol: 0.35 }), 500 + k * 180)
    later(() => audio.sfx('stinger'), 2400)
    later(() => { audio.sfx('sadTrombone', { vol: 0.8 }); fx.subtitle('Welcome to the team. Team: me.', 'ARLO') }, 3200)
    setPp(1)
  }

  const onAcceptClick = (e: React.MouseEvent) => {
    const st = stageRef.current
    if (e.detail === 0 || st === 1) { accept(); return }
    if (coarse && scale > 0.46) {
      const ns = scale * 0.74; setScale(ns); audio.sfx('deny', { vol: 0.4 })
      sayNow(pick(['It got smaller. Did you see that?', 'Accept is shy.', 'Offer is shrinking. So is the window.']), 'sweat')
      return
    }
    accept()
  }

  const onZoneMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || stageRef.current < 2 || tired || resultRef.current) return
    const b = acceptEl.current, z = zoneEl.current; if (!b || !z) return
    const br = b.getBoundingClientRect(), zr = z.getBoundingClientRect()
    const cx = br.left + br.width / 2, cy = br.top + br.height / 2
    const dx = cx - e.clientX, dy = cy - e.clientY, d = Math.hypot(dx, dy)
    if (d > 115) return
    const push = (125 - d) * 1.4
    const natL = br.left - accOff.current.x, natT = br.top - accOff.current.y
    let ox = accOff.current.x + (dx / (d || 1)) * push, oy = accOff.current.y + (dy / (d || 1)) * push
    const minX = zr.left + 6 - natL, maxX = zr.right - 6 - (natL + br.width)
    const minY = zr.top + 6 - natT, maxY = zr.bottom - 6 - (natT + br.height)
    const cx2 = clamp(ox, minX, maxX), cy2 = clamp(oy, minY, maxY)
    if (Math.hypot(cx2 - ox, cy2 - oy) > push * 0.6) { ox = rnd(minX, maxX); oy = rnd(minY, maxY) } else { ox = cx2; oy = cy2 }
    accOff.current = { x: ox, y: oy }
    b.style.setProperty('--ox', `${ox}px`); b.style.setProperty('--oy', `${oy}px`)
    dodges.current++
    if (dodges.current % 2 === 0) audio.sfx('whoosh', { vol: 0.25, pitch: 1 + Math.random() * 0.4 })
    const lim = stageRef.current === 2 ? 7 : 11
    if (dodges.current >= lim) {
      setTired(true); accOff.current = { x: 0, y: 0 }
      b.style.setProperty('--ox', '0px'); b.style.setProperty('--oy', '0px')
      audio.sfx('sadTrombone', { vol: 0.35 }); sayNow('The Accept button is out of breath. Honestly, relatable.', 'sweat')
    }
  }

  const doPay = () => {
    audio.init()
    const s = useStore.getState()
    setResult('paid'); setMood('smug')
    s.set({ salaryOutcome: 'paid' })
    s.bump('aura', -2000); s.bump('delusion', 10); s.bump('suspicion', 5)
    s.note('Paid Arlo a signing bonus (in aura) for the privilege of working for him')
    audio.sfx('cashRegister'); later(() => audio.sfx('sadTrombone', { vol: 0.8 }), 1000)
    fx.toast('Payment received', '2,000 aura. Arlo has framed the receipt.', 'error')
  }

  const onCard = (e: React.ChangeEvent<HTMLInputElement>) => {
    // accepts anything, stores nothing: whatever you type becomes the joke text
    const n = e.target.value.length
    let out = ''; for (let i = 0; i < Math.min(n, 30); i++) out += JOKE[i % JOKE.length]
    setCard(out); audio.sfx('tick', { vol: 0.3 })
  }

  const again = () => {
    const s = sim.current; Object.assign(s, { t: 0, vel: 0, rest: 0, pointer: 0, dragging: false, inDetent: false, startT: 0 })
    stageRef.current = 1; roundsRef.current = 0; askRef.current = 2500; lastBand.current = -1; dodges.current = 0; accOff.current = { x: 0, y: 0 }
    acceptEl.current?.style.setProperty('--ox', '0px'); acceptEl.current?.style.setProperty('--oy', '0px')
    setStage(1); setRounds(0); setAsk(2500); setTired(false); setScale(1); setCard(''); setPp(0); setCounterOpen(false)
    setResult(null); setMood('smug'); sayNow('Back again! Same offer. $0. Exposure is evergreen.', 'smug')
    audio.init(); audio.sfx('whoosh', { vol: 0.5 })
  }

  const pkg = useMemo(() => breakdown(val), [val])
  const s3 = stage === 3
  const total = s3 ? ask : val

  return (
    <section className={`panel sa st${stage} ${result ? 'done-' + result : ''}`} aria-labelledby="sa-h">
      <div className="label">MECHANIC · SALARY NEGOTIATION SIMULATOR</div>
      <h2 className="h-mid" id="sa-h">Arlo is <em>hiring you</em>.</h2>
      <p className="lead dim sa-lead">Vexxity Labs would like to offer you a position. Drag the handle to state your number. Arlo will "take it from there".</p>

      <div className="sa-top">
        <div className="sa-arlo">
          <ArloFace mood={mood} />
          <div className="sa-bubble" aria-live="polite" key={bubble.k}>
            {bubble.thinking ? <span className="sa-dots" aria-label="Arlo is thinking"><i /><i /><i /></span> : bubble.text}
          </div>
        </div>
        <div className="sa-offer">
          <span className="label">OFFER SHEET · VEXXITY LABS · {s3 ? 'REVISED (AGAIN)' : 'DRAFT 1'}</span>
          <ul>
            <li className="cash"><span>Cash</span><b>{s3 ? '$0' : '$0'}</b></li>
            {!s3 && pkg.map(([n, a]) => <li key={n} className="in"><span>{n}</span><b>{money(a)}</b></li>)}
            {s3 && (<>
              <li className="in"><span>Exposure</span><b>priceless</b></li>
              <li className="in"><span>Signing bonus (payable by you)</span><b className="hot">-{money(ask)}</b></li>
              <li className="in"><span>Onboarding</span><b>47 tabs</b></li>
              <li className="in"><span>Dental</span><b>verbal</b></li>
            </>)}
          </ul>
          <div className="sa-total"><span className="label">{s3 ? 'NET TO YOU' : 'TOTAL COMP (NOTIONAL)'}</span><b className={s3 ? 'hot' : 'brass'}>{s3 ? '-' : ''}{money(total)}</b></div>
        </div>
      </div>

      {!result && (
        <>
          <div className="sa-board">
            <div className="sa-numrow">
              <span className="label">{s3 ? 'SIGNING BONUS · YOU PAY' : 'YOUR ANNUAL SALARY'}</span>
              <span className="label sa-stagechip">ROUND {rounds + 1} · TERMS: {stage === 1 ? 'REASONABLE' : stage === 2 ? 'FLUID' : 'INVERTED'}</span>
            </div>
            <div className={`sa-num ${s3 ? 'neg' : ''}`}><span ref={numEl}>$0</span><small>/ {s3 ? 'once' : 'yr'}</small></div>
            <div className={`sa-track ${s3 ? 'neg' : ''}`} ref={trackEl} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <div className="sa-fill" ref={fillEl} />
              <div className="sa-band" ref={bandEl} aria-hidden="true" />
              {!s3 && <i className="sa-m" aria-hidden="true" />}
              <div className="sa-handle" ref={handleEl} role="slider" tabIndex={0} aria-label="Salary" aria-valuemin={0} aria-valuemax={s3 ? 10000 : MAX} aria-valuenow={Math.round(val)} aria-valuetext={money(val)} onKeyDown={onKey} />
            </div>
            <div className="sa-scale label"><span>{s3 ? '$0' : '$0 (exposure)'}</span><span>{s3 ? '$10,000' : '$1.2M'}</span></div>
            <p className="sa-kb label">Drag to propose · arrows nudge · Enter proposes</p>
          </div>

          <div className="sa-zone" ref={zoneEl} onPointerMove={onZoneMove}>
            <button ref={acceptEl} className={`btn hot sa-accept ${tired ? 'tired' : ''}`} style={{ '--sc': scale } as React.CSSProperties} onClick={onAcceptClick}>
              {tired ? 'Accept (out of breath)' : 'Accept'}
            </button>
            {!counterOpen
              ? <button className="btn" onClick={() => { audio.init(); audio.sfx('click'); setCounterOpen(true) }}>Counter</button>
              : (
                <form className="sa-counter" onSubmit={submitCounter}>
                  <label className="label" htmlFor="sa-cin">Your counter ($)</label>
                  <input id="sa-cin" inputMode="numeric" autoFocus value={counterVal} onChange={(e) => setCounterVal(e.target.value)} placeholder={s3 ? '500' : '120000'} autoComplete="off" />
                  <button className="btn" type="submit">Send</button>
                </form>
              )}
            {s3 && <button className="btn" onClick={() => { audio.init(); audio.sfx('click'); setResult('paying') }}>Pay signing bonus</button>}
            <button className="btn ghost" onClick={walk}>Walk away</button>
          </div>
        </>
      )}

      {result === 'paying' && (
        <div className="sa-pay" role="form" aria-label="Signing bonus payment (joke)">
          <div className="sa-warn">DO NOT ENTER REAL PAYMENT INFO (this is a joke)</div>
          <div className="sa-pay-grid">
            <div><span className="label">Signing bonus</span><b>{money(ask)}</b><span className="label dim">charged in: aura (2,000)</span></div>
            <label className="sa-field">
              <span className="label">Card number (accepts anything, stores nothing, believes you)</span>
              <input value={card} onChange={onCard} placeholder="0000 0000 0000 0000 (don't)" autoComplete="off" inputMode="text" aria-describedby="sa-warnnote" />
            </label>
          </div>
          <p id="sa-warnnote" className="label dim">Whatever you type is replaced by the truth.</p>
          <div className="sa-pay-btns"><button className="btn hot" onClick={doPay}>Pay</button><button className="btn ghost" onClick={() => { audio.sfx('click'); setResult(null) }}>Back</button></div>
        </div>
      )}

      {result === 'paid' && (
        <div className="sa-res" aria-live="polite">
          <span className="stamp">paid</span>
          <h3 className="h-mid">Receipt #0001</h3>
          <ul className="sa-rec"><li><span>Signing bonus</span><b className="hot">-2,000 aura</b></li><li><span>Arlo's gratitude</span><b>0</b></li><li><span>Equity</span><b>1 Notion page (view only)</b></li><li><span>Your balance</span><b>{auraNow.toLocaleString('en-US')} aura</b></li></ul>
          <p className="dim">You paid to work for a man with one employee. That employee is now you. He has already stopped answering.</p>
          <button className="btn" onClick={again}>Renegotiate</button>
        </div>
      )}

      {result === 'walked' && (
        <div className="sa-res" aria-live="polite">
          <span className="stamp">walked</span>
          <h3 className="h-mid">You walked.</h3>
          <p className="dim">Round {rounds}. Aura +250. Arlo's pride: pending.</p>
          <div className="sa-follow"><span className="label">ARLO IS BEHIND YOU</span><b>{follow === 0 ? 'inside your personal space' : `${follow} m`}</b></div>
          <button className="btn ghost" onClick={again}>Go back (he'll be there)</button>
        </div>
      )}

      {result === 'employed' && (
        <div className="sa-res" aria-live="polite">
          <span className="stamp">hired</span>
          <h3 className="h-mid">Welcome aboard.</h3>
          <Badge rounds={rounds} />
          <p className="dim sa-welcome">Your onboarding includes 47 tabs, a LinkedOut recommendation you'll write about yourself, and a lanyard.</p>
          <button className="btn ghost" onClick={again}>Quit (he won't process it)</button>
        </div>
      )}

      {result === 'million' && (
        <div className="sa-res sa-faint" aria-live="polite">
          <span className="stamp">arlo has fainted</span>
          <h3 className="h-mid">$1,000,000. Exactly.</h3>
          <p className="dim">A number so correct that Arlo lost consciousness. The site, unable to wake him, has paid you instead.</p>
          <div className="sa-mil"><b className="brass">+1,000,000</b><span className="label">aura, delivered</span></div>
          <button className="btn" onClick={again}>Revive him</button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{pp ? 'Employee badge printed' : ''}</span>
    </section>
  )
}
