import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore, fx } from '../state/store'
import { audio } from '../audio/engine'
import './JobPosting.css'

/* ------------------------------------------------------------------ */
/* requirements                                                        */
/* ------------------------------------------------------------------ */
interface Req { id: string; text: string; w: number; on: boolean; flash: number; tag?: string }
interface React_ { spawn?: { id: string; text: string; w: number }; mutate?: (tabs: number) => string; quip: string }

const BASE: Req[] = [
  { id: 'fw', text: '5 years of experience in a framework released last month', w: 12, on: false, flash: 0 },
  { id: 'self', text: 'Self-starter, team player, and does NOT need direction (but welcomes daily feedback from Arlo)', w: 11, on: false, flash: 0 },
  { id: 'yrs', text: '12+ years of experience (entry level)', w: 8, on: false, flash: 0 },
  { id: 'pace', text: 'Thrives in a fast-paced environment (the environment is one man, walking)', w: 9, on: false, flash: 0 },
  { id: 'syn', text: 'Fluent in synergy. Native speakers preferred. Non-native speakers also preferred.', w: 7, on: false, flash: 0 },
  { id: 'deg', text: 'Degree in any field, preferably one Arlo has not heard of', w: 6, on: false, flash: 0 },
  { id: 'eq', text: 'Compensated in exposure, vibes, and equity (Fern holds 40%; the rest is a rumour)', w: 10, on: false, flash: 0 },
  { id: 'reloc', text: 'Willing to relocate to a tab', w: 8, on: false, flash: 0 },
  { id: 'dis', text: 'Passionate about disrupting everything except the lease', w: 7, on: false, flash: 0 },
  { id: 'ninja', text: 'Rockstar / ninja / wizard / "just a normal guy"', w: 5, on: false, flash: 0 },
]

const REACT: Record<string, React_> = {
  fw: {
    spawn: { id: 'fw2', text: 'Must have contributed to said framework (it is closed-source, and also Arlo)', w: 9 },
    quip: 'Time travel is not listed as a skill. It is implied.',
  },
  self: {
    mutate: () => 'Self-starter who waits to be told when to start, then starts on their own (with permission)',
    quip: 'Requirement clarified. It is now worse.',
  },
  yrs: {
    mutate: () => '14+ years of experience (entry level, but with a mortgage)',
    quip: 'Experience requirement increased to match your confidence.',
  },
  pace: {
    spawn: { id: 'keep', text: 'Able to keep up with Arlo, who does not walk but "glides"', w: 7 },
    quip: 'Noted: you claim to have a pulse.',
  },
  syn: {
    spawn: { id: 'ind', text: 'Nine years in an industry that did not exist before Tuesday', w: 8 },
    quip: 'Fluency verified by Arlo, who is also fluent. Allegedly.',
  },
  deg: {
    mutate: () => 'Degree in a field Arlo has heard of, and disagrees with',
    quip: 'Field was reassigned during your click.',
  },
  eq: {
    spawn: { id: 'pay', text: 'Comfortable discussing money only in the form of "runway"', w: 6 },
    quip: 'Compensation acknowledged. Compensation is also a vibe.',
  },
  reloc: {
    mutate: (tabs) => (tabs > 0 ? `Willing to relocate to one of the ${Math.max(1, 47 - tabs)} tabs that remain` : 'Willing to relocate to a tab that is, at this time, still open (47 open)'),
    quip: 'Tab selection is up to Arlo. He has not decided. He is "keeping options open."',
  },
  dis: {
    spawn: { id: 'cult', text: 'Cultural fit (the culture: one man. The fit: tight.)', w: 7 },
    quip: 'You are disruptive. Please be quiet about it.',
  },
  ninja: {
    spawn: { id: 'cat', text: "Must be a cat person, a dog person, and Arlo's person", w: 4 },
    quip: 'Titles upgraded. Salary not.',
  },
}

const BLOCKED = [
  "You can't unhave experience.",
  "We've noted that you tried to unhave it.",
  "That's three attempts to un-experience. Logged as 'indecision'.",
  'HR (Arlo) has been notified. HR (Arlo) is delighted.',
  'Experience is not a toggle. Experience is a lifestyle.',
  'The checkbox has seen things. Let it keep them.',
]

const RAGE_LABEL = ['Calm', 'Smiling (tightly)', 'Typing aggressively', 'Breathing audibly', 'Muted but visibly screaming', 'Has left the call']
const NAME = 'Arlo Pemberton-Vex'
const COVER_AI = "Dear Arlo, I am writing to express my passion for passion. I have fourteen years of experience at a company founded last Tuesday. I am a self-starter who awaits your instruction. I thrive in chaos, particularly chaos I cause. I would be a perfect fit, or a perfect misfit; I am flexible. Please find my resume attached, which I wrote with AI, which also wrote this. Regards, Not A Robot"

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

/* ------------------------------------------------------------------ */
/* application steps                                                   */
/* ------------------------------------------------------------------ */
type StepKind = 'auto' | 'cookies' | 'name' | 'passion' | 'resume' | 'salary'
interface Step { step: number; total: number; label: string; kind: StepKind; ms?: number }
const flag = (k: string) => useStore.getState().flags[k]

function buildSteps(attempt: number): Step[] {
  const calls = Number(flag('phone.calls')) || 0
  const scan = typeof flag('aura.scan') === 'string' ? (flag('aura.scan') as string) : ''
  if (attempt > 1) {
    return [
      { step: 1, total: 3, label: 'Recognising you. Oh, it is you.', kind: 'auto', ms: 550 },
      { step: 2, total: 3, label: 'Pre-rejecting your application', kind: 'auto', ms: 450 },
      { step: 3, total: 3, label: 'Writing a kinder email than last time. Skipped.', kind: 'auto', ms: 350 },
    ]
  }
  return [
    { step: 1, total: 47, label: 'Verifying that you exist', kind: 'auto', ms: 750 },
    { step: 2, total: 47, label: 'Cookie preferences', kind: 'cookies' },
    { step: 3, total: 52, label: calls > 0 ? `Contacting your references (Dale declined; ${calls} of your calls are on file)` : 'Contacting your references (you have none; we will use Mom)', kind: 'auto', ms: 900 },
    { step: 4, total: 52, label: 'Full legal name', kind: 'name' },
    { step: 5, total: 61, label: scan ? `Checking aura on file: ${scan}` : 'Checking aura on file: none found. Have you tried being impressive?', kind: 'auto', ms: 900 },
    { step: 9, total: 61, label: 'Rate your passion', kind: 'passion' },
    { step: 14, total: 88, label: 'Adding 27 steps we forgot', kind: 'auto', ms: 700 },
    { step: 19, total: 88, label: 'Upload your résumé', kind: 'resume' },
    { step: 26, total: 140, label: 'Taking a personality test (5 questions, all of them "beige")', kind: 'auto', ms: 900 },
    { step: 31, total: 140, label: 'Salary expectation', kind: 'salary' },
    { step: 60, total: 140, label: 'Fast-forwarding steps 32 to 138 (you did not need them)', kind: 'auto', ms: 750 },
    { step: 139, total: 140, label: 'Final review by Arlo (reviewing)', kind: 'auto', ms: 650 },
    { step: 140, total: 140, label: 'Submitting. Please do not breathe.', kind: 'auto', ms: 600 },
  ]
}

/* ------------------------------------------------------------------ */
/* micro interactions                                                  */
/* ------------------------------------------------------------------ */
function Cookies({ done }: { done: (q: string) => void }) {
  const [pref, setPref] = useState(false)
  return (
    <div className="jp-micro">
      <p>We use cookies. We use 31 of them. Please accept all of them.</p>
      {pref && <p className="dim" role="status">Preferences: 31 cookies. 0 options. This is the preferences screen.</p>}
      <div className="jp-row">
        <button type="button" className="btn hot" onClick={() => { audio.sfx('pop'); done('31 cookies accepted. You are now legally 4 lbs heavier.') }}>Accept all 31</button>
        <button type="button" className="btn ghost" onClick={() => { audio.sfx('deny'); setPref(true) }}>Manage preferences</button>
      </div>
    </div>
  )
}

function NameStep({ done }: { done: (q: string) => void }) {
  const [v, setV] = useState('')
  return (
    <div className="jp-micro">
      <label className="label" htmlFor="jp-name">Full legal name</label>
      <input
        id="jp-name" className="jp-input" value={v} autoComplete="off" spellCheck={false} placeholder="Type your name"
        onChange={(e) => {
          const n = Math.min(NAME.length, v.length + (e.target.value.length > v.length ? 1 : -1))
          setV(NAME.slice(0, Math.max(0, n)))
          audio.sfx('tick', { pitch: 1 + n * 0.04 })
        }}
      />
      <p className="dim">Name must match our records. {v.length > 0 && v.length < NAME.length ? 'It does now.' : ''}</p>
      <div className="jp-row"><button type="button" className="btn hot" disabled={v.length < 4} onClick={() => done(`Welcome, ${v.length >= NAME.length ? 'Arlo' : v + '...'}. We have been expecting you. (You have not been expected.)`)}>Continue</button></div>
    </div>
  )
}

function Passion({ done }: { done: (q: string) => void }) {
  const [max, setMax] = useState(10)
  const [val, setVal] = useState(4)
  const [msg, setMsg] = useState('Required: maximum passion.')
  const change = (n: number) => {
    setVal(n); audio.sfx('tick', { pitch: 0.8 + n * 0.07 })
    if (n >= max && max < 12) {
      const nm = max + 1
      setMax(nm); audio.sfx('error', { vol: 0.5 })
      setMsg(nm === 11 ? 'Scale recalibrated: it goes to 11 now. 10 is "fine".' : 'Scale recalibrated again: it goes to 12. Passion is a journey, and so is this.')
    } else if (n >= max && max >= 12) setMsg('Passion verified. Please stop.')
  }
  return (
    <div className="jp-micro">
      <div className="jp-passion"><b>{val}</b><span className="dim">/ {max}</span></div>
      <input type="range" className="jp-range" min={1} max={max} value={val} onChange={(e) => change(Number(e.target.value))} aria-label={`Passion, out of ${max}`} />
      <p className="dim" role="status">{msg}</p>
      <div className="jp-row"><button type="button" className="btn hot" disabled={!(val >= 12)} onClick={() => done('Passion verified at 12/12. This is not a measurable quantity. We measured it.')}>Continue</button></div>
    </div>
  )
}

function Resume({ done }: { done: (q: string) => void }) {
  const [p, setP] = useState<number | null>(null)
  useEffect(() => {
    if (p === null) return
    if (p >= 100) { const t = window.setTimeout(() => done("Parsed. Re-typed into 14 fields. Field 9 failed: 'Years of experience' expected a number, received 'yes'."), 900); return () => window.clearTimeout(t) }
    const t = window.setTimeout(() => { setP((x) => Math.min(100, (x || 0) + 9 + Math.random() * 14)); audio.sfx('tick', { pitch: 1 + (p || 0) / 100 }) }, 110)
    return () => window.clearTimeout(t)
  }, [p, done])
  return (
    <div className="jp-micro">
      <p>{p === null ? 'Upload your résumé (PDF). We will immediately ask you to type it again.' : p < 100 ? 'Parsing résumé...' : 'Parsed. Converting to a form...'}</p>
      {p !== null && <div className="jp-bar"><i style={{ width: `${Math.min(100, p)}%` }} /></div>}
      <div className="jp-row"><button type="button" className="btn hot" disabled={p !== null} onClick={() => { audio.sfx('whoosh'); setP(0) }}>Upload résumé.pdf</button></div>
    </div>
  )
}

function Salary({ done }: { done: (q: string) => void }) {
  const opts: [string, string][] = [
    ['Market rate', "Arlo's market is called exposure."],
    ['Competitive', 'Competitive with whom? Say it. Say his name.'],
    ['Equity', 'Fern holds 40%. There is 60% of a sticky note remaining.'],
  ]
  return (
    <div className="jp-micro">
      <p>Salary expectation. Choose one. They are the same one.</p>
      <div className="jp-row">
        {opts.map(([l, q]) => <button key={l} type="button" className="btn" onClick={() => { audio.sfx('click'); done(q) }}>{l}</button>)}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */
interface Mail { subject: string; paras: string[]; sent: string; arlo: string }

export default function JobPosting() {
  const [reqs, setReqs] = useState<Req[]>(BASE)
  const [bias, setBias] = useState(0)
  const [shown, setShown] = useState(8)
  const [recalcs, setRecalcs] = useState(1)
  const [rage, setRage] = useState(0)
  const [feed, setFeed] = useState<string[]>([])
  const [blocks, setBlocks] = useState(0)
  const [msg, setMsg] = useState('')
  const [shakeId, setShakeId] = useState<string | null>(null)
  const [cover, setCover] = useState('')
  const [mode, setMode] = useState<'form' | 'apply' | 'mail'>('form')
  const [attempt, setAttempt] = useState(0)
  const [steps, setSteps] = useState<Step[]>([])
  const [si, setSi] = useState(0)
  const [beat, setBeat] = useState('')
  const [mail, setMail] = useState<Mail | null>(null)
  const mounted = useRef(true)
  const rageRef = useRef(0)
  const saidRef = useRef<Record<string, boolean>>({})
  const modeRef = useRef<'form' | 'apply' | 'mail'>('form')
  modeRef.current = mode
  const reqsRef = useRef(reqs); reqsRef.current = reqs
  const coverRef = useRef(cover); coverRef.current = cover
  const statsRef = useRef({ shown: 8, bias: 0 }); statsRef.current = { shown, bias }

  const ticked = reqs.filter((r) => r.on)
  const overq = Math.max(0, ticked.length - 5) * 9
  const target = clamp(10 + ticked.reduce((a, r) => a + r.w, 0) - overq + bias, 1, 97)

  // the displayed match score drifts toward its (unfair) target with visible indecision
  useEffect(() => {
    const t = window.setInterval(() => {
      setShown((s) => {
        const d = target - s
        if (Math.abs(d) < 0.4) return target
        return s + d * 0.18 + (Math.random() - 0.5) * Math.min(4, Math.abs(d) * 0.3)
      })
    }, 40)
    return () => window.clearInterval(t)
  }, [target])

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; audio.stopVoice() } }, [])

  const pushFeed = useCallback((line: string) => setFeed((f) => [line, ...f].slice(0, 3)), [])

  const addRage = useCallback((d: number) => {
    const before = rageRef.current
    const after = clamp(before + d)
    rageRef.current = after
    setRage(after)
    const say = (k: string, t: string) => {
      if (saidRef.current[k]) return
      saidRef.current[k] = true
      pushFeed(t)
      void audio.say(t, { voice: 'recruiter', sub: true })
    }
    if (after >= 45 && before < 45) say('a', "I'm going to need you to stop ticking boxes.")
    if (after >= 80 && before < 80) say('b', "Please. They are checkboxes, not a personality.")
    if (after >= 100 && before < 100) { say('c', 'I am leaving the call. Your application will proceed without me.'); audio.sfx('airhorn', { vol: 0.5 }) }
  }, [pushFeed])

  /* ---------- ticking ---------- */
  const tick = (id: string) => {
    audio.init()
    const cur = reqsRef.current.find((r) => r.id === id)
    if (!cur || modeRef.current !== 'form') return
    if (cur.on) {
      const n = blocks
      setBlocks(n + 1)
      setMsg(BLOCKED[Math.min(n, BLOCKED.length - 1)])
      setShakeId(id); window.setTimeout(() => setShakeId(null), 420)
      audio.sfx('deny')
      addRage(4)
      if (n + 1 >= 4) useStore.getState().unlock('jobs.unhave', 'Un-Experienced', 'Tried to unhave experience four times. The checkbox filed a complaint.')
      return
    }
    audio.sfx('click')
    const rx = REACT[id]
    const tabs = Number(flag('tabs.closed')) || 0
    const mutated = rx?.mutate?.(tabs)
    setReqs((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, on: true, ...(mutated ? { text: mutated, flash: performance.now(), tag: 'UPDATED' } : {}) } : r))
      if (rx?.spawn && next.length < 16 && !next.some((r) => r.id === rx.spawn!.id)) next.push({ ...rx.spawn, on: false, flash: performance.now(), tag: 'NEW' })
      return next
    })
    if (mutated || rx?.spawn) window.setTimeout(() => audio.sfx('pop'), 140)
    // unfair recomputation
    const d = rnd(-14, 7)
    setBias((b) => clamp(b + d, -60, 30))
    setRecalcs((r) => r + 2 + Math.floor(Math.random() * 4))
    if (d < -6) { window.setTimeout(() => audio.sfx('error', { vol: 0.4 }), 220) }
    setMsg(rx?.quip || '')
    pushFeed(`${d < -6 ? 'Match score recomputed down' : d > 2 ? 'Match score recomputed up' : 'Match score recomputed (sideways)'}: ${rx?.quip || 'Noted.'}`)
    addRage(5 + Math.random() * 4)
  }

  /* ---------- cover letter ---------- */
  const wc = words(cover)
  const coverMsg =
    wc === 0 ? 'Required. Between 500 and 50 words.'
    : wc < 50 ? `${wc} words. Too short. Minimum is 500.`
    : wc === 50 ? '50 words. Perfect. Rejected: exactly on the boundary, which is ambiguous.'
    : wc < 500 ? `${wc} words. Too long. Maximum is 50.`
    : wc === 500 ? '500 words. Perfect. Now it must be 49.'
    : `${wc} words. Too long. Maximum is 50, and minimum is 500.`

  const writeAI = () => {
    audio.init(); audio.sfx('pop')
    setCover(COVER_AI)
    setMsg('Cover letter written by AI. Disclosure: Arlo also used AI for the posting.')
    addRage(4)
  }

  /* ---------- the application ---------- */
  const startApply = useCallback((auto = false) => {
    if (modeRef.current !== 'form') return
    audio.init()
    const st = useStore.getState()
    st.setFlag('jobs.applied', true)
    const a = attempt + 1
    setAttempt(a); setSteps(buildSteps(a)); setSi(0); setBeat(''); setMode('apply')
    audio.sfx('whoosh')
    if (auto) pushFeed('Application auto-submitted by a recruiter in tears.')
    else addRage(10)
  }, [attempt, addRage, pushFeed])

  // rage 100 => the system applies for you
  useEffect(() => {
    if (rage >= 100 && mode === 'form') {
      const t = window.setTimeout(() => startApply(true), 1500)
      return () => window.clearTimeout(t)
    }
  }, [rage, mode, startApply])

  const finish = useCallback(() => {
    const st = useStore.getState()
    const n = reqsRef.current.filter((r) => r.on).length
    const m = reqsRef.current.length
    const w = words(coverRef.current)
    const calls = Number(st.flags['phone.calls']) || 0
    const scan = typeof st.flags['aura.scan'] === 'string' ? (st.flags['aura.scan'] as string) : ''
    const tabs = Number(st.flags['tabs.closed']) || 0
    const att = Math.max(1, (attemptRef.current))
    const sent = ['0.3', '0.2', '0.1'][Math.min(att - 1, 2)] + 's'
    const sh = Math.round(statsRef.current.shown)
    const paras: string[] = [
      att > 2 ? 'Dear Applicant, again,' : 'Dear Applicant (we have checked; you are a person),',
      `Thank you for your interest in Vexxity Labs. After careful consideration (roughly ${att === 1 ? '0.3 seconds, which is the longest we have considered anything' : att === 2 ? '0.2 seconds, which is shorter, because we remember you' : 'negative time; we rejected you before you applied'}), we regret to inform you that you are overqualified.`,
      `You ticked ${n} of ${m} requirements, which is ${n >= 8 ? 'frankly intimidating' : n <= 2 ? 'too few, and also too many' : 'an amount'}. Your match score settled at ${sh}%, then recomputed while we were writing this sentence.`,
      w === 0 ? 'You submitted no cover letter. We admire the confidence. We also needed between 500 and 50 words from you.' : `Your cover letter was ${w} words. We asked for between 500 and 50. You delivered a ${w}-word masterpiece, which is wrong in ${w >= 50 && w <= 500 ? 'one direction' : 'two directions'}.`,
    ]
    if (calls > 0) paras.push(`You also called our references ${calls} time${calls === 1 ? '' : 's'}. Mom has been told. She is thrilled and would like you to stop.`)
    if (scan) paras.push(`Your aura on file (${scan}) was noted and, frankly, felt.`)
    if (tabs > 0) paras.push(`Also: you closed ${tabs} tab${tabs === 1 ? '' : 's'} while you were here. We saw. We are not mad. Arlo is in the garage.`)
    paras.push('We will keep your résumé on file for six to nine years, then delete it with feeling.')
    paras.push('Warm regards, Talent Acquisition (Arlo, in a different chair). P.S. The role has been filled by Arlo. He has been in it since yesterday.')
    const arlo = att === 1
      ? 'Arlo, reading this over your shoulder: "They are threatened by my hiring bar. This is what a pipeline looks like."'
      : att === 2 ? 'Arlo: "A repeat applicant. That is called retention."' : 'Arlo: "I rejected you pre-emptively. Do you know how senior that is?"'
    setMail({ subject: 'Re: Your application, Junior Entry-Level Visionary. Unfortunately, you are overqualified.', paras, sent, arlo })
    setMode('mail')

    audio.sfx('notify')
    window.setTimeout(() => audio.sfx('deny'), 260)
    fx.toast(`Rejected in ${sent}`, 'Reason: overqualified. Time to feel validated (Arlo): 0.1s.', 'error')
    if (att === 1) { fx.meme('L'); void audio.say('Congratulations. You are overqualified.', { voice: 'recruiter', sub: true }) }
    st.bump('aura', -6)
    st.bump('delusion', att === 1 ? 10 : 5)
    st.bump('ego', 5)
    st.bump('suspicion', 2)
    st.setFlag('jobs.applied', true)
    st.note(att === 1
      ? `Applied to Arlo's job posting (Junior Entry-Level Visionary, 12+ years) with ${n} of ${m} requirements, and was rejected in ${sent} for being overqualified`
      : `Applied to Arlo's job again (attempt ${att}) and was rejected in ${sent}`)
    st.unlock('jobs.rejected', 'Overqualified', 'Rejected in 0.3 seconds by a company of one.')
    if (att >= 3) st.unlock('jobs.again', 'Repeat Applicant', 'Applied three times. Arlo calls it "retention."')
  }, [])
  const attemptRef = useRef(0); attemptRef.current = attempt

  useEffect(() => {
    if (mode !== 'apply') return
    if (si >= steps.length) { finish(); return }
    const s = steps[si]
    if (s.kind !== 'auto') return
    const t = window.setTimeout(() => {
      if (!mounted.current) return
      audio.sfx('tick', { pitch: 0.8 + si * 0.06, vol: 0.6 })
      if (s.step >= 26 && s.step < 60) audio.sfx('error', { vol: 0.3 })
      setSi((x) => x + 1)
    }, s.ms || 600)
    return () => window.clearTimeout(t)
  }, [mode, si, steps, finish])

  const complete = useCallback((q: string) => {
    audio.sfx('success', { vol: 0.7 })
    setBeat(q)
    window.setTimeout(() => { if (!mounted.current) return; setBeat(''); setSi((x) => x + 1) }, 1100)
  }, [])

  const again = () => {
    audio.init(); audio.sfx('click')
    setMode('form'); setMail(null); setMsg('Experience is permanent. The checkboxes remember.')
  }

  /* ---------- derived ---------- */
  const cur = steps[Math.min(si, steps.length - 1)]
  const pct = cur ? (cur.step >= cur.total ? 100 : Math.max(1, Math.floor((cur.step / cur.total) * 100))) : 0
  const rageIdx = Math.min(RAGE_LABEL.length - 1, Math.floor(rage / 20))
  const matchTxt = Math.round(shown)

  return (
    <section className="panel jp" aria-label="Recruiter Rage Simulator">
      <div className="label">MECHANIC · RECRUITER RAGE SIMULATOR</div>

      {mode === 'form' && (
        <>
          <header className="jp-head">
            <div>
              <div className="label dim">VEXXITY LABS · REMOTE-ISH · POSTED YESTERDAY, ALSO IN 2019</div>
              <h2 className="h-mid jp-title">Junior Entry-Level <em className="hot">Visionary</em></h2>
              <p className="jp-sub">12+ years of experience required. Competitive compensation. We are a family (of one).</p>
            </div>
          </header>

          <div className="jp-grid">
            <div>
              <div className="label jp-h">Requirements <span className="dim">· tick what you have. You cannot untick it.</span></div>
              <ul className="jp-list">
                {reqs.map((r) => (
                  <li key={r.id} className={`jp-req ${r.on ? 'on' : ''} ${shakeId === r.id ? 'shake' : ''} ${r.tag ? 'fresh' : ''}`}>
                    <label>
                      <input type="checkbox" checked={r.on} onChange={() => tick(r.id)} aria-describedby="jp-msg" />
                      <span className="jp-box" aria-hidden="true">{r.on ? '✓' : ''}</span>
                      <span className="jp-text">{r.text}</span>
                      {r.tag && <span className="jp-tag">{r.tag}</span>}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="jp-msg" id="jp-msg" role="status" aria-live="polite">{msg}</p>
            </div>

            <aside className="jp-side" aria-label="Match score">
              <div className="jp-match">
                <div className="label">Match score</div>
                <div className={`jp-score ${matchTxt < 30 ? 'low' : matchTxt >= 60 ? 'high' : ''}`}>{matchTxt}<small>%</small></div>
                <div className="jp-score-bar"><i style={{ width: `${clamp(shown)}%` }} /></div>
                <div className="jp-meta dim">
                  Recomputed {recalcs}×{ticked.length > 5 ? ` · −${overq}% overqualified` : ''}{bias < -8 ? ' · −' + Math.round(-bias) + '% vibes' : bias > 8 ? ' · +' + Math.round(bias) + '% vibes' : ''}
                </div>
              </div>
              <div className="jp-rage">
                <div className="label">Recruiter rage</div>
                <div className="jp-rage-bar"><i style={{ width: `${rage}%` }} /></div>
                <div className="jp-meta">{RAGE_LABEL[rageIdx]}</div>
              </div>
              <ul className="jp-feed" aria-label="Recruiter notes">
                {feed.length === 0 && <li className="dim">Recruiter notes will appear here. He is typing.</li>}
                {feed.map((f, i) => <li key={f + i}>{f}</li>)}
              </ul>
            </aside>
          </div>

          <div className="jp-cover">
            <div className="jp-cover-head">
              <label className="label" htmlFor="jp-cover">Cover letter · between 500 and 50 words</label>
              <button type="button" className="jp-link" onClick={writeAI}>Write it with AI</button>
            </div>
            <textarea id="jp-cover" className="jp-textarea" rows={4} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Dear Arlo, I am passionate about..." aria-describedby="jp-cover-msg" />
            <div className={`jp-cover-msg ${wc === 0 ? '' : 'bad'}`} id="jp-cover-msg" aria-live="polite">{coverMsg}</div>
          </div>

          <div className="jp-actions">
            <button type="button" className="btn hot jp-apply" onClick={() => startApply(false)}>
              {attempt === 0 ? (ticked.length === 0 ? 'Apply with nothing (traditional)' : 'Apply now') : 'Apply again (nothing has changed)'}
            </button>
            <span className="dim jp-hint">Estimated time to apply: 4 minutes. Actual: also 4 minutes.</span>
          </div>
        </>
      )}

      {mode === 'apply' && cur && (
        <div className="jp-apply-box" aria-live="polite">
          <h2 className="h-mid">Application <em className="hot">progress.</em></h2>
          <div className="jp-prog-line">
            <b>Application Progress: {pct}%</b> <span className="dim">(Step {cur.step} of {cur.total})</span>
          </div>
          <div className="jp-bar big"><i style={{ width: `${pct}%` }} /></div>
          <div className="jp-step">
            <div className="label">{cur.label}</div>
            {beat ? <p className="jp-beat">{beat}</p> : cur.kind === 'auto' ? (
              <p className="jp-working"><span className="jp-spin" aria-hidden="true" /> Working...</p>
            ) : cur.kind === 'cookies' ? <Cookies done={complete} />
              : cur.kind === 'name' ? <NameStep done={complete} />
              : cur.kind === 'passion' ? <Passion done={complete} />
              : cur.kind === 'resume' ? <Resume done={complete} />
              : <Salary done={complete} />}
          </div>
        </div>
      )}

      {mode === 'mail' && mail && (
        <div className="jp-mail-wrap">
          <div className="jp-mail-top"><span className="stamp">Rejected</span><span className="jp-arrived">New message · arrived {mail.sent} after submit</span></div>
          <article className="jp-mail" aria-label="Rejection email">
            <div className="jp-mail-meta">
              <div><span className="label">From</span> Talent Acquisition (Automated) &lt;talent@vexxity.invalid&gt;</div>
              <div><span className="label">Subject</span> <b>{mail.subject}</b></div>
              <div><span className="label">Opened</span> before you submitted</div>
            </div>
            <div className="jp-mail-body">{mail.paras.map((p, i) => <p key={i}>{p}</p>)}</div>
          </article>
          <p className="jp-arlo">{mail.arlo}</p>
          <div className="jp-actions"><button type="button" className="btn" onClick={again}>Apply again</button></div>
        </div>
      )}
    </section>
  )
}
