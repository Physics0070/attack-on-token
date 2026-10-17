import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore, fx } from '../state/store'
import { audio } from '../audio/engine'
import './AuraScanner.css'

/* ------------------------------------------------------------------ */
/* aura catalogue                                                      */
/* ------------------------------------------------------------------ */
interface AuraDef { name: string; hex: string; line: string }
const AURAS: Record<string, AuraDef> = {
  beige: { name: 'Beige of Mandatory Fun', hex: '#c9b48a', line: "A flat, institutional tan, the exact colour of an 'optional' trust fall. Your energy has been scheduled and pre-approved by someone named Karen-from-Ops." },
  brass: { name: 'Brass of Unearned Confidence', hex: '#d4a84a', line: "A resonant brass usually found on trumpets and men who say 'let me stop you there.' It is warm, loud, and has never once been audited." },
  vermilion: { name: 'Vermilion of Deferred Maintenance', hex: '#ff4b1f', line: "An alarm-red, the colour of a smoke detector chirping at 3 a.m. while you decide it's fine. It is not fine. It has been chirping since Q2." },
  grey: { name: 'Grey of Stationary Opinions', hex: '#8d8676', line: 'A matte, patient grey. You barely moved, so the scanner read you as scenery. A wall, but with feelings and a screen-time problem.' },
  acid: { name: 'Acid Green of the Pivot', hex: '#cfff2e', line: 'A violent chartreuse, the colour of changing direction in a moving vehicle. Investors cannot see you. They can only feel the lane change.' },
  bone: { name: 'Bone White of Unread Terms', hex: '#ece4d2', line: "A clean, trustworthy off-white, like a forty-page agreement you clicked 'I agree' on. Smooth. Suspiciously smooth." },
  olive: { name: 'Olive of Plausible Deniability', hex: '#8f9a3d', line: "A calm olive that appears whenever someone says 'I never said that' in writing." },
  gold: { name: 'Gold Leaf of Main Character (Pending Review)', hex: '#e8c35c', line: 'A thin, expensive gold, applied by hand, peeling at the edges. Main-character energy, pending review by a committee that does not exist.' },
  salmon: { name: 'Salmon of Reply-All', hex: '#f08a68', line: "A friendly pink-orange that blooms whenever someone hits Reply All with 'Thanks!' to four hundred people." },
  orange: { name: 'Burnt Orange of Humble Brags', hex: '#d9701f', line: "A scorched amber. The colour of 'I'm just so grateful' followed by a screenshot of the number." },
  chrome: { name: 'Chrome of Mild Concern', hex: '#b9b4a8', line: "A cold, reflective grey that makes strangers ask 'are you okay?' using only their eyes." },
  void: { name: 'Void Black of Read Receipts', hex: '#3b332b', line: "A deep, total black. The colour of 'Seen 11:42'. Light goes in. No reply comes out." },
  sage: { name: 'Sage of Sleeping on Calls', hex: '#9fae8a', line: 'A soft, dusty green. The colour of someone muting themselves to lie down. We all knew. We all let it happen.' },
}

type Tier = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
const TIER_NAME: Record<Tier, string> = {
  S: 'Main Character (Pending)', A: 'Respectable Presence', B: 'Plausible Colleague',
  C: 'Ambient Adult', D: 'Concerning Glow', F: 'NPC (Background)',
}
const TIER_DELTA: Record<Tier, number> = { S: 40, A: 24, B: 12, C: 4, D: -8, F: -20 }
const TIER_CLOSER: Record<Tier, string> = {
  S: "Recommendation: enjoy this. It will not be repeated. Do not tell Arlo; he will treat it as a validation.",
  A: 'Recommendation: stand 10% closer to light sources and let silence do the unearned work.',
  B: "Recommendation: speak 11% slower and say 'circle back' exactly once, for authority.",
  C: 'Recommendation: nothing. Make peace with beige. Beige is the colour of safety.',
  D: 'Recommendation: close fewer tabs. Or more. The scanner will not elaborate.',
  F: 'Recommendation: sit down. Not for the scan. For you.',
}
const RESCAN_INTRO = [
  '',
  'Rescan #2. The scanner remembers you. It has opinions.',
  'Rescan #3. The scanner is checking its phone while it scans you.',
  'Rescan #4. The scanner has filed a complaint with the hold line.',
  'Rescan #5. The scanner has left a note on the printer that says, I cannot.',
  'Rescan #6. The scanner is scanning you the way you scan Terms of Service.',
]

type Motion = 'still' | 'steady' | 'jittery' | 'wild'
interface Reading {
  n: number
  motion: Motion
  amb: number; rizz: number; sigma: number; npc: number
  score: number
  tier: Tier
  yours: AuraDef
  arlo: AuraDef
  arloTier: Tier
  delta: number
  text: string
  label: string
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]
const tierOf = (s: number): Tier => (s >= 85 ? 'S' : s >= 70 ? 'A' : s >= 55 ? 'B' : s >= 40 ? 'C' : s >= 25 ? 'D' : 'F')

interface MotionStats { path: number; samples: number; sumV: number; sumV2: number; turns: number; cells: Set<number> }
const newStats = (): MotionStats => ({ path: 0, samples: 0, sumV: 0, sumV2: 0, turns: 0, cells: new Set() })

function assess(m: MotionStats, ms: number, n: number): Reading {
  const s = useStore.getState()
  const f = s.flags
  const tabs = Number(f['tabs.closed']) || 0
  const burst = !!f['inflation.burst']
  const applied = !!f['jobs.applied']
  const failed = Number(f['captcha.failed']) || 0
  const convicted = Number(f['tribunal.convicted']) || 0
  const calls = Number(f['phone.calls']) || 0

  const secs = Math.max(0.1, ms / 1000)
  const path = m.path
  const mean = m.samples ? m.sumV / m.samples : 0
  const sd = m.samples ? Math.sqrt(Math.max(0, m.sumV2 / m.samples - mean * mean)) : 0
  const cv = mean > 1 ? sd / mean : 0
  const jitter = m.samples > 3 ? m.turns / m.samples : 0
  const wide = clamp(m.cells.size / 28, 0, 1) * 1
  const avgSpeed = path / secs
  const steadiness = clamp(1 - jitter * 2.2 - Math.max(0, cv - 0.7) * 0.4, 0, 1)

  const motion: Motion = path < 70 ? 'still' : jitter > 0.26 || cv > 1.5 ? 'jittery' : avgSpeed > 1100 ? 'wild' : 'steady'
  const still = motion === 'still'
  const k = n - 1

  const amb = clamp(28 + s.delusion * 0.45 + jitter * 60 + (still ? 15 : 0) - steadiness * 18 + rnd(-6, 6))
  const rizz = clamp(42 + steadiness * 30 + wide * 14 - jitter * 35 - s.suspicion * 0.22 + tabs * 1.5 + s.aura / 6 + rnd(-8, 8) - (still ? 35 : 0) - k * 6)
  const sigma = Math.round(clamp(0.2 + steadiness * 1.8 + wide * 1.1 + s.aura / 80 - s.suspicion / 120 - jitter * 1.2 + rnd(-0.15, 0.15) - k * 0.3, -1.9, 4.2) * 100) / 100
  const npc = clamp(18 + (still ? 55 : 0) + s.suspicion * 0.35 + (1 - wide) * 22 - steadiness * 8 + jitter * 10 + rnd(-5, 5) + k * 6)
  const score = clamp(0.35 * rizz + 0.3 * (100 - npc) + 10 * sigma + 0.1 * (100 - amb) + 10)
  const tier = tierOf(score)

  // choose your aura
  let key: string
  if (still) key = score < 50 ? 'grey' : 'chrome'
  else if (s.suspicion > 65 && score < 45) key = 'void'
  else if (motion === 'jittery') key = s.delusion > 55 ? 'vermilion' : 'salmon'
  else if (motion === 'wild') key = score >= 55 ? 'acid' : 'orange'
  else if (tier === 'S') key = 'gold'
  else if (tier === 'A') key = s.delusion > 50 ? 'brass' : 'olive'
  else if (tier === 'B') key = 'bone'
  else if (tier === 'C') key = 'beige'
  else key = 'sage'
  const yours = AURAS[key]

  // choose Arlo's aura (depends on what you've done to him)
  let akey = 'beige'
  if (burst) akey = 'sage'
  else if (s.suspicion > 55) akey = 'vermilion'
  else if (s.delusion > 60) akey = 'brass'
  else if (tabs > 10) akey = 'olive'
  const arlo = AURAS[akey]
  const arloTier: Tier = s.suspicion > 55 ? 'D' : s.delusion > 60 ? 'C' : 'C'

  // delta, less impressed every rescan
  let delta = TIER_DELTA[tier] + (still ? -4 : 0) + Math.round(rnd(-3, 3))
  delta = delta >= 0 ? Math.round(delta * Math.max(0.15, 1 - 0.3 * k)) : Math.round(delta * (1 + 0.35 * k))
  if (delta === 0) delta = k > 0 ? -2 : 1

  // paragraph
  const motionLine: Record<Motion, string> = {
    still: `You did not move. The scanner measured ${Math.round(path)} px of motion over ${secs.toFixed(1)}s, which is less than the average houseplant. (Fern would like a word.)`,
    steady: 'Your motion was smooth, deliberate, and suspiciously unhurried, like someone who rehearsed a spontaneous walk to the whiteboard.',
    jittery: `Your jitter coefficient was ${(jitter * 100).toFixed(0)}%. The scanner concluded you were either typing a Slack message in the air, or Arlo.`,
    wild: 'You moved like a person late for a pitch they have not written. The scanner respects it. The scanner is also scared.',
  }
  const extra: string[] = []
  if (tabs > 0) extra.push(`You have closed ${tabs} of Arlo's tabs; the scanner records a faint aura of unburdened and a stronger aura of someone is going to be blamed for this.`)
  if (burst) extra.push('A residue of recent inflation was detected: faint, helium-adjacent, regrettable.')
  if (applied) extra.push('The scanner also detected the smell of a very fast automated rejection. It is the colour of a job you did not want.')
  if (failed > 0) extra.push(`CAPTCHA failures on record: ${failed}. The scanner is not judging. The scanner is also not not judging.`)
  if (convicted > 0) extra.push(`You convicted Arlo ${convicted} time${convicted === 1 ? '' : 's'}. The scanner remains neutral. The scanner has been seen smirking.`)
  if (calls > 0) extra.push(`${calls} phone call${calls === 1 ? '' : 's'} detected. Your aura smells like someone else's voicemail.`)
  const chosen = extra.sort(() => Math.random() - 0.5).slice(0, 2)

  const arloLine = `Meanwhile, Arlo radiates ${arlo.name}. He self-rated it S-plus-plus-plus. The scanner rated it ${arloTier}, rounded up out of fear.`
  const intro = RESCAN_INTRO[Math.min(k, RESCAN_INTRO.length - 1)]
  const text = [intro, yours.line, motionLine[motion], ...chosen, arloLine, TIER_CLOSER[tier]].filter(Boolean).join(' ')

  return { n, motion, amb, rizz, sigma, npc, score, tier, yours, arlo, arloTier, delta, text, label: `${yours.name} (${tier})` }
}

/* ------------------------------------------------------------------ */
/* canvas sim types                                                    */
/* ------------------------------------------------------------------ */
interface Ribbon { x: number; y: number; vx: number; vy: number; ang: number; spin: number; seed: number; owner: 0 | 1; trail: { x: number; y: number }[] }
interface Mote { x: number; y: number; vx: number; vy: number; life: number; max: number; owner: 0 | 1 }

const HOLD_MS = 3000
type Phase = 'idle' | 'scanning' | 'short' | 'result'

export default function AuraScanner() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [meters, setMeters] = useState({ amb: 0, rizz: 0, sigma: 0, npc: 0 })
  const [reading, setReading] = useState<Reading | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [shorts, setShorts] = useState(0)

  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<Phase>('idle')
  phaseRef.current = phase
  const scanCountRef = useRef(0)
  scanCountRef.current = scanCount
  const timer = useRef<number | null>(null)
  const mounted = useRef(true)
  const sim = useRef({
    w: 0, h: 0, dpr: 1,
    px: -999, py: -999, inside: false, hasPrev: false, pdx: 0, pdy: 0, lastX: 0, lastY: 0, lastT: 0,
    ribbons: [] as Ribbon[], motes: [] as Mote[],
    t0: 0, progress: 0, energy: 0, speedNow: 0,
    stats: newStats(), colA: '#d4a84a', colB: '#ece4d2', locked: false, burstT: 0,
    last: 0, visible: true, finalFlash: 0,
  })

  /* ---------- scan lifecycle ---------- */
  const stopTimer = () => { if (timer.current != null) { window.clearInterval(timer.current); timer.current = null } }

  const finalize = useCallback(() => {
    stopTimer()
    const S = sim.current
    const n = scanCountRef.current + 1
    const r = assess(S.stats, HOLD_MS, n)
    S.colA = r.arlo.hex; S.colB = r.yours.hex; S.locked = true; S.burstT = 1; S.finalFlash = 1
    setReading(r); setScanCount(n); setPhase('result'); setProgress(1)
    setMeters({ amb: r.amb, rizz: r.rizz, sigma: r.sigma, npc: r.npc })

    audio.sfx('ding')
    window.setTimeout(() => {
      if (r.tier === 'S' || r.tier === 'A') { audio.sfx('orchestra'); fx.flash('#d4a84a') }
      else if (r.tier === 'B' || r.tier === 'C') { audio.sfx('success') }
      else { audio.sfx('sadTrombone'); fx.meme(r.tier === 'F' ? 'npc' : 'L') }
    }, 160)

    const st = useStore.getState()
    st.bump('aura', r.delta)
    if (r.tier === 'S' || r.tier === 'A') st.bump('delusion', 4); else st.bump('suspicion', 3)
    if (n > 1) st.bump('suspicion', 1)
    st.setFlag('aura.scan', r.label)
    st.note(`Scanned the visitor's aura: ${r.yours.name} (${r.tier}), ${r.delta >= 0 ? '+' : ''}${r.delta} aura${n > 1 ? `, scan #${n}, scanner unimpressed` : ''}`)
    st.unlock('aura.first', 'Professionally Scanned', 'Had your aura assessed by a machine that Arlo built on a Tuesday.')
    if (r.tier === 'S') st.unlock('aura.gold', 'Gold Leaf (Pending Review)', 'Reached S-tier. Arlo has asked for a recount.')
    if (r.delta <= -20) st.unlock('aura.debt', 'Aura Debt', 'Lost 20+ aura in a single scan. The scanner offers financing.')
    if (r.motion === 'still') st.unlock('aura.statue', 'Wall With Opinions', 'Held still for the whole scan. Fern is proud.')
    if (n >= 4) st.unlock('aura.hypo', 'Rescan Enjoyer', 'Scanned your aura four times. It did not improve.')
  }, [])

  const startScan = useCallback(() => {
    if (phaseRef.current === 'scanning') return
    audio.init()
    const S = sim.current
    S.stats = newStats(); S.t0 = performance.now(); S.progress = 0; S.locked = false
    S.colA = '#d4a84a'; S.colB = '#ece4d2'; S.hasPrev = false
    setReading(null); setPhase('scanning'); setProgress(0); setMeters({ amb: 0, rizz: 0, sigma: 0, npc: 0 })
    audio.sfx('riser')
    let lastTick = 0
    stopTimer()
    timer.current = window.setInterval(() => {
      const el = performance.now() - S.t0
      const p = Math.min(1, el / HOLD_MS)
      S.progress = p
      setProgress(p)
      if (el - lastTick > 250) { lastTick = el; audio.sfx('tick', { pitch: 1 + p * 1.2, vol: 0.5 }) }
      // live preview readouts, ticking toward a moving target
      const e = S.energy
      setMeters((m) => ({
        amb: clamp(m.amb + (35 + e * 40 + rnd(-14, 14) - m.amb) * 0.35),
        rizz: clamp(m.rizz + (30 + p * 40 - e * 10 + rnd(-18, 18) - m.rizz) * 0.35),
        sigma: Math.round((m.sigma + (0.2 + p * 1.3 + rnd(-0.6, 0.6) - m.sigma) * 0.35) * 100) / 100,
        npc: clamp(m.npc + (40 - e * 20 + rnd(-16, 16) - m.npc) * 0.35),
      }))
      if (p >= 1) finalize()
    }, 80)
  }, [finalize])

  const endHold = useCallback(() => {
    if (phaseRef.current !== 'scanning') return
    stopTimer()
    audio.sfx('error'); audio.sfx('cut')
    setPhase('short'); setProgress(0)
    setShorts((s) => s + 1)
    useStore.getState().incFlag('aura.shorts')
  }, [])

  /* ---------- canvas: size, pointer, loop ---------- */
  useEffect(() => {
    mounted.current = true
    const cv = canvas.current!, host = wrap.current!
    const ctx = cv.getContext('2d')!
    const S = sim.current
    let raf = 0

    const resize = () => {
      const w = Math.max(280, Math.floor(host.clientWidth))
      const h = Math.round(Math.max(320, Math.min(470, w * 0.52)))
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      S.w = w; S.h = h; S.dpr = dpr
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr)
      cv.style.width = w + 'px'; cv.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!S.ribbons.length) {
        for (let i = 0; i < 44; i++) {
          const owner = (i % 2) as 0 | 1
          S.ribbons.push({ x: w * (owner ? 0.7 : 0.3), y: h * 0.5, vx: 0, vy: 0, ang: rnd(0, 6.28), spin: rnd(0.4, 1.3) * (Math.random() < 0.5 ? -1 : 1), seed: rnd(0, 100), owner, trail: [] })
        }
      }
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(host)
    const io = new IntersectionObserver(([e]) => { S.visible = e.isIntersecting }, { threshold: 0.05 })
    io.observe(host)

    const toLocal = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    const onMove = (e: PointerEvent) => {
      const p = toLocal(e)
      S.px = p.x; S.py = p.y; S.inside = true
      if (phaseRef.current !== 'scanning') { S.hasPrev = false; return }
      if (S.hasPrev) {
        const dx = p.x - S.lastX, dy = p.y - S.lastY
        const d = Math.hypot(dx, dy)
        if (d > 2) {
          const dt = Math.max(1, e.timeStamp - S.lastT) / 1000
          const v = d / dt
          const st = S.stats
          st.path += d; st.samples++; st.sumV += v; st.sumV2 += v * v
          if (S.pdx * dx + S.pdy * dy < 0) st.turns++
          S.pdx = dx; S.pdy = dy
          const cx = Math.floor((p.x / S.w) * 7), cy = Math.floor((p.y / S.h) * 4)
          st.cells.add(clamp(cx, 0, 6) * 4 + clamp(cy, 0, 3))
          S.speedNow = v
          // paint motes along the path
          const owner = Math.random() < 0.5 ? 0 : 1
          for (let i = 0; i < 3; i++) {
            if (S.motes.length > 420) S.motes.shift()
            S.motes.push({ x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6), vx: dx * rnd(1, 4) + rnd(-30, 30), vy: dy * rnd(1, 4) + rnd(-30, 30), life: 0, max: rnd(0.8, 1.6), owner: owner as 0 | 1 })
          }
        }
      }
      S.lastX = p.x; S.lastY = p.y; S.lastT = e.timeStamp; S.hasPrev = true
    }
    const onLeave = () => { S.inside = false }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      cv.setPointerCapture?.(e.pointerId)
      cv.focus({ preventScroll: true })
      const p = toLocal(e); S.px = p.x; S.py = p.y; S.inside = true
      startScan()
    }
    const onUp = () => endHold()
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerleave', onLeave)
    cv.addEventListener('pointerdown', onDown)
    cv.addEventListener('pointerup', onUp)
    cv.addEventListener('pointercancel', onUp)
    cv.addEventListener('lostpointercapture', onUp)
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); startScan() } }
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); endHold() } }
    cv.addEventListener('keydown', onKeyDown)
    cv.addEventListener('keyup', onKeyUp)
    cv.addEventListener('blur', onUp)

    const sil = (owner: 0 | 1) => {
      const s = S.h * 0.4
      return { cx: S.w * (owner ? 0.7 : 0.3), cy: S.h * 0.66, s }
    }
    const drawSil = (owner: 0 | 1, col: string, alpha: number) => {
      const { cx, cy, s } = sil(owner)
      ctx.save(); ctx.translate(cx, cy)
      ctx.beginPath()
      const hr = s * 0.17
      ctx.arc(0, -s * 0.78, hr, 0, Math.PI * 2)
      ctx.moveTo(-s * 0.5, s * 0.34)
      ctx.bezierCurveTo(-s * 0.5, -s * 0.34, -s * 0.2, -s * 0.5, 0, -s * 0.5)
      ctx.bezierCurveTo(s * 0.2, -s * 0.5, s * 0.5, -s * 0.34, s * 0.5, s * 0.34)
      ctx.closePath()
      ctx.fillStyle = 'rgba(20,17,14,0.92)'; ctx.fill()
      ctx.lineWidth = 1; ctx.strokeStyle = col; ctx.globalAlpha = alpha; ctx.stroke(); ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(167,159,139,0.8)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'
      ctx.fillText(owner ? 'SUBJECT B · YOU (UNVERIFIED)' : 'SUBJECT A · ARLO P-V', 0, s * 0.34 + 18)
      if (owner) { ctx.font = `${Math.round(hr * 1.5)}px "Instrument Serif", serif`; ctx.fillStyle = 'rgba(236,228,210,0.55)'; ctx.fillText('?', 0, -s * 0.78 + hr * 0.5) }
      ctx.restore()
    }

    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame)
      if (!S.visible) { S.last = ts; return }
      const dt = Math.min(0.05, (ts - (S.last || ts)) / 1000); S.last = ts
      const t = ts / 1000
      const scanning = phaseRef.current === 'scanning'
      const done = phaseRef.current === 'result'
      // energy follows speed while scanning
      const target = scanning ? Math.min(1, S.speedNow / 900) : done ? 0.55 : 0.08
      S.energy += (target - S.energy) * Math.min(1, dt * 6)
      S.speedNow *= Math.pow(0.02, dt)
      const prog = scanning ? S.progress : done ? 1 : 0
      const intensity = scanning ? 0.2 + 0.8 * prog * (0.35 + S.energy) : done ? 0.9 : 0.14
      if (S.burstT > 0) S.burstT = Math.max(0, S.burstT - dt * 1.3)
      if (S.finalFlash > 0) S.finalFlash = Math.max(0, S.finalFlash - dt * 2)

      const { w, h } = S
      ctx.fillStyle = '#0e0c09'; ctx.fillRect(0, 0, w, h)
      // measuring grid
      ctx.strokeStyle = 'rgba(236,228,210,0.045)'; ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x < w; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h) }
      for (let y = 0; y < h; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5) }
      ctx.stroke()
      ctx.fillStyle = 'rgba(167,159,139,0.9)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'left'
      ctx.fillText(scanning ? `SCANNING ${(prog * 3).toFixed(1)}s / 3.0s` : done ? 'READING COMPLETE' : 'IDLE · HOLD TO SCAN', 12, 18)
      ctx.textAlign = 'right'; ctx.fillText('AURA-O-METER v0.3 · UNCALIBRATED', w - 12, 18)

      // silhouettes (outline tinted by locked aura)
      drawSil(0, S.locked ? S.colA : '#ece4d2', S.locked ? 1 : 0.5)
      drawSil(1, S.locked ? S.colB : '#ece4d2', S.locked ? 1 : 0.5)

      // ribbons
      ctx.globalCompositeOperation = 'lighter'
      ctx.lineCap = 'round'
      const A = sil(0), B = sil(1)
      for (const r of S.ribbons) {
        const o = r.owner ? B : A
        r.ang += dt * r.spin * (0.5 + S.energy * 2.2)
        const rad = o.s * (0.5 + 0.18 * Math.sin(t * 0.7 + r.seed)) * (0.78 + intensity * 0.55)
        const tx = o.cx + Math.cos(r.ang) * rad * 0.95
        const ty = o.cy - o.s * 0.32 + Math.sin(r.ang) * rad * 1.05
        let ax = (tx - r.x) * 5.5 - r.vx * 2.1 + Math.sin(t * 1.3 + r.seed * 3) * 60 * (0.3 + S.energy)
        let ay = (ty - r.y) * 5.5 - r.vy * 2.1 + Math.cos(t * 1.1 + r.seed * 2) * 60 * (0.3 + S.energy)
        if (scanning && S.inside) {
          const dx = S.px - r.x, dy = S.py - r.y
          const d = Math.hypot(dx, dy) + 30
          const f = (9000 * S.energy) / (d * d) * 60
          ax += (dx / d) * f; ay += (dy / d) * f
        }
        if (S.burstT > 0) { ax += ((r.x - o.cx) / 40) * S.burstT * 900; ay += ((r.y - o.cy) / 40) * S.burstT * 900 }
        r.vx += ax * dt; r.vy += ay * dt
        r.x += r.vx * dt; r.y += r.vy * dt
        r.trail.push({ x: r.x, y: r.y })
        if (r.trail.length > 26) r.trail.shift()
        const col = S.locked ? (r.owner ? S.colB : S.colA) : (r.owner ? (r.seed % 2 < 1 ? '#ece4d2' : '#cfff2e') : (r.seed % 2 < 1 ? '#d4a84a' : '#ff4b1f'))
        ctx.strokeStyle = col
        for (let i = 1; i < r.trail.length; i++) {
          const a = i / r.trail.length
          ctx.globalAlpha = a * a * Math.min(1, intensity * 1.1)
          ctx.lineWidth = 0.6 + a * 2.2
          ctx.beginPath(); ctx.moveTo(r.trail[i - 1].x, r.trail[i - 1].y); ctx.lineTo(r.trail[i].x, r.trail[i].y); ctx.stroke()
        }
      }
      // motes painted by your motion
      for (let i = S.motes.length - 1; i >= 0; i--) {
        const m = S.motes[i]
        m.life += dt
        if (m.life >= m.max) { S.motes.splice(i, 1); continue }
        const o = m.owner ? B : A
        m.vx += ((o.cx - m.x) * 0.6 - m.vx * 1.4) * dt; m.vy += ((o.cy - o.s * 0.3 - m.y) * 0.6 - m.vy * 1.4) * dt
        m.x += m.vx * dt; m.y += m.vy * dt
        const a = 1 - m.life / m.max
        ctx.globalAlpha = a * 0.9
        ctx.strokeStyle = S.locked ? (m.owner ? S.colB : S.colA) : (m.owner ? '#ece4d2' : '#ff4b1f')
        ctx.lineWidth = 1.4
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 0.03, m.y - m.vy * 0.03); ctx.stroke()
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'

      // scanner line
      if (scanning || S.finalFlash > 0) {
        const sweeps = 3
        const y = scanning ? (((prog * sweeps) % 1) * (h - 30)) + 24 : h * 0.5
        ctx.fillStyle = 'rgba(255,75,31,0.07)'; ctx.fillRect(0, y - 26, w, 26)
        ctx.fillStyle = '#ff4b1f'; ctx.fillRect(0, y, w, 1.5)
        ctx.fillStyle = 'rgba(255,75,31,0.9)'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'left'
        ctx.fillText(`y=${Math.round(y)}`, 12, y - 5)
      }
      if (S.finalFlash > 0) { ctx.fillStyle = `rgba(236,228,210,${S.finalFlash * 0.18})`; ctx.fillRect(0, 0, w, h) }

      // reticle + progress ring at pointer
      if (S.inside && (scanning || phaseRef.current === 'idle')) {
        ctx.strokeStyle = scanning ? '#ff4b1f' : 'rgba(236,228,210,0.6)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(S.px, S.py, 14, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(S.px - 22, S.py); ctx.lineTo(S.px - 8, S.py); ctx.moveTo(S.px + 8, S.py); ctx.lineTo(S.px + 22, S.py)
        ctx.moveTo(S.px, S.py - 22); ctx.lineTo(S.px, S.py - 8); ctx.moveTo(S.px, S.py + 8); ctx.lineTo(S.px, S.py + 22); ctx.stroke()
        if (scanning) { ctx.lineWidth = 3; ctx.strokeStyle = '#cfff2e'; ctx.beginPath(); ctx.arc(S.px, S.py, 20, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke() }
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      mounted.current = false
      cancelAnimationFrame(raf)
      stopTimer()
      ro.disconnect(); io.disconnect()
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerleave', onLeave)
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointerup', onUp)
      cv.removeEventListener('pointercancel', onUp)
      cv.removeEventListener('lostpointercapture', onUp)
      cv.removeEventListener('keydown', onKeyDown)
      cv.removeEventListener('keyup', onKeyUp)
      cv.removeEventListener('blur', onUp)
    }
  }, [startScan, endHold])

  const rescan = () => {
    audio.init(); audio.sfx('click')
    setPhase('idle'); setReading(null); setProgress(0)
    sim.current.locked = false
    sim.current.colA = '#d4a84a'; sim.current.colB = '#ece4d2'
    setMeters({ amb: 0, rizz: 0, sigma: 0, npc: 0 })
    canvas.current?.focus({ preventScroll: true })
  }

  const statusMsg =
    phase === 'idle' ? (scanCount === 0 ? 'Awaiting subject. Hold the pad for three seconds and move.' : 'Awaiting subject. Again. Somehow.')
    : phase === 'scanning' ? 'Scanning. Keep moving. Or don\'t. The scanner will remember.'
    : phase === 'short' ? (shorts >= 3 ? 'Insufficient aura to scan. Again. The scanner has seen this pattern in people who give up on standing desks.' : 'Insufficient aura to scan. Hold for the full three seconds.')
    : reading ? `Reading complete: ${reading.yours.name}, tier ${reading.tier}, ${reading.delta >= 0 ? '+' : ''}${reading.delta} aura.` : ''

  const mv = (v: number) => Math.round(v)

  return (
    <section className="panel as" aria-label="Professional Aura Scanner">
      <div className="label">MECHANIC · PROFESSIONAL AURA SCANNER</div>
      <h2 className="h-mid as-title">Have your aura <em className="hot">professionally assessed.</em></h2>
      <p className="lead as-lead">
        Press and hold the pad for three full seconds, and move your pointer while you do. Smooth, wild, twitchy or statue: the machine reads all of it. (Keyboard: focus the pad and hold Space. The scanner will assume you are a statue.)
      </p>

      <div className="as-body">
        <div className="as-pad" ref={wrap}>
          <canvas
            ref={canvas}
            tabIndex={0}
            className="as-canvas"
            aria-label="Aura scan pad. Press and hold for three seconds and move the pointer, or hold the space bar."
          />
          {phase === 'idle' && (
            <div className="as-hint" aria-hidden="true">
              <span className="label">PRESS · HOLD · MOVE</span>
            </div>
          )}
          {phase === 'short' && (
            <div className="as-hint as-short" aria-hidden="true">
              <span className="stamp">Insufficient aura</span>
            </div>
          )}
          {phase === 'scanning' && <div className="as-prog" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></div>}
        </div>

        <div className="as-read" aria-label="Readouts">
          <Meter label="Ambiguity" unit="%" value={mv(meters.amb)} pct={meters.amb} live={phase === 'scanning'} />
          <Meter label="Rizz" unit="%" value={mv(meters.rizz)} pct={meters.rizz} live={phase === 'scanning'} />
          <Meter label="Sigma coefficient" unit="σ" value={meters.sigma.toFixed(2)} pct={clamp((meters.sigma + 2) * 16)} live={phase === 'scanning'} />
          <Meter label="NPC probability" unit="%" value={mv(meters.npc)} pct={meters.npc} live={phase === 'scanning'} bad />
        </div>
      </div>

      <p className="as-status" role="status" aria-live="polite">{statusMsg}</p>

      {phase === 'result' && reading && (
        <article className="as-result" aria-label="Aura reading">
          <div className="as-result-head">
            <span className="as-swatch" style={{ background: reading.yours.hex }} aria-hidden="true" />
            <div>
              <div className="label">YOUR AURA · SCAN #{reading.n}</div>
              <h3 className="as-name">{reading.yours.name}</h3>
            </div>
            <span className={`stamp as-tier t-${reading.tier}`}>Tier {reading.tier} · {TIER_NAME[reading.tier]}</span>
          </div>
          <p className="as-text">{reading.text}</p>
          <div className="as-foot">
            <div className="as-compare">
              <span className="label">ARLO</span>
              <i className="as-dot" style={{ background: reading.arlo.hex }} aria-hidden="true" />
              <span className="as-small">{reading.arlo.name} · {reading.arloTier}</span>
            </div>
            <div className={`as-delta ${reading.delta >= 0 ? 'up' : 'down'}`}>
              {reading.delta >= 0 ? '+' : ''}{reading.delta} <small>aura</small>
            </div>
            <button type="button" className="btn" onClick={rescan}>{reading.n >= 5 ? 'Rescan (it begs you)' : 'Rescan'}</button>
          </div>
        </article>
      )}
    </section>
  )
}

function Meter({ label, unit, value, pct, live, bad }: { label: string; unit: string; value: string | number; pct: number; live: boolean; bad?: boolean }) {
  return (
    <div className={`as-meter ${live ? 'live' : ''}`}>
      <div className="as-meter-top"><span className="label">{label}</span></div>
      <div className="as-meter-val">{value}<small>{unit}</small></div>
      <div className="as-meter-bar"><i className={bad ? 'bad' : ''} style={{ width: `${clamp(pct)}%` }} /></div>
    </div>
  )
}
