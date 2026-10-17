import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { fx, useStore } from '../state/store'
import './SlotMachine.css'

/* ------------------------------------------------------------------ */
/* Mechanic: Thought Leadership Engine                                 */
/* A slot machine that manufactures LinkedOut posts. Mom comments first. */
/* ------------------------------------------------------------------ */

interface Theme { key: string; event: string; lesson: string; tag: string }
const THEMES: Theme[] = [
  { key: 'coffee', event: "I spilled coffee on a client's laptop", lesson: "Failure is just espresso that hasn't found its cup yet.", tag: '#SpillTheBeans' },
  { key: 'train', event: 'I missed my train by 4 seconds', lesson: "The train doesn't wait. Neither should your Q3 roadmap.", tag: '#TrackYourGoals' },
  { key: 'layoff', event: 'I was let go on a Tuesday (by a chatbot)', lesson: 'Rejection is redirection. Redirection is a funnel. Funnels are sales.', tag: '#OpenToWork #OpenToVibes' },
  { key: 'wedding', event: 'I read a wedding RSVP twice', lesson: 'Say yes to the plus-one of opportunity.', tag: '#PlusOneMindset' },
  { key: 'airport', event: 'I got stuck in Terminal B for 11 hours', lesson: 'Delays are just stakeholders in disguise.', tag: '#GateGrowth' },
  { key: 'dog', event: 'My dog sat on my keyboard and shipped to production', lesson: 'Delegation is trusting someone with four legs.', tag: '#GoodBoyLeadership' },
  { key: 'gym', event: 'I did one (1) pushup at 5 AM', lesson: 'Consistency compounds. So does one pushup, in theory.', tag: '#5AMClub' },
  { key: 'elevator', event: 'I rode the elevator with our CEO for 14 floors', lesson: 'Silence is a pitch. Eye contact is the deck.', tag: '#ElevatorPitch' },
  { key: 'parking', event: 'I paid $38 for parking', lesson: 'Know your worth. Then park for less.', tag: '#ValueProp' },
  { key: 'wifi', event: 'The WiFi dropped during my keynote', lesson: 'Real leaders stay connected. In spirit. Through a hotspot.', tag: '#Resilience' },
  { key: 'intern', event: 'I mentored an intern for 6 minutes', lesson: 'Teaching is just learning with a lanyard.', tag: '#MentorMonday' },
  { key: 'toaster', event: 'My toaster burned my bagel', lesson: 'Everything is a lesson if you ignore the smoke.', tag: '#CrispyPerformance' },
]
const N = THEMES.length

const PREFIXES = ['Humbled to announce:', 'Thrilled to share:', "I'm not crying, you're crying:", 'Unpopular opinion:', 'Day 412 of building in public:', 'Nobody talks about this, but', 'Hot take:', 'Read this twice.', "I almost didn't post this, but", 'Agree?']
const HUMBLE = ['Humbled to announce:', 'Honored and humbled to announce:', 'Deeply honored, truly humbled, forever grateful to announce:', 'Humbled. Honored. Grateful. Hydrated. Thrilled to announce:']
const NPCS: [string, string][] = [
  ['Brad M. · Growth Hacker', "Great insight! Let's circle back offline."],
  ['Kayleigh · Ex-Intern', 'This.'],
  ['Synergy Bot', 'Agree 100%. Let’s connect.'],
  ['Dan · Compliance', 'I have flagged this post. For my own enjoyment.'],
  ['Priya · Thought Follower', 'Thanks for sharing. Following for more.'],
  ['Recruiter', 'Open to work? We are open to you being open.'],
  ['A Stranger', 'I have read this four times. I am worried.'],
  ['Mark · Visionary', 'Wow. Reminds me of a post I wrote.'],
]
const MOM_TAILS = ['', ' (edited)', '. did you eat?', '. this is a lot of posts', '. your father says hi', '. is this the machine again']
const JAMS = ["You didn't pull it. I saw.", 'The lever is fine. You are holding it wrong.', 'There is no lever. Please step away from the machine.', 'That lever has never jammed. Remove the word "jam" from the log.']

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const fmt = (n: number) => { n = Math.floor(n); return n < 10000 ? n.toLocaleString('en-US') : n < 1e6 ? (n / 1e3).toFixed(1) + 'K' : (n / 1e6).toFixed(1) + 'M' }

interface Post { id: number; text: string; jackpot: boolean; near: boolean; target: { likes: number; comments: number; shares: number; views: number }; comments: [string, string][]; event: string }
interface Sim { pos: number; mode: 'idle' | 'spin' | 'stop' | 'settle'; v: number; t0: number; p0: number; pT: number; dur: number; stopAt: number; idx: number; lastRow: number; settleT0: number }

function roll(pulls: number, jackDone: boolean): { themes: number[]; jackpot: boolean; near: boolean } {
  const jackpot = !jackDone ? pulls >= 5 || (pulls >= 2 && Math.random() < 0.16) : Math.random() < 0.03
  if (jackpot) { const t = Math.floor(Math.random() * N); return { themes: [t, t, t], jackpot: true, near: false } }
  if (Math.random() < 0.38) {
    const a = Math.floor(Math.random() * N); let b = Math.floor(Math.random() * N); while (b === a) b = Math.floor(Math.random() * N)
    const slot = Math.floor(Math.random() * 3); const t = [a, a, a]; t[slot] = b
    return { themes: t, jackpot: false, near: true }
  }
  const idx = shuffle([...Array(N).keys()]).slice(0, 3)
  return { themes: idx, jackpot: false, near: false }
}

export default function SlotMachine() {
  const orders = useMemo(() => [shuffle([...Array(N).keys()]), shuffle([...Array(N).keys()]), shuffle([...Array(N).keys()])], [])
  const sims = useRef<Sim[]>([0, 1, 2].map(() => ({ pos: 0, mode: 'idle', v: 0, t0: 0, p0: 0, pT: 0, dur: 1, stopAt: 0, idx: 0, lastRow: 0, settleT0: 0 })))
  const strips = useRef<(HTMLDivElement | null)[]>([null, null, null])
  const wins = useRef<(HTMLDivElement | null)[]>([null, null, null])
  const pullsRef = useRef(0)
  const jamsRef = useRef(0)
  const jackRef = useRef(false)
  const busy = useRef(false)
  const result = useRef<{ themes: number[]; jackpot: boolean; near: boolean }>({ themes: [0, 0, 0], jackpot: false, near: false })
  const timers = useRef<number[]>([])
  const lastTick = useRef(0)
  const postId = useRef(1)
  const confetti = useRef<HTMLCanvasElement>(null)
  const confettiOn = useRef(0)
  const dragRef = useRef<{ y0: number; moved: number } | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const leverRef = useRef(0)

  const [lever, setLever] = useState(0)
  const [leverMode, setLeverMode] = useState<'free' | 'drag' | 'down' | 'up' | 'rattle'>('free')
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'result' | 'jammed'>('idle')
  const [pulls, setPulls] = useState(0)
  const [status, setStatus] = useState('Pull the lever. Drag it, or just click. Arlo calls this "content creation".')
  const [done, setDone] = useState([false, false, false])
  const [post, setPost] = useState<Post | null>(null)
  const [counts, setCounts] = useState({ likes: 0, comments: 0, shares: 0, views: 0 })
  const [shown, setShown] = useState<[string, string][]>([])
  const [viral, setViral] = useState(false)
  const [payout, setPayout] = useState(false)

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }

  /* ---------------- reel engine ---------------- */
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const V = 24
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      sims.current.forEach((r, i) => {
        const strip = strips.current[i]; const win = wins.current[i]
        if (!strip || !win) return
        const H = win.clientHeight
        if (r.mode === 'spin') {
          r.v = Math.min(V, r.v + 110 * dt)
          r.pos += r.v * dt
          if (now >= r.stopAt) {
            const k = Math.ceil((r.pos + 3 - r.idx) / N)
            r.pT = r.idx + k * N
            r.p0 = r.pos
            const dist = r.pT - r.p0
            r.dur = (0.7 + dist * 0.07) * 1000
            r.t0 = now
            r.mode = 'stop'
          }
        } else if (r.mode === 'stop') {
          const k = Math.min(1, (now - r.t0) / r.dur)
          r.pos = r.p0 + (r.pT - r.p0) * (1 - Math.pow(1 - k, 3))
          r.v = (r.pT - r.p0) * 3 * Math.pow(1 - k, 2) / (r.dur / 1000)
          if (k >= 1) {
            r.pos = r.pT; r.mode = 'settle'; r.settleT0 = now; r.v = 0
            audio.sfx('slot', { pitch: 0.85 + i * 0.18 })
            setDone((d) => d.map((x, j) => (j === i ? true : x)))
          }
        } else if (r.mode === 'settle') {
          const s = (now - r.settleT0) / 1000
          r.pos = r.pT + 0.09 * Math.exp(-s * 11) * Math.sin(s * 46)
          if (s > 0.4) { r.pos = r.pT; r.mode = 'idle'; r.pos = ((r.pT % N) + N) % N; onReelStopped(i) }
        }
        const row = Math.floor(r.pos)
        if ((r.mode === 'stop') && row !== r.lastRow && now - lastTick.current > 45) {
          lastTick.current = now
          audio.sfx('tick', { pitch: 0.7 + Math.max(0, Math.min(1, 1 - (r.pT - r.pos) / 12)) * 0.6, vol: 0.45 })
        }
        r.lastRow = row
        const p = ((r.pos % N) + N) % N
        strip.style.transform = `translate3d(0,${(-p * H).toFixed(1)}px,0)`
        strip.style.filter = r.v > 9 ? `blur(${Math.min(2.4, (r.v - 9) * 0.16).toFixed(2)}px)` : ''
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => { timers.current.forEach(clearTimeout); confettiOn.current = 0 }, [])

  /* ---------------- counters ---------------- */
  useEffect(() => {
    if (!post) return
    let raf = 0; let creep = 0
    const t0 = performance.now()
    const dur = post.jackpot ? 4600 : 2200
    const T = post.target
    const loop = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const e = k === 1 ? 1 : 1 - Math.pow(2, -9 * k)
      setCounts({ likes: T.likes * e, comments: T.comments * e, shares: T.shares * e, views: T.views * e })
      if (k < 1) raf = requestAnimationFrame(loop)
      else creep = window.setInterval(() => setCounts((c) => ({
        likes: c.likes + T.likes * rnd(0.0005, 0.003), comments: c.comments + T.comments * rnd(0, 0.002),
        shares: c.shares + T.shares * rnd(0, 0.002), views: c.views + T.views * rnd(0.001, 0.006),
      })), 280)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); clearInterval(creep) }
  }, [post])

  /* ---------------- confetti ---------------- */
  const burst = () => {
    const cv = confetti.current
    if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const par = cv.parentElement!
    cv.width = par.clientWidth; cv.height = par.clientHeight
    const ctx = cv.getContext('2d')!
    const cols = ['#ece4d2', '#d4a84a', '#ff4b1f', '#cfff2e']
    const ps = Array.from({ length: 170 }, (_, i) => {
      const left = i % 2 === 0
      return { x: left ? 0 : cv.width, y: cv.height * 0.55, vx: (left ? 1 : -1) * rnd(3, 13), vy: -rnd(8, 19), r: rnd(0, 6), vr: rnd(-0.3, 0.3), c: pick(cols), w: rnd(5, 11), h: rnd(3, 6) }
    })
    const id = ++confettiOn.current
    const t0 = performance.now()
    const run = (now: number) => {
      if (confettiOn.current !== id) { ctx.clearRect(0, 0, cv.width, cv.height); return }
      ctx.clearRect(0, 0, cv.width, cv.height)
      ps.forEach((p) => { p.vy += 0.38; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore() })
      if (now - t0 < 4200) requestAnimationFrame(run); else ctx.clearRect(0, 0, cv.width, cv.height)
    }
    requestAnimationFrame(run)
  }

  /* ---------------- pull flow ---------------- */
  const springBack = useCallback(() => { setLeverMode('up'); setLever(0); later(() => setLeverMode('free'), 650) }, [])

  const startPull = (fromDrag: boolean) => {
    if (busy.current) return
    audio.init()
    const n = pullsRef.current
    const r = roll(n, jackRef.current)
    const jam = n >= 1 && !r.jackpot && jamsRef.current < 4 && Math.random() < 0.14
    busy.current = true

    if (jam) {
      const msg = JAMS[jamsRef.current % JAMS.length]
      jamsRef.current++
      setPhase('jammed')
      setLeverMode('down'); setLever(0.58)
      audio.sfx('thud', { vol: 0.8 })
      later(() => { setLeverMode('rattle'); audio.sfx('deny'); fx.shake(280) }, 260)
      later(() => { setStatus(msg); fx.subtitle(msg, 'ARLO', 3400) }, 520)
      later(() => { springBack(); useStore.getState().incFlag('gaslit'); useStore.getState().bump('suspicion', 2); useStore.getState().bump('delusion', 2) }, 1700)
      later(() => { busy.current = false; setPhase('idle'); setStatus(`Pulls: ${pullsRef.current}. (Per Arlo.)`) }, 2300)
      useStore.getState().note('Pulled a lever that Arlo insisted had never been pulled')
      return
    }

    result.current = r
    pullsRef.current = n + 1
    setPulls(n + 1)
    useStore.getState().incFlag('slot.pulls')
    setPhase('spinning'); setDone([false, false, false]); setPost(null); setShown([]); setViral(false); setPayout(false)
    setStatus('Generating thought leadership...')
    const now = performance.now()
    sims.current.forEach((s, i) => {
      s.mode = 'spin'; s.v = 0; s.stopAt = now + 1050 + i * 640
      s.idx = orders[i].indexOf(r.themes[i])
    })
    audio.sfx('whoosh', { vol: 0.7 }); audio.sfx('slot', { pitch: 0.6 })
    if (!fromDrag) { /* click-pull animation handled by caller */ }
    later(springBack, 120)
  }

  const clickPull = () => {
    if (busy.current) return
    audio.init()
    setLeverMode('down'); setLever(1)
    audio.sfx('thud', { vol: 0.55, pitch: 0.8 })
    later(() => startPull(false), 340)
  }

  function onReelStopped(i: number) {
    if (i === 2) finish()
  }

  const finish = () => {
    const r = result.current
    const s = useStore.getState()
    const n = pullsRef.current
    const tt = r.themes.map((t) => THEMES[t])
    const prefix = Math.random() < 0.5 || r.jackpot ? HUMBLE[Math.min(r.jackpot ? 3 : Math.floor(n / 2), 3)] : pick(PREFIXES)
    const text = `${prefix}\n\n${tt[0].event}.\n\n${tt[1].lesson}\n\n${tt[2].tag}`
    const likes = r.jackpot ? 3_100_000 : Math.floor(rnd(180, 2400) * (r.near ? 1.6 : 1))
    const target = r.jackpot ? { likes, comments: 214_000, shares: 880_000, views: 48_213_907 } : { likes, comments: Math.floor(likes * 0.07), shares: Math.floor(likes * 0.03), views: Math.floor(likes * 38) }
    const npc = shuffle(NPCS).slice(0, r.jackpot ? 2 : 3)
    const comments: [string, string][] = [['Mom · Head of Investor Relations', 'proud of you sweetie' + MOM_TAILS[Math.min(n - 1, MOM_TAILS.length - 1)]], ...npc]
    if (r.jackpot) comments.push(['Recruiter', 'We are not hiring. Please stop.'], ['Arlo (author)', 'Thank you all. I built this.'])
    const p: Post = { id: postId.current++, text, jackpot: r.jackpot, near: r.near, target, comments, event: tt[0].event }
    setPost(p); setPhase('result'); busy.current = false
    setStatus(r.jackpot ? 'JACKPOT. All three reels agree. Statistically unprecedented. Fully rigged.' : r.near ? 'Two out of three. Growth mindset.' : 'Posted. The algorithm has questions.')
    s.bump('delusion', 3); s.bump('suspicion', 1); s.bump('aura', Math.round(target.likes / 100))
    if (n === 1) s.note(`Pulled the Thought Leadership Engine and posted: "${tt[0].event}". Mom commented first`)
    if (n === 5 && !r.jackpot) s.note('Pulled the Thought Leadership Engine 5 times; Mom commented first every time')
    // comments arrive: Mom always first
    comments.forEach((c, k) => later(() => { setShown((x) => [...x, c]); audio.sfx(k === 0 ? 'notify' : 'tick', { vol: k === 0 ? 0.7 : 0.4 }) }, 650 + k * (k === 0 ? 0 : 1100)))
    if (r.near) later(() => audio.sfx('deny', { vol: 0.5 }), 200)
    else if (!r.jackpot) audio.sfx('ding', { vol: 0.7 })
    if (r.jackpot) jackpot(tt[0].event)
  }

  const jackpot = (event: string) => {
    const s = useStore.getState()
    jackRef.current = true
    setViral(true)
    s.setFlag('slot.jackpot', true)
    audio.sfx('jackpot'); fx.flash('#d4a84a'); fx.shake(700); burst()
    later(() => audio.sfx('airhorn'), 260)
    later(() => { audio.sfx('applause'); burst() }, 900)
    later(() => { fx.subtitle('This is organic.', 'ARLO', 3000); fx.meme('stonks') }, 1500)
    s.setStat('delusion', 100)
    for (let k = 1; k <= 12; k++) later(() => useStore.getState().setStat('delusion', 100), k * 500)
    s.bump('aura', 400); s.bump('suspicion', 8)
    s.note(`Hit the Thought Leadership jackpot with "${event}". Arlo's delusion was pinned to maximum`)
    s.unlock('jackpot', 'Thought Leader™', 'Three reels agreed. Statistically, nobody should have.')
    later(() => { setPayout(true); audio.sfx('rimshot') }, 5600)
  }

  /* ---------------- lever pointer handling ---------------- */
  const trackH = () => (trackRef.current?.clientHeight ?? 170) - 46
  const onDown = (e: React.PointerEvent) => {
    if (busy.current) return
    audio.init()
    dragRef.current = { y0: e.clientY, moved: 0 }
    leverRef.current = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setLeverMode('drag')
  }
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current; if (!d) return
    const dy = e.clientY - d.y0
    d.moved = Math.max(d.moved, Math.abs(dy))
    // weight: lever resists, more as it goes down
    const raw = Math.max(0, Math.min(1, dy / trackH()))
    const f = raw < 0.5 ? raw * 0.9 : 0.45 + (raw - 0.5) * 1.1
    const prev = leverRef.current
    const next = prev + (Math.min(1, f) - prev) * 0.5
    if (Math.floor(next * 8) !== Math.floor(prev * 8)) audio.sfx('tick', { pitch: 0.55 + next * 0.6, vol: 0.5 })
    leverRef.current = next
    setLever(next)
  }
  const onUp = () => {
    const d = dragRef.current; if (!d) return
    dragRef.current = null
    if (d.moved < 6) { setLeverMode('free'); clickPull(); return }
    if (leverRef.current >= 0.8) { setLeverMode('down'); setLever(1); audio.sfx('thud', { vol: 0.6, pitch: 0.8 }); later(() => startPull(true), 60) }
    else { audio.sfx('click', { vol: 0.5 }); springBack() }
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickPull() } }

  return (
    <section className={`panel sm ${viral ? 'viral' : ''}`} aria-labelledby="sm-h">
      <canvas className="sm-confetti" ref={confetti} aria-hidden="true" />
      <div className="label">MECHANIC · THOUGHT LEADERSHIP ENGINE™</div>
      <h2 className="h-mid" id="sm-h">Insight, <em>mass-produced</em>.</h2>
      <p className="lead dim sm-lead">Three reels: a mundane event, a corporate lesson, a hashtag. Pull the lever. Arlo does not review the output. Arlo has never reviewed anything.</p>

      <div className="sm-cabinet">
        <div className="sm-marquee" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 90}ms` }} />)}</div>
        <div className="sm-machine">
          <div className="sm-reels">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`sm-reel ${done[i] ? 'locked' : ''} ${phase === 'result' && result.current.themes[0] === result.current.themes[1] && result.current.themes[1] === result.current.themes[2] ? 'win' : ''}`}>
                <span className="label sm-rl">{['01 · event', '02 · lesson', '03 · hashtag'][i]}</span>
                <div className="sm-window" ref={(el) => { wins.current[i] = el }}>
                  <div className="sm-strip" ref={(el) => { strips.current[i] = el }}>
                    {[...orders[i], orders[i][0]].map((t, k) => (
                      <div className={`sm-row r${i}`} key={k}><span>{i === 0 ? THEMES[t].event : i === 1 ? THEMES[t].lesson : THEMES[t].tag}</span></div>
                    ))}
                  </div>
                  <i className="sm-mark l" aria-hidden="true" /><i className="sm-mark r" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>

          <div className="sm-lever-col">
            <span className="label">LEVER</span>
            <div className="sm-track" ref={trackRef}>
              <div className="sm-rod" style={{ height: `${lever * 100}%` }} />
              <button
                className={`sm-knob m-${leverMode}`}
                style={{ top: `calc(${lever} * (100% - 46px))` }}
                aria-label="Pull the lever (drag down, or press Enter)"
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}
                disabled={phase === 'spinning'}
              />
            </div>
            <span className="label sm-pulls" key={pulls}>pulls {pulls}</span>
          </div>
        </div>
        <div className={`sm-status label ${phase === 'jammed' ? 'jam' : ''}`} aria-live="polite">{phase === 'jammed' && <span className="stamp">lever jammed</span>} {status}</div>
      </div>

      {post && (
        <article className={`sm-post ${post.jackpot ? 'jack' : ''}`} key={post.id} aria-label="Generated post">
          <header className="sm-ph">
            <span className="sm-av" aria-hidden="true">A</span>
            <div><b>Arlo Pemberton-Vex</b><span className="label">Chief Visionary Synergy Architect™ · 1st · now</span></div>
            {post.jackpot && <span className="stamp sm-stamp">viral</span>}
          </header>
          <p className="sm-body">{post.text}</p>
          <div className="sm-eng" aria-live="off">
            <div><b>{fmt(counts.likes)}</b><span className="label">likes</span></div>
            <div><b>{fmt(counts.comments)}</b><span className="label">comments</span></div>
            <div><b>{fmt(counts.shares)}</b><span className="label">reposts</span></div>
            <div><b className={post.jackpot ? 'brass' : ''}>{fmt(counts.views)}</b><span className="label">impressions</span></div>
          </div>
          <ul className="sm-comments" aria-live="polite">
            {shown.map(([who, what], k) => (
              <li key={k} className={who.startsWith('Mom') ? 'mom' : ''}>
                <span className="label">{who}</span>
                <span>{who.startsWith('Mom') ? 'Mom: ' : ''}{what}</span>
              </li>
            ))}
          </ul>
          {payout && <p className="sm-payout"><span className="stamp">payout</span> 1 connection request. From a man who sells pillows.</p>}
        </article>
      )}
      {!post && phase === 'idle' && <p className="sm-hint dim label">Odds of jackpot: 1 in 144. Per Arlo, the machine is "calibrated".</p>}
    </section>
  )
}
