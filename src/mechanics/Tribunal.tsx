import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { useStore, fx } from '../state/store'
import { audio } from '../audio/engine'
import './Tribunal.css'

/* ------------------------------------------------------------------ */
/* Skill Tribunal: six claims, one polygraph, a very unqualified judge */
/* ------------------------------------------------------------------ */

type Sfx = Parameters<typeof audio.sfx>[0]
type Act = 'convict' | 'acquit' | 'demo'
type Who = 'JUDGE' | 'ARLO' | 'SYS' | 'MOM'

interface Step { t: number; who: Who; line: string; val?: number; comp?: number; sfx?: Sfx; shake?: boolean; say?: boolean }
interface Claim {
  id: string
  text: string
  sub: string
  truth: boolean
  prop: 'none' | 'grid' | 'sheet' | 'track'
  exhibit: string[]
  reading: string
  conv: string
  acq: string
  demoLabel: string
  demo: Step[]
  demoVerdict: string
  arloConv: string
  arloAcq: string
  arloDemo: string
}

const CLAIMS: Claim[] = [
  {
    id: 'lang',
    text: 'Speaks 17 languages.',
    sub: 'Source: second line of the LinkedIn headline.',
    truth: false,
    prop: 'none',
    exhibit: [
      'EXHIBIT A: Language-app history. 3 days. Streak broken on day 3 by "a vibe."',
      'EXHIBIT B: "Merci," pronounced "mercy," deployed at a Thai restaurant.',
      'EXHIBIT C: The 17 languages include Taco, Sushi, Ciao, and Emoji.',
      'EXHIBIT D: Certificate of Fluency, issued by a folder on his desktop.',
    ],
    reading: 'DECEPTION INDEX',
    conv: 'Pursuant to Article 12, Subsection 4(b) of the Hubris Act, and following a cross-referenced audit of seventeen flashcards, three broken streaks and one regrettable "merci beaucoup," the claim is found to be, technically, a menu.',
    acq: 'A polyglot! A linguistic colossus! Seventeen languages, and every single one delivered with total confidence. We are not worthy. We are barely literate.',
    demoLabel: 'Speak Spanish',
    demo: [
      { t: 300, who: 'JUDGE', line: 'Please say something. In Spanish.', comp: 0.5 },
      { t: 2000, who: 'ARLO', line: 'Hola. Me llamo... Arlo. Soy... un hombre de... sinergia.', comp: 0.28, say: true },
      { t: 4400, who: 'ARLO', line: 'Buenos... dias. Quiero... el roadmap.', comp: 0.18 },
      { t: 6600, who: 'ARLO', line: 'Bonjour. No. Wait. Ciao. Synergy. Taco.', comp: 0.08, sfx: 'scratch', shake: true },
      { t: 8600, who: 'ARLO', line: '[switches to fluent LinkedIn] "Thrilled and humbled to announce I am speaking."', comp: 0.02, sfx: 'glitch', say: true },
      { t: 10800, who: 'SYS', line: 'Translation service has requested a break and a lawyer.', sfx: 'error' },
    ],
    demoVerdict: 'The court has heard the demonstration. The court wishes it had not. The claim is hereby recorded as "fluent in LinkedIn."',
    arloConv: '"Je ne regrette rien." (He regrets this specific thing.)',
    arloAcq: '"Gracias. Merci. Danke. Taco."',
    arloDemo: '"That went exactly as planned. The plan was chaos."',
  },
  {
    id: 'all',
    text: 'Expert in Everything.',
    sub: 'Self-assessed. By committee. The committee is Arlo.',
    truth: false,
    prop: 'none',
    exhibit: [
      'EXHIBIT A: Expertise inventory. 1,204 topics. 1,203 are "read a headline about it."',
      'EXHIBIT B: The 1,204th is "being an expert," which he is, per Arlo.',
      'EXHIBIT C: Asked for one thing he is NOT expert in, he said "Humility," visibly proud.',
      'EXHIBIT D: Self-rating, 11 out of 10. The extra point is for vibes.',
    ],
    reading: 'DECEPTION INDEX',
    conv: 'Having reviewed 1,204 disciplines and found an open browser tab in 1,203 of them, the court rules that Everything is not a skill. It is a category error with a haircut.',
    acq: 'An expert in EVERYTHING. Doctors, bridges, tides, the moon: all of them, his. History will have to be rewritten, and he will want a credit.',
    demoLabel: 'Pop quiz',
    demo: [
      { t: 300, who: 'JUDGE', line: 'Question one. What is seven times eight?', comp: 0.5 },
      { t: 2200, who: 'ARLO', line: '"A paradigm."', comp: 0.3, say: true },
      { t: 4200, who: 'JUDGE', line: 'Question two. Name a primary colour.' },
      { t: 5800, who: 'ARLO', line: '"Disruption."', comp: 0.15, sfx: 'scratch' },
      { t: 7600, who: 'JUDGE', line: 'Question three. Where is France?' },
      { t: 9200, who: 'ARLO', line: '"Wherever the market is."', comp: 0.04, sfx: 'thud', shake: true, say: true },
      { t: 11000, who: 'ARLO', line: 'I would like to phone a friend. The friend is also me.', sfx: 'ring' },
    ],
    demoVerdict: 'The witness answered three questions with three nouns, none of them answers. The court notes his confidence was flawless.',
    arloConv: '"Fine. I am an expert in being wrongly convicted."',
    arloAcq: '"Obviously. Next question: please stop asking me questions."',
    arloDemo: '"Every answer was technically a noun. Do you know how rare that is?"',
  },
  {
    id: 'code',
    text: 'Senior Full-Stack Everything Engineer. Nine frameworks.',
    sub: '0 shipped. Several "in stealth."',
    truth: false,
    prop: 'none',
    exhibit: [
      'EXHIBIT A: Repository history. 1 commit. Message: "fixed it."',
      'EXHIBIT B: Tutorial progress. 3 of 3 started. Lesson 1 of each.',
      'EXHIBIT C: Q&A forum account. 0 answers given. 412 questions "saved for later."',
      'EXHIBIT D: Fluent in "HTML." The M stands for "Mostly."',
    ],
    reading: 'DECEPTION INDEX',
    conv: 'Audit of the repository reveals one commit, zero tests, and a README that reads only "coming soon (2021)." The claim is found to be a null pointer wearing a blazer.',
    acq: 'Nine frameworks! Fluent! He has never once been wrong in production, because he has never been in production. Flawless record. Perfect uptime.',
    demoLabel: 'Live coding',
    demo: [
      { t: 300, who: 'JUDGE', line: 'Write a function that adds two numbers.', comp: 0.5 },
      { t: 2200, who: 'ARLO', line: 'function add(a, b) { return synergy(a, b) }', comp: 0.3, sfx: 'tick' },
      { t: 4200, who: 'SYS', line: "ERROR: 'synergy' is not defined (line 1)", comp: 0.2, sfx: 'error', shake: true },
      { t: 6000, who: 'ARLO', line: 'That is a caching issue.', say: true },
      { t: 7800, who: 'SYS', line: '$ git push --force origin main', sfx: 'tick' },
      { t: 9400, who: 'SYS', line: "Pushed to production. Production is Mom's laptop. Mom's laptop is warm.", comp: 0.02, sfx: 'glitch', shake: true },
      { t: 11200, who: 'MOM', line: 'Honey, the screen is doing a thing.', sfx: 'ring' },
    ],
    demoVerdict: "The defendant has force-pushed to a laptop belonging to his mother. The court takes no pleasure in noting that this is the most senior thing he has done.",
    arloConv: '"A true senior engineer is wrongfully convicted. It is in the docs."',
    arloAcq: '"Stack so full it overflows. That is called a feature."',
    arloDemo: '"Technically I shipped. The shipment is on fire. Success."',
  },
  {
    id: 'team',
    text: 'Led a 40-person team.',
    sub: 'Headcount: 40. Vexxity Labs employees: 1.',
    truth: false,
    prop: 'grid',
    exhibit: [
      'EXHIBIT A: Org chart. Arlo reports to Arlo (dotted line to Arlo).',
      'EXHIBIT B: The 40 "direct reports" are 40 open browser tabs. They report nothing.',
      'EXHIBIT C: Last all-hands attendance. 1. Mom joined late, on mute.',
      'EXHIBIT D: Performance review. "Arlo exceeds the expectations of Arlo."',
    ],
    reading: 'DECEPTION INDEX',
    conv: 'Headcount verified at one (1). The remaining thirty-nine are tabs, three of which are "a recipe." Claim rejected, with a note sent to HR, who is also Arlo.',
    acq: 'Forty people! Led! Inspired! You could say he is a shepherd of men, or at minimum a very organised man with many tabs.',
    demoLabel: 'All-hands meeting',
    demo: [
      { t: 300, who: 'SYS', line: 'All-hands convened. 40 invited.', val: 0, comp: 0.5 },
      { t: 2200, who: 'ARLO', line: 'Thanks everyone for joining!', val: 1, comp: 0.4, say: true },
      { t: 4200, who: 'MOM', line: "Honey, you're muted. Also, are you eating?", val: 2, comp: 0.3, sfx: 'ring' },
      { t: 6200, who: 'ARLO', line: 'Any blockers?', sfx: 'tick' },
      { t: 8000, who: 'SYS', line: '...silence. Interpreted as alignment.', comp: 0.1, sfx: 'thud' },
      { t: 9800, who: 'ARLO', line: "Great. Let's circle back.", comp: 0.04, say: true },
      { t: 11400, who: 'SYS', line: 'Attendance: 2/40 (one of them is Mom). 95% async.', val: 2, sfx: 'error', shake: true },
    ],
    demoVerdict: 'Attendance was two. One was the defendant, one was his mother. The court finds the other thirty-eight "deeply engaged, in a different tab."',
    arloConv: '"They were all there in spirit. They are tabs. Tabs have spirit."',
    arloAcq: '"I would like to thank my team. All forty. Hi, tab twelve."',
    arloDemo: '"Zero conflict. Zero blockers. That is what leadership looks like."',
  },
  {
    id: 'sheet',
    text: 'Folds a fitted sheet into a perfect rectangle.',
    sub: 'Notarised. Arlo cried.',
    truth: true,
    prop: 'sheet',
    exhibit: [
      'EXHIBIT A: Video evidence. 38 seconds. One take. No cuts. No cheating.',
      'EXHIBIT B: Notary stamp present. Notary described as "visibly shaken."',
      'EXHIBIT C: Corners tucked into corners. Physics consulted. Physics agreed.',
      'EXHIBIT D: Witnesses: 4. All four said "huh."',
    ],
    reading: 'TRUTH INDEX',
    conv: 'The court rules this claim false. Correction: the court has reviewed its own ruling and the sheet was folded. It is on video. A man has been convicted of competence. The Justice Score will be docked. The judge requests a moment.',
    acq: 'A fitted sheet! Folded! Flat! The arc of the moral universe bends, at long last, toward a perfect rectangle.',
    demoLabel: 'Fold the sheet',
    demo: [
      { t: 300, who: 'JUDGE', line: 'Here is a fitted sheet. Fold it.', val: 0, comp: 0.5 },
      { t: 2000, who: 'ARLO', line: '(tucks one corner into another corner)', val: 0.3, comp: 0.7, sfx: 'whoosh' },
      { t: 3800, who: 'ARLO', line: '(tucks the other corners into the other corners. The room goes quiet.)', val: 0.65, comp: 0.9, sfx: 'whoosh' },
      { t: 5800, who: 'ARLO', line: '(a flawless rectangle)', val: 1, comp: 1, sfx: 'ding' },
      { t: 7400, who: 'SYS', line: 'Applause detected.', sfx: 'applause' },
      { t: 9000, who: 'JUDGE', line: '...It is a rectangle.', sfx: 'tick', say: true },
    ],
    demoVerdict: 'The demonstration succeeded. The claim is confirmed. The court did not expect this and has no prepared remarks.',
    arloConv: '"I have waited my whole life to be wronged about something real."',
    arloAcq: '"Finally. Justice. Please apply the same standard to everything else. Please don\'t."',
    arloDemo: '"I contain multitudes. One of them folds sheets."',
  },
  {
    id: 'run',
    text: 'Has run 14 marathons.',
    sub: 'Pace: "conversational." Distance: "felt long."',
    truth: false,
    prop: 'track',
    exhibit: [
      'EXHIBIT A: Fitness tracker. 4,112 lifetime steps. 3,900 of them to the fridge.',
      'EXHIBIT B: 14 finisher medals. Origin: a bulk box of 15 from a party store.',
      'EXHIBIT C: Marathon time, "sub-4:00" (by calendar, not clock).',
      'EXHIBIT D: Runs "in his heart." Cardiologist: "no."',
    ],
    reading: 'DECEPTION INDEX',
    conv: 'Distance verified at 0.3 kilometres, to a chair. The court finds the marathons were run entirely in the subjunctive. Claim rejected, and hydrated.',
    acq: 'Fourteen marathons! Each longer than the last! He did not finish them, he processed them. Inspirational. Please stand. Actually, he is sitting.',
    demoLabel: 'Treadmill',
    demo: [
      { t: 300, who: 'SYS', line: 'Treadmill engaged. Target: 42.195 km.', val: 0, comp: 0.5 },
      { t: 2000, who: 'ARLO', line: 'Starting strong.', val: 0.004, comp: 0.4, say: true },
      { t: 4000, who: 'ARLO', line: 'Feeling the runner\'s high.', val: 0.007, comp: 0.3 },
      { t: 6000, who: 'SYS', line: 'Distance: 0.31 km. Arlo has paused for "hydration" (sat down).', val: 0.0073, comp: 0.1, sfx: 'thud', shake: true },
      { t: 8000, who: 'ARLO', line: 'This is basically tapering.', say: true },
      { t: 10000, who: 'SYS', line: 'Heart rate: 188. He is staring at the treadmill. The treadmill is off.', comp: 0.02, sfx: 'error' },
    ],
    demoVerdict: 'The defendant has travelled 0.31 kilometres and has requested a ride home. The court recognises this as an Ultra in the sense that it was a lot.',
    arloConv: '"Fine. 13.9 of them were mental."',
    arloAcq: '"I ran them in a metaphorical sense. The sense is vibes."',
    arloDemo: '"Tapering. I peaked early. In 2019."',
  },
]

const DELTA: Record<Act, [number, number]> = { convict: [20, -25], acquit: [-20, 20], demo: [10, 15] } // [false claim, true claim]

interface Outcome { act: Act; truth: boolean }

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

function useTyped(text: string, cps = 75) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(text.length, Math.floor(((t - t0) / 1000) * cps))
      setN(k)
      if (k < text.length) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [text, cps])
  return text.slice(0, n)
}

/* ---------------- polygraph strip chart ---------------- */
function Polygraph({ active, truth, spike }: { active: boolean; truth: boolean; spike: RefObject<number> }) {
  const line = useRef<SVGPolylineElement>(null)
  const pen = useRef<SVGCircleElement>(null)
  const pts = useRef<number[]>(Array(120).fill(50))
  useEffect(() => {
    let raf = 0
    let f = 0
    const loop = () => {
      f++
      if (f % 2 === 0) {
        const sp = spike.current ?? 0
        const amp = active ? (truth ? 3 + sp * 3 : 6 + sp * 40) : 2
        const y = 50 + (Math.random() - 0.5) * amp * 1.6 + Math.sin(f / 5) * amp * 0.5
        pts.current.push(Math.max(4, Math.min(96, y)))
        pts.current.shift()
        if (spike.current) spike.current = Math.max(0, spike.current - 0.02)
        const str = pts.current.map((y2, i) => `${(i * 2).toFixed(0)},${y2.toFixed(1)}`).join(' ')
        line.current?.setAttribute('points', str)
        pen.current?.setAttribute('cy', String(pts.current[pts.current.length - 1]))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active, truth, spike])
  return (
    <svg viewBox="0 0 240 100" className="tri-poly" role="img" aria-label="Polygraph trace">
      {[20, 40, 60, 80].map((y) => <line key={y} x1="0" x2="240" y1={y} y2={y} className="tri-grid" />)}
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 20 + 10} x2={i * 20 + 10} y1="0" y2="100" className="tri-grid" />)}
      <polyline ref={line} className="tri-trace" fill="none" points="" />
      <circle ref={pen} cx="238" cy="50" r="3" className="tri-pen" />
    </svg>
  )
}

/* ---------------- demo props ---------------- */
function Prop({ kind, val }: { kind: Claim['prop']; val: number }) {
  if (kind === 'grid') {
    const n = Math.round(val)
    return (
      <div className="tri-prop grid" aria-label={`${n} of 40 present`}>
        {Array.from({ length: 40 }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
        <span className="label">{n}/40 PRESENT</span>
      </div>
    )
  }
  if (kind === 'sheet') {
    const w = 140 - val * 70
    const h = 100 - val * 30
    return (
      <svg viewBox="0 0 220 130" className="tri-prop sheet" aria-hidden="true">
        <rect x={110 - w / 2} y={65 - h / 2} width={w} height={h} className={val >= 1 ? 'done' : ''} style={{ transition: 'all 0.9s var(--ease)' }} />
        {val >= 1 && <text x="110" y="70" textAnchor="middle">RECTANGLE</text>}
        {val < 1 && Array.from({ length: 4 }, (_, i) => <circle key={i} cx={110 + (i % 2 ? 1 : -1) * (w / 2)} cy={65 + (i < 2 ? -1 : 1) * (h / 2)} r="4" className="corner" />)}
      </svg>
    )
  }
  if (kind === 'track') {
    const km = val * 42.195
    return (
      <div className="tri-prop track">
        <div className="tri-track"><i style={{ left: `${Math.min(100, val * 100 * 25)}%` }} /></div>
        <span className="label">{km.toFixed(2)} KM OF 42.195</span>
      </div>
    )
  }
  return null
}

/* ---------------- sentencing ---------------- */
interface Sentence { key: string; title: string; sub: string; sentence: string }
function sentence(outcomes: Outcome[], elapsed: number): Sentence {
  const c = outcomes.filter((o) => o.act === 'convict').length
  const a = outcomes.filter((o) => o.act === 'acquit').length
  const d = outcomes.filter((o) => o.act === 'demo').length
  const wrongful = outcomes.some((o) => o.act === 'convict' && o.truth)
  if (d >= 3 || elapsed >= 240)
    return {
      key: 'waste',
      title: 'The Court Finds YOU Guilty',
      sub: 'of wasting 4 minutes',
      sentence: `Itemised: ${d} live demonstrations, 1 fitted sheet, 0 outcomes. The court bills in 4-minute increments and you have used one. Sentence: you may not have them back. Arlo has been released on his own recognisance, which he owns.`,
    }
  if (c >= 5)
    return {
      key: 'hanging',
      title: 'The Hanging Judge',
      sub: `${c} convictions`,
      sentence: 'You have rejected nearly everything Arlo has ever claimed, including, arguably, some of his nouns. Arlo is sentenced to six months of LinkedIn silence. The court notes you are "a bit much" and would like to be your friend.',
    }
  if (a >= 4)
    return {
      key: 'syco',
      title: 'Court Jester of Credulity',
      sub: `${a} acquittals`,
      sentence: 'Arlo has been released, promoted, and has named a conference room after you. The room is a tab. The court finds YOU gullible in the first degree and sentences you to read the Exhibits aloud to your mother.',
    }
  if (wrongful && c >= 3)
    return {
      key: 'overturned',
      title: 'Overturned on Appeal',
      sub: 'by the one true thing',
      sentence: 'Your conviction rate was excellent right up until you convicted the only true claim Arlo has ever made. A fitted sheet is now folded better than your record. Sentence: you must go and fold something. Nobody will check.',
    }
  if (c >= 2 && a >= 2)
    return {
      key: 'split',
      title: 'A Split Decision',
      sub: `${c} convicted / ${a} acquitted`,
      sentence: 'You are neither a tyrant nor a fool, only inconsistent, which the court finds more upsetting. Arlo is placed on a rolling probation that he describes as "an ongoing partnership."',
    }
  return {
    key: 'procedural',
    title: 'Procedurally Enthusiastic',
    sub: 'a bit of everything',
    sentence: 'The court cannot classify your jurisprudence. It involves feelings, a polygraph and at least one sheet. Arlo is sentenced to time served, which is 0 seconds, and a stern letter from a lawyer who is also Arlo.',
  }
}

/* ================================================================== */
export default function Tribunal() {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'brief' | 'verdict' | 'demo' | 'sentence'>('brief')
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [round, setRound] = useState(0)

  const [exam, setExam] = useState({ on: false, shown: 0, done: false })
  const [reading, setReading] = useState(0)
  const spike = useRef(0)

  const [lines, setLines] = useState<Step[]>([])
  const [val, setVal] = useState(0)
  const [comp, setComp] = useState(0.5)
  const [demoDone, setDemoDone] = useState(false)

  const [verdict, setVerdict] = useState<{ who: string; text: string; arlo: string; stamp: string; tone: 'bad' | 'good' | 'neutral'; canNext: boolean } | null>(null)

  const timers = useRef<number[]>([])
  const t0 = useRef(performance.now())
  const claim = CLAIMS[idx]

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])
  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])
  useEffect(() => () => { clearAll(); audio.stopVoice() }, [clearAll])

  const justice = useMemo(
    () => Math.max(0, Math.min(100, 50 + outcomes.reduce((s, o) => s + DELTA[o.act][o.truth ? 1 : 0], 0))),
    [outcomes],
  )
  const justiceShown = useTicker(justice, 800)
  const readingShown = useTicker(reading, 900)
  const typed = useTyped(verdict?.text ?? '', 80)
  const sent = useMemo(
    () => (phase === 'sentence' ? sentence(outcomes, (performance.now() - t0.current) / 1000) : null),
    [phase, outcomes],
  )

  const counts = {
    c: outcomes.filter((o) => o.act === 'convict').length,
    a: outcomes.filter((o) => o.act === 'acquit').length,
    d: outcomes.filter((o) => o.act === 'demo').length,
  }

  /* ---------------- examine ---------------- */
  const examine = () => {
    if (exam.on || phase !== 'brief') return
    audio.init()
    setExam({ on: true, shown: 0, done: false })
    setReading(0)
    audio.sfx('drumroll', { vol: 0.5 })
    claim.exhibit.forEach((_, i) => {
      later(() => {
        setExam((e) => ({ ...e, shown: i + 1 }))
        if (claim.truth) {
          spike.current = 0.3
          audio.sfx('tick')
        } else {
          spike.current = 1
          audio.sfx('zap', { vol: 0.5, pitch: 0.9 + i * 0.1 })
          fx.shake(110)
        }
      }, 900 + i * 1000)
    })
    later(() => {
      setExam((e) => ({ ...e, done: true }))
      if (claim.truth) {
        setReading(100)
        audio.sfx('bell')
        fx.subtitle('The needle did not move. The court is concerned.', 'POLYGRAPH', 3600)
      } else {
        setReading(93 + (idx % 5))
        audio.sfx('cymbal', { vol: 0.5 })
      }
    }, 900 + claim.exhibit.length * 1000 + 300)
  }

  /* ---------------- acts ---------------- */
  const record = (act: Act) => setOutcomes((o) => [...o, { act, truth: claim.truth }])

  const convict = () => {
    if (phase !== 'brief') return
    audio.init()
    clearAll()
    audio.stopVoice()
    const st = useStore.getState()
    st.bump('suspicion', -5)
    st.bump('delusion', -3)
    st.incFlag('tribunal.convicted')
    record('convict')
    audio.sfx('error')
    fx.shake(380)
    st.note(
      claim.truth
        ? `Wrongly convicted Arlo's claim "${claim.text.replace(/\.$/, '')}" (it was the one true one)`
        : `Rejected Arlo's claim: "${claim.text.replace(/\.$/, '')}"`,
    )
    const pre = exam.done ? '' : 'The court notes the visitor did not examine the exhibit. Conviction by vibes. '
    if (claim.truth) {
      later(() => audio.sfx('sadTrombone'), 1300)
      st.bump('aura', -100)
    }
    setVerdict({ who: 'JUDGE-AI 4.0 (UNQUALIFIED)', text: pre + claim.conv, arlo: claim.arloConv, stamp: 'REJECTED', tone: 'bad', canNext: false })
    setPhase('verdict')
    audio.say(claim.conv, { voice: 'ai', rate: 1.05, sub: false })
    later(() => setVerdict((v) => v && { ...v, canNext: true }), 1500)
  }

  const acquit = () => {
    if (phase !== 'brief') return
    audio.init()
    clearAll()
    audio.stopVoice()
    const st = useStore.getState()
    st.bump('delusion', 7)
    st.bump('suspicion', 5)
    st.bump('aura', 80)
    st.incFlag('tribunal.acquitted')
    record('acquit')
    audio.sfx(claim.truth ? 'fanfare' : 'applause')
    st.note(claim.truth ? `Acquitted Arlo's fitted-sheet claim (correctly, for once)` : `Acquitted Arlo's claim: "${claim.text.replace(/\.$/, '')}"`)
    const pre = exam.done || claim.truth ? '' : 'The court notes the visitor did not examine the exhibit. Acquittal by vibes. '
    setVerdict({ who: 'ANNOUNCER (COMPROMISED)', text: pre + claim.acq, arlo: claim.arloAcq, stamp: claim.truth ? 'VERIFIED' : 'APPROVED', tone: 'good', canNext: false })
    setPhase('verdict')
    audio.say(claim.acq, { voice: 'announcer', rate: 1.04, sub: false })
    later(() => fx.meme(claim.truth ? 'true' : 'cooked'), 400)
    later(() => setVerdict((v) => v && { ...v, canNext: true }), 1500)
  }

  const demand = () => {
    if (phase !== 'brief') return
    audio.init()
    clearAll()
    audio.stopVoice()
    setPhase('demo')
    setLines([])
    setVal(0)
    setComp(0.5)
    setDemoDone(false)
    audio.sfx('whoosh')
    const c = claim
    c.demo.forEach((s) =>
      later(() => {
        setLines((l) => [...l, s])
        if (s.val !== undefined) setVal(s.val)
        if (s.comp !== undefined) setComp(s.comp)
        audio.sfx(s.sfx ?? 'tick', { vol: 0.6 })
        if (s.shake) fx.shake(260)
        if (s.say) audio.say(s.line.replace(/^\(|\)$/g, ''), { voice: s.who === 'ARLO' ? 'arlo' : 'ai', sub: false })
      }, s.t),
    )
    const end = c.demo[c.demo.length - 1].t + 1600
    later(() => finishDemo(c), end)
  }

  const finishDemo = (c: Claim) => {
    setDemoDone(true)
    const st = useStore.getState()
    st.incFlag('tribunal.demos')
    setOutcomes((o) => [...o, { act: 'demo', truth: c.truth }])
    if (c.truth) {
      st.bump('delusion', 6)
      st.bump('suspicion', -4)
      st.bump('aura', 150)
      audio.sfx('fanfare')
      fx.meme('true')
      st.note('Made Arlo demonstrate folding a fitted sheet. It worked. The court is still processing it')
    } else {
      st.bump('delusion', 4)
      st.bump('suspicion', 3)
      st.bump('aura', -60)
      audio.sfx('sadTrombone')
      fx.shake(300)
      st.note(`Demanded a live demonstration of "${c.demoLabel.toLowerCase()}". It went badly`)
    }
    setVerdict({
      who: 'JUDGE-AI 4.0 (UNQUALIFIED)',
      text: c.demoVerdict,
      arlo: c.arloDemo,
      stamp: c.truth ? 'VERIFIED (!!)' : 'DEMO FAILED',
      tone: c.truth ? 'good' : 'bad',
      canNext: false,
    })
    audio.say(c.demoVerdict, { voice: 'ai', rate: 1.05, sub: false })
    later(() => setVerdict((v) => v && { ...v, canNext: true }), 1500)
  }

  /* ---------------- progression ---------------- */
  const next = () => {
    if (!verdict?.canNext && phase !== 'verdict') return
    audio.stopVoice()
    clearAll()
    audio.sfx('click')
    if (idx >= CLAIMS.length - 1) {
      setPhase('sentence')
      return
    }
    setIdx(idx + 1)
    setPhase('brief')
    setVerdict(null)
    setExam({ on: false, shown: 0, done: false })
    setReading(0)
    spike.current = 0
    setLines([])
    setDemoDone(false)
  }

  /* sentencing effects (once per round) */
  const sentenced = useRef(-1)
  useEffect(() => {
    if (phase !== 'sentence' || !sent || sentenced.current === round) return
    sentenced.current = round
    const st = useStore.getState()
    st.setFlag('tribunal.convicted', counts.c)
    st.setFlag('tribunal.acquitted', counts.a)
    st.setFlag('tribunal.demos', counts.d)
    st.note(`The Skill Tribunal ended in "${sent.title}" (${counts.c} convicted, ${counts.a} acquitted, ${counts.d} demos; Justice Score ${justice})`)
    if (sent.key === 'waste') {
      st.bump('aura', -100)
      audio.sfx('rimshot')
      fx.meme('L', 'wasted 4 minutes')
    } else if (sent.key === 'syco') {
      st.bump('delusion', 5)
      audio.sfx('airhorn')
    } else audio.sfx('cymbal')
    st.unlock('tribunal-' + sent.key, sent.title, sent.sub)
    audio.sfx('boom')
    fx.shake(500)
    audio.say(`${sent.title}. ${sent.sub}.`, { voice: 'ai', sub: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sent])

  const reopen = () => {
    clearAll()
    audio.stopVoice()
    const st = useStore.getState()
    st.setFlag('tribunal.convicted', 0)
    st.setFlag('tribunal.acquitted', 0)
    st.setFlag('tribunal.demos', 0)
    audio.sfx('whoosh')
    setRound((r) => r + 1)
    t0.current = performance.now()
    setIdx(0)
    setOutcomes([])
    setPhase('brief')
    setVerdict(null)
    setExam({ on: false, shown: 0, done: false })
    setReading(0)
    setLines([])
    setDemoDone(false)
  }

  /* ---------------- derived render bits ---------------- */
  const beam = ((justiceShown - 50) / 50) * -16
  const jLabel = justiceShown < 20 ? 'Corrupt' : justiceShown < 40 ? 'Dubious' : justiceShown < 62 ? 'Plausible' : justiceShown < 82 ? 'Solid' : 'Suspiciously Perfect'
  const live = verdict ? `${verdict.stamp}. ${verdict.text}` : phase === 'sentence' && sent ? `${sent.title} ${sent.sub}` : `Case ${idx + 1} of 6: ${claim.text}`

  return (
    <section className="panel tri" aria-label="Skill Tribunal">
      <div className="tri-top">
        <span className="label">MECHANIC 03 · SKILL TRIBUNAL</span>
        <span className="label dim">CASE {String(Math.min(idx + 1, 6)).padStart(2, '0')} / 06 · JUDGE-AI 4.0</span>
      </div>
      <h2 className="h-mid">
        The People <em>v.</em> a Résumé.
      </h2>
      <p className="lead">
        Six claims. For each, examine the exhibit, then convict, acquit, or demand a live demonstration. The court will do
        its best, which is not saying much.
      </p>

      {/* ---------------- scoreboard ---------------- */}
      <div className="tri-score">
        <div className="tri-scales">
          <svg viewBox="0 0 140 70" aria-hidden="true">
            <line x1="70" y1="8" x2="70" y2="62" className="sc-post" />
            <line x1="40" y1="62" x2="100" y2="62" className="sc-post" />
            <g style={{ transform: `rotate(${beam}deg)`, transformOrigin: '70px 14px', transition: 'transform 0.8s cubic-bezier(0.34,1.6,0.5,1)' }}>
              <line x1="16" y1="14" x2="124" y2="14" className="sc-beam" />
              <line x1="22" y1="14" x2="14" y2="44" className="sc-str" /><line x1="22" y1="14" x2="30" y2="44" className="sc-str" />
              <line x1="118" y1="14" x2="110" y2="44" className="sc-str" /><line x1="118" y1="14" x2="126" y2="44" className="sc-str" />
              <rect x="10" y="44" width="24" height="4" className="sc-pan" /><rect x="106" y="44" width="24" height="4" className="sc-pan" />
            </g>
          </svg>
        </div>
        <div className="tri-justice">
          <span className="label">Justice Score</span>
          <b>{Math.round(justiceShown)}</b>
          <span className="tri-jlabel">{jLabel}</span>
        </div>
        <div className="tri-pips" aria-label="Case results">
          {CLAIMS.map((_, i) => {
            const o = outcomes[i]
            return <i key={i} className={`${o ? o.act : ''} ${i === idx && phase !== 'sentence' ? 'cur' : ''}`} title={o ? o.act : i === idx ? 'current' : 'pending'} />
          })}
          <span className="label">
            <span className="hot">{counts.c} CONV</span> · <span className="brass">{counts.a} ACQ</span> · {counts.d} DEMO
          </span>
        </div>
      </div>

      {/* ---------------- sentencing ---------------- */}
      {phase === 'sentence' && sent && (
        <div className={`tri-sentence k-${sent.key}`}>
          <span className="stamp tri-slam">{sent.key === 'waste' ? 'GUILTY' : 'SENTENCED'}</span>
          <h3 className="h-display">{sent.title}</h3>
          <p className="tri-sent-sub label">{sent.sub}</p>
          <p className="tri-sent-body">{sent.sentence}</p>
          <div className="tri-tally">
            <div><b className="hot">{counts.c}</b><span className="label">convicted</span></div>
            <div><b className="brass">{counts.a}</b><span className="label">acquitted</span></div>
            <div><b>{counts.d}</b><span className="label">demos</span></div>
            <div><b>{Math.round(justice)}</b><span className="label">justice</span></div>
          </div>
          <button className="btn hot" onClick={reopen}>Reopen the case</button>
        </div>
      )}

      {/* ---------------- case ---------------- */}
      {phase !== 'sentence' && (
        <div className="tri-case" key={`${round}-${idx}`}>
          <div className="tri-claim">
            <span className="label">CLAIM Nº {idx + 1}{claim.truth && exam.done ? ' · CONTAINS TRUTH' : ''}</span>
            <h3 className="tri-claim-text">“{claim.text}”</h3>
            <span className="dim tri-claim-sub">{claim.sub}</span>
            {verdict && <span className={`stamp tri-slam ${verdict.tone}`} key={verdict.stamp + idx}>{verdict.stamp}</span>}
          </div>

          {phase !== 'demo' && !(phase === 'verdict' && lines.length > 0) && (
            <div className="tri-exhibit">
              <div className="tri-ex-head">
                <span className="label">EXHIBIT · POLYGRAPH</span>
                <button className="btn ghost tri-examine" onClick={examine} disabled={exam.on || phase !== 'brief'}>
                  {exam.on ? (exam.done ? 'Examined' : 'Examining...') : 'Examine'}
                </button>
              </div>
              <Polygraph active={exam.on && !exam.done} truth={claim.truth} spike={spike} />
              <ul className="tri-ex-list">
                {claim.exhibit.slice(0, exam.shown).map((l, i) => (
                  <li key={i} className={claim.truth ? 'true' : ''}>{l}</li>
                ))}
                {!exam.on && <li className="dim">Press EXAMINE to attach the needle to the evidence.</li>}
              </ul>
              {exam.done && (
                <div className={`tri-reading ${claim.truth ? 'true' : ''}`}>
                  <span className="label">{claim.reading}</span>
                  <b>{Math.round(readingShown)}%</b>
                  {claim.truth && <span className="tri-oh">(unexpected)</span>}
                </div>
              )}
            </div>
          )}

          {(phase === 'demo' || (phase === 'verdict' && lines.length > 0)) && (
            <div className="tri-demo">
              <div className="tri-ex-head">
                <span className="label">LIVE DEMONSTRATION · {claim.demoLabel.toUpperCase()}</span>
                <span className={`label ${demoDone ? '' : 'hot'}`}>{demoDone ? 'ENDED' : '● REC'}</span>
              </div>
              <Prop kind={claim.prop} val={val} />
              <ol className="tri-log">
                {lines.map((l, i) => (
                  <li key={i} className={`w-${l.who}`}>
                    <b>{l.who}</b>
                    <span>{l.line}</span>
                  </li>
                ))}
              </ol>
              <div className="tri-comp">
                <span className="label">Competence</span>
                <div className="tri-comp-bar"><i style={{ width: `${comp * 100}%`, background: comp > 0.6 ? 'var(--brass)' : 'var(--verm)' } as CSSProperties} /></div>
                <b>{Math.round(comp * 100)}%</b>
              </div>
            </div>
          )}

          {phase === 'brief' && (
            <div className="tri-actions">
              <button className="btn hot" onClick={convict}>Convict</button>
              <button className="btn" onClick={acquit}>Acquit</button>
              <button className="btn ghost" onClick={demand}>Demand demonstration</button>
            </div>
          )}

          {verdict && (
            <div className={`tri-bench ${verdict.tone}`}>
              <span className="label">{verdict.who}</span>
              <p className="tri-bench-text">{typed}<span className="tri-caret" /></p>
              <p className="tri-arlo"><b>ARLO:</b> {verdict.arlo}</p>
              <button className="btn" onClick={next} disabled={!verdict.canNext}>
                {idx >= CLAIMS.length - 1 ? 'Proceed to sentencing' : 'Next case'}
              </button>
            </div>
          )}
        </div>
      )}
      <p className="sr-only" aria-live="polite">{live}</p>
    </section>
  )
}
