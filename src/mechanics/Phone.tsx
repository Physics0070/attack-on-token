import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore, fx } from '../state/store'
import { audio } from '../audio/engine'
import './Phone.css'

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */
type Voice = 'ai' | 'announcer' | 'corporate' | 'arlo' | 'mom' | 'recruiter' | 'robot'
type SfxName = Parameters<typeof audio.sfx>[0]
type Status = 'idle' | 'ringing' | 'connected' | 'holding'

interface Line { v: Voice; t: string; rate?: number; pitch?: number; sfx?: SfxName }
interface Ctx {
  tabs: number; escaped: boolean; burst: boolean; peak: number; applied: boolean
  scan: string; failed: number; convicted: number; aura: number; susp: number
  revealed: boolean; calls: number
}
interface Eff { sus?: number; del?: number; aura?: number }
interface Script {
  id: string
  who: string
  takes: ((c: Ctx) => Line[])[]
  eff: Eff
  note: string
  unlock?: [string, string, string]
  onEnd?: () => void
}
interface Contact { id: string; name: string; role: string; number: string; voice: Voice; blurb: string }
interface LogRow { id: number; kind: 'head' | 'line' | 'sys'; who?: string; text: string; voice?: Voice }

const L = (v: Voice, t: string, o: Partial<Line> = {}): Line => ({ v, t, ...o })
const keep = (xs: (Line | false | null | undefined)[]) => xs.filter(Boolean) as Line[]

/* ------------------------------------------------------------------ */
/* the references                                                      */
/* ------------------------------------------------------------------ */
const CONTACTS: Contact[] = [
  { id: 'mom', name: 'Mom', role: 'Head of Investor Relations', number: '5550100', voice: 'mom', blurb: 'Sole investor. Sole attendee.' },
  { id: 'dale', name: 'Dale Whitcombe', role: 'Former manager · currently in therapy', number: '5550142', voice: 'corporate', blurb: 'Signed an agreement. Cannot elaborate.' },
  { id: 'fern', name: 'Fern', role: 'Ex-cofounder · a houseplant', number: '5550199', voice: 'robot', blurb: 'Holds 40% equity. Is a ficus.' },
  { id: 'brad', name: 'Brad Hollis-Kane', role: 'Rival · owns a yacht', number: '5550187', voice: 'announcer', blurb: 'Says he loves Arlo. Sounds sweaty.' },
  { id: 'page', name: 'Page Support', role: 'Customer line of the one Notion page', number: '5550123', voice: 'robot', blurb: 'Press 1 if your page is blank.' },
  { id: 'hr', name: 'Vexxity HR', role: 'Head of People: Arlo', number: '5550166', voice: 'recruiter', blurb: 'Appeals go to Arlo.' },
]

const SCRIPTS: Record<string, Script> = {
  mom: {
    id: 'mom', who: 'Mom',
    eff: { sus: 4, del: 6 },
    note: "Called Arlo's reference Mom, who gave him five stars and a snack",
    takes: [
      (c) => keep([
        L('mom', "Hello, you've reached Arlo's mother. Sorry. Head of Investor Relations, Vexxity Labs. I can't come to the phone because I'm at book club, and by book club I mean I am watching his webinar again. It has eleven views. Nine are me."),
        L('mom', "If you're calling for a reference: yes. He's wonderful. He once ran a meeting. I was the only attendee. I gave it five stars, and a snack."),
        c.tabs > 0
          ? L('mom', `I hear he closed ${c.tabs} of his tabs. Oh, honey. Those were his employees. Well. A few of them were Gmail.`)
          : L('mom', "He has forty-seven browser tabs open, and I'm told that is the roadmap. I asked what's on the roadmap. He said, a tab."),
        c.burst && L('mom', "And please ignore the inflating thing. He's fine. It was a balloon. It was a metaphor. It was a little bit his fault."),
        L('mom', "My investment so far is four hundred dollars, a casserole, and my entire reputation at church. At the tone, please leave your name, your number, and whether you believe in him. Be honest. He'll read it."),
      ]),
      (c) => keep([
        L('mom', "Oh! You again. Okay. Between us, the casserole was a loan."),
        L('mom', "Arlo said you might call. He said to tell you he's in a meeting. He's in the garage. He has been in the garage since Tuesday. Today is Thursday. The garage has excellent signal."),
        L('mom', "He asked me to say he has twelve plus years of experience. He's twenty-six. I was there for all of them. I remember eight."),
        c.applied && L('mom', "Someone applied to his job posting and got rejected in point three seconds, and he took it as a sign of excellence. He is insufferable and I love him."),
      ]),
      () => [
        L('mom', "Please stop calling."),
        L('mom', "I've told the neighbours. I've told the church. The Neighbourhood Watch thinks you're a recruiter."),
        L('mom', "He's a good boy. He is. ... He's a good boy."),
        L('mom', "I only said Head of Investor Relations because he made me a business card. It's laminated. It's the only thing in this house holding together."),
      ],
    ],
  },
  dale: {
    id: 'dale', who: 'Dale',
    eff: { sus: 8, aura: -2 },
    note: "Called Dale Whitcombe, who described Arlo as present, most Tuesdays",
    takes: [
      (c) => keep([
        L('corporate', "You've reached Dale Whitcombe. Dale is currently on a sabbatical he describes as non-negotiable, and his therapist describes as overdue."),
        L('corporate', "If this is about Arlo Pemberton-Vex: I have signed an agreement. I am unable to say anything negative. I am also unable to say anything positive. I can say that Arlo was ... present. Most Tuesdays."),
        L('corporate', "He once asked me to circle back on a conversation we had not yet had. I am still circling. I have been circling since March. If you see me, I am the one by the hedge."),
        c.tabs > 0
          ? L('corporate', "I understand someone closed some of his tabs. Dale approves. Dale has no tabs. Dale has peace.")
          : L('corporate', "He sent me a message with sixty-one exclamation marks. It said, quick q. It was not quick. It was not a q."),
        L('corporate', "Leave a message after the tone. Or don't. Dale will be okay either way. That's the work."),
      ]),
      () => [
        L('corporate', "Dale's phone is off. If you are hearing this, you have the wrong Dale, or the right Dale on a day he is not strong."),
        L('corporate', "I am recording this from a hammock. I've been advised to say, I forgive Arlo. I'm not there yet. I'm at, I do not wish him harm. That is the whole treatment plan."),
        L('corporate', "Once I gave Arlo a performance review. He gave me a performance review of my performance review. The second review was longer."),
      ],
      () => [
        L('recruiter', "This is the office of Doctor Okafor, Dale's therapist. Dale is not here. Dale has told me everything."),
        L('recruiter', "We would like to speak with you, kindly, about your calling pattern. This is the third time."),
        L('recruiter', "Dale has asked that you not take this personally. He has also asked that you take a walk."),
      ],
    ],
  },
  fern: {
    id: 'fern', who: 'Fern',
    eff: { sus: 8, aura: -3 },
    note: 'Called Arlo\'s ex-cofounder Fern, a ficus with 40% equity and 4% moisture',
    takes: [
      () => [
        L('robot', "You have reached Fern. Fern is a ficus."),
        L('robot', "Fern co-founded Vexxity Labs in the sun room nineteen months ago, and holds forty percent equity, in the form of a notarised sticky note."),
        L('robot', "Fern has not spoken since the pivot. Fern drooped at the pivot. The pivot was from AI for pets, to pets for AI. Fern was neither."),
        L('robot', "This message is automated. Fern's voice is a moisture sensor. Current soil moisture: four percent. This is categorised as neglect, but make it a founder story."),
        L('robot', "Fern's equity vests on the day Arlo apologises. The vesting schedule is: never. At the tone, leave a reference. Or water. Water is preferable."),
      ],
      (c) => keep([
        L('robot', "Moisture: three percent."),
        c.tabs > 0 && L('robot', "Fern was told you closed tabs. Fern felt something. It was probably the radiator."),
        L('robot', "Fern wishes to say, in plant: shhhh. Translation: He called me a stakeholder. I am a plant."),
        L('robot', "Fern is not bitter. Fern is photosynthetic. These are different things. One of them is chlorophyll."),
        L('robot', "Fern has seen the cap table. The cap table is a sticky note. The sticky note is also on Fern."),
      ]),
      () => [
        L('robot', "Fern has dropped a leaf. In some cultures that is a reference. In this one, it is a resignation."),
        L('robot', "The leaf is on the carpet. Arlo has called it a pivot."),
        L('robot', "Please stop calling. Please water."),
      ],
    ],
  },
  brad: {
    id: 'brad', who: 'Brad',
    eff: { sus: 10, aura: -3 },
    note: 'Called rival Brad, who disclosed a 204-times-recurring invite titled "Brad Sync (Agenda: Brad)"',
    takes: [
      (c) => keep([
        L('announcer', "Brad Hollis-Kane here! Founder and CEO of Hollis-Kane Ventures. Nine employees. Zero tabs. One yacht, which is not a metaphor.", { rate: 1.05 }),
        L('announcer', "You're calling about Arlo. Great guy. Love the guy. Genuinely. He sent me a calendar invite called Brad Sync, agenda: Brad. Recurring. Daily. Forever. I declined it. He re-sent it. Two hundred and four times. At three oh seven in the morning.", { rate: 1.05 }),
        L('announcer', "I'm not saying it's harassment. I'm saying my lawyer used the phrase, founder-led hostage situation."),
        c.applied
          ? L('announcer', "And I saw his job posting. Junior, entry level, twelve plus years experience. I laughed for six business days. I had it framed. It's on the yacht.")
          : L('announcer', "He tells people we compete. We have never competed. He has never entered the building. He attended our all-hands once, from the lobby, on mute."),
        L('announcer', "Between us. If you want his real references, dial five five five, zero zero zero zero. That's the Vexxity customer hold line. Nobody has ever waited more than twenty seconds. Be the first. Brad out!"),
      ]),
      () => [
        L('announcer', "Brad again! Quick update. Arlo has started a podcast about me. It has one listener. It's me. I listen on the yacht. Everyone says I'm laughing. I'm not laughing."),
        L('announcer', "He says my success is a function of luck, parentage, and a good blazer. Okay, yes. That is the entire plan. He's very close to understanding it."),
        L('announcer', "Remember. Five five five, zero zero zero zero. Stay on the line. Do it for Brad."),
      ],
      () => [
        L('announcer', "Brad is currently on a boat. If you are calling to say Arlo sent you, please know the boat has anti-Arlo measures."),
        L('announcer', "The measures are a man called Greg."),
      ],
    ],
  },
  page: {
    id: 'page', who: 'Page Support',
    eff: { sus: 6, aura: -1 },
    note: 'Called Page Support, who confirmed 47 comments on the one page, 46 of them "bump"',
    takes: [
      () => [
        L('robot', "Thank you for calling Page Support. Your call is important to this page."),
        L('robot', "Press 1 if your page is blank. Press 2 if your page is blank and you are Arlo. Press 3 if your page is blank and Arlo has called you a partner. Press 4 for our enterprise tier, which is also blank."),
        L('robot', "Based on our records, this account has: one page. Zero collaborators. Forty-seven comments. All from Arlo. Forty-six of them say, bump."),
        L('robot', "The page is titled Vexxity Labs Roadmap, Draft. It has been in draft since the first draft. The first draft was the title."),
        L('robot', "For a better hold experience, dial triple five, zero zero zero zero. It is not recommended. It is on file as Arlo's idea of music. This call may be recorded, but not read."),
      ],
      () => [
        L('robot', "Welcome back. Our system has detected a pattern: you have called a page, about a page, to complain about a page."),
        L('robot', "Your estimated wait time is: one page."),
        L('robot', "A new comment has been added to the page. It says, bump. It is from Arlo. The timestamp is: now."),
      ],
      () => [
        L('robot', "This page has been archived. Please stop. The page has feelings. The page would like to become a database."),
      ],
    ],
  },
  hr: {
    id: 'hr', who: 'Vexxity HR',
    eff: { sus: 7, del: 3 },
    note: "Called Vexxity HR and was told the appeals process is Arlo, on a different chair",
    takes: [
      (c) => keep([
        L('recruiter', "Thanks for calling Vexxity Labs Human Resources, where people are our greatest asset, and by people I mean Arlo. This is Jess. ... This is Jess, a voice I do."),
        L('recruiter', "If you'd like to report a complaint about a manager, press 1. If you'd like to report a complaint about Arlo, press 1. Escalations go to Arlo. Appeals go to Arlo. The appeals process for appealing an appeal is also Arlo, in a different chair."),
        L('recruiter', "Headcount: one. Attrition: one, over the weekend, then rehired as a consultant. Same desk. Higher rate. Less lunch."),
        c.applied
          ? L('recruiter', "And we reviewed your application. You are overqualified. Thank you for your interest. Please don't call back.")
          : L('recruiter', "Open roles: Junior Entry-Level Visionary. Twelve plus years required. If you meet the criteria, you are lying, and we are hiring."),
        L('recruiter', "Your call is very important to our culture. Culture is Arlo. Beep."),
      ]),
      () => [
        L('recruiter', "Jess again. Quick compliance reminder: mandatory fun is mandatory. It starts at nine. It continues until the fun is complete."),
        L('recruiter', "We had an incident. The incident was Arlo, in a mirror, giving himself a performance improvement plan. He passed. He failed. He asked for a second opinion. He is the second opinion."),
      ],
      () => [
        L('recruiter', "Jess has left the company. Jess was never in the company. Jess is a voice. A voice has the right to resign. Jess is resigning."),
        L('arlo', "Hi. It's me. Great call, everybody."),
      ],
    ],
  },
  /* ---- specials ---- */
  operator: {
    id: 'operator', who: 'Operator',
    eff: { sus: 8 },
    note: 'Dialed 0 and found out the operator is Arlo',
    unlock: ['phone.operator', 'Operator Is In', 'Dial 0. The operator was Arlo. It was always Arlo.'],
    takes: [
      () => [
        L('corporate', "Operator. How may I direct your call?"),
        L('arlo', "... Hi. It's Arlo. I'm the operator now. It's a pivot. Please don't tell the others."),
        L('arlo', "Who were you trying to reach? ... Yes. That's me too. ... And that one. ... Yeah, that one too. We're lean."),
      ],
      () => [
        L('corporate', "Operator. Yes, it's still me. Please don't ask about the other lines."),
        L('arlo', "Dale is a real person. Dale was a real person. Dale had a hammock. I'm just keeping Dale's line warm."),
      ],
      () => [
        L('arlo', "Okay. Fine. Okay. I'll say it."),
        L('arlo', "I'm Dale. I've been doing Dale. Dale is mostly improv."),
        L('arlo', "Fern is a plant. That part is real. The voice is also me. I'm just a very convincing moisture sensor."),
        L('arlo', "Brad is me. I've been doing Brad since twenty twenty-two. I got fired from being Brad. By Brad."),
        L('arlo', "Mom is ... no. Mom is Mom. Mom is real. Please call her. She's been alone with the casserole."),
      ],
      () => [
        L('arlo', "Operator. Yes. I know that you know. It's fine. We can all just be friends here."),
      ],
    ],
  },
  emergency: {
    id: 'emergency', who: 'Synergy Emergency',
    eff: { sus: 2, aura: 4 },
    note: 'Dialed 911 and reported a synergy emergency',
    unlock: ['phone.911', 'Synergy Emergency', 'Dial 911. Nobody was in danger. Everyone was in a meeting.'],
    takes: [
      () => [
        L('corporate', "Vexxity Emergency Services. Please state the nature of your synergy emergency."),
        L('corporate', "... Thank you. You are caller number forty-seven. Estimated wait: eleven pivots."),
        L('corporate', "If your synergy is actively leaking, press 1. If it has become sentient, press 2. If it is Arlo, you have already pressed it."),
        L('corporate', "A team has been dispatched. The team is one man. He is wearing a lanyard. He has been told it's serious. He is on a scooter.", { sfx: 'laser' }),
      ],
      () => [
        L('corporate', "You are calling again about the emergency. The emergency has been resolved. It was a meeting."),
        L('corporate', "We have scheduled a follow-up meeting to discuss the emergency meeting. It is also an emergency."),
      ],
    ],
  },
  directory: {
    id: 'directory', who: 'Directory',
    eff: { sus: 3 },
    note: 'Called directory assistance, which listed Arlo as "Please Come Home"',
    takes: [
      () => [
        L('robot', "Directory assistance. What listing?"),
        L('robot', "... Arlo Pemberton-Vex. I have: Chief Visionary Synergy Architect, self-appointed. I also have: Arlo, Concerned Mother Of. And: Arlo, Please Come Home."),
        L('robot', "Connecting you now."),
        L('robot', "... He has declined the call. He has declined himself. This has never happened before. He has asked to be called back on his own number."),
      ],
      (c) => [
        L('robot', c.tabs > 0
          ? `Listing: Arlo, ${Math.max(1, 47 - c.tabs)} tabs from freedom.`
          : 'Listing: Arlo, still in the garage. Arlo, forty-seven tabs from freedom.'),
        L('robot', "Listing: Arlo, available for panels. Listing: Arlo, not available for criticism."),
      ],
    ],
  },
  jenny: {
    id: 'jenny', who: 'Jenny',
    eff: { sus: 2 },
    note: 'Dialed Jenny. Jenny changed her number',
    takes: [
      () => [
        L('robot', "You have dialed Jenny."),
        L('robot', "Jenny has changed her number. Jenny has asked that you not reach out. Jenny has also asked Arlo not to reach out. Arlo reached out anyway, in the form of a four-slide deck."),
        L('robot', "Jenny wishes you well. Jenny does not wish the deck well."),
      ],
    ],
  },
  star69: {
    id: 'star69', who: 'Callback',
    eff: { sus: 1, aura: -2 },
    note: 'Pressed star six nine and was told the last caller was themselves, from next Thursday',
    takes: [
      (c) => [
        L('robot', "The last number to call you was: you. From next Thursday."),
        L('robot', c.calls > 5
          ? `You will call yourself fourteen times. You have already made ${c.calls}. You are on schedule.`
          : "You will call yourself fourteen times. We recommend not."),
      ],
    ],
  },
}

/** Wrong numbers get progressively more concerned about the caller. */
const UNKNOWN: ((c: Ctx, n: number) => Line[])[] = [
  () => [L('robot', "The number you have dialed is not in service. It was in service once. It had dreams.")],
  () => [L('robot', "We're sorry. Your call cannot be completed as dialed, because it was dialed by you.")],
  () => [L('robot', "That is a wrong number. However, it is the most credible reference Arlo has had all day. Congratulations.")],
  (_c, n) => [
    L('robot', `You have now dialed ${n} wrong numbers. We are legally required to ask if you are okay.`),
    L('robot', "... Are you okay? ... Press any key. Not that one."),
  ],
  () => [L('robot', "Wrong number. But Arlo says hi. He's been listening this entire time. He's on every line. Do not tell him I said that.")],
]

const AFTER_REVEAL = [
  "... Sorry. That last bit was me. I do this voice when I'm nervous.",
  "Anyway. I'm Arlo. Please keep it between us.",
  "Okay yes it's me, the operator, everybody, hi. It's a lean org.",
  "I swear the plant was real though. I'm just a very good moisture sensor.",
]
const CLOSERS = [
  'Your message has been recorded and will be ignored with great care.',
  'Message saved. It tested as a lot.',
  'Thank you. Your reference has been forwarded to Arlo, who will take credit.',
  'Message deleted. Too credible.',
  'Your feedback is valuable and has been placed with the other feedback, in the bin.',
]
const HOLD_SAYS = [
  'Your call is important to us. Please continue to hold. You are caller number one, in a queue of one.',
  'Estimated wait time: all of it.',
  'This music was composed by Arlo, on a Tuesday. He is very proud. He asks that you hold yourself to the standard.',
  'If you would like to leave, you may. Nobody has. The door is the hang up button. We recommend you do not use the door.',
  'Your patience has been noted. It has been added to Arlo\'s resume.',
]

const SPECIAL_ROUTE: Record<string, string> = {
  '911': 'emergency', '0': 'operator', '411': 'directory', '8675309': 'jenny', '*69': 'star69',
}
const HOLD_NUMBER = '5550000'
const SHORT = new Set(['911', '0', '411', '*69'])

const KEYS: [string, string][] = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', ''],
]
const toIdx = (ch: string) => (ch === '*' ? 10 : ch === '#' ? 11 : Number(ch))
const fmt = (d: string) => (/^\d+$/.test(d) && d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d)

const getCtx = (): Ctx => {
  const s = useStore.getState(); const f = s.flags
  return {
    tabs: Number(f['tabs.closed']) || 0, escaped: !!f['tabs.escaped'], burst: !!f['inflation.burst'],
    peak: Number(f['inflation.peak']) || 0, applied: !!f['jobs.applied'],
    scan: typeof f['aura.scan'] === 'string' ? (f['aura.scan'] as string) : '',
    failed: Number(f['captcha.failed']) || 0, convicted: Number(f['tribunal.convicted']) || 0,
    aura: s.aura, susp: s.suspicion, revealed: !!f['phone.revealed'], calls: Number(f['phone.calls']) || 0,
  }
}

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */
export default function Phone() {
  const suspicion = useStore((s) => s.suspicion)
  const [dialed, setDialed] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [calling, setCalling] = useState<{ label: string; sub: string } | null>(null)
  const [now, setNow] = useState('')
  const [progress, setProgress] = useState(0)
  const [log, setLog] = useState<LogRow[]>([])
  const [heard, setHeard] = useState<Record<string, number>>({})
  const [pressed, setPressed] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const [holdSec, setHoldSec] = useState(0)

  const mounted = useRef(true)
  const callRef = useRef(0)
  const statusRef = useRef<Status>('idle')
  const countsRef = useRef<Record<string, number>>({})
  const wrongRef = useRef(0)
  const rowId = useRef(1)
  const holdTimer = useRef<number | null>(null)
  const typeTimers = useRef<number[]>([])
  const logBox = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLElement>(null)
  const visible = useRef(false)
  const dialedRef = useRef('')
  dialedRef.current = dialed
  statusRef.current = status

  const push = useCallback((r: Omit<LogRow, 'id'>) => {
    setLog((l) => [...l.slice(-60), { ...r, id: rowId.current++ }])
  }, [])

  const alive = (id: number) => mounted.current && callRef.current === id
  const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

  const clearHold = () => { if (holdTimer.current != null) { window.clearInterval(holdTimer.current); holdTimer.current = null } }
  const clearTyping = () => { typeTimers.current.forEach((t) => window.clearTimeout(t)); typeTimers.current = [] }

  /* ---------- end a call (natural or hung up) ---------- */
  const finish = useCallback((hungUp: boolean, wasHold: boolean) => {
    callRef.current++
    clearHold()
    audio.stopVoice()
    audio.sfx('hangup')
    if (wasHold) audio.music.resume()
    setStatus('idle'); setCalling(null); setNow(''); setDialed(''); setProgress(0); setHoldSec(0)
    if (hungUp) push({ kind: 'sys', text: 'Line dropped. (You hung up.)' })
  }, [push])

  const hangUp = useCallback(() => {
    if (statusRef.current === 'idle') return
    finish(true, statusRef.current === 'holding')
  }, [finish])

  /* ---------- the hold line: awful on purpose ---------- */
  const runHold = useCallback(async (id: number) => {
    setStatus('holding')
    audio.music.cut()
    push({ kind: 'sys', text: 'You have entered the Vexxity hold queue. Position: 1 of 1.' })
    await audio.say('Please hold.', { voice: 'robot', sub: false })
    if (!alive(id)) return
    let tick = 0; let say = 0; const started = performance.now()
    let got20 = false; let got45 = false
    const scale = [0, 2, 4, 5, 4, 2, 0, -3, 7, 6, 4, 11, 0, 1, 3, 2]
    holdTimer.current = window.setInterval(() => {
      if (!alive(id)) { clearHold(); return }
      const i = tick++
      const semi = scale[i % scale.length] + (i % 5 === 4 ? (Math.random() < 0.5 ? 1 : -1) * (1 + Math.random() * 2) : 0)
      const pitch = Math.pow(2, semi / 12) * (0.8 + (i % 7 === 6 ? Math.random() * 0.6 : 0))
      audio.sfx(i % 3 === 2 ? 'ding' : 'bell', { pitch, vol: 0.7 })
      if (i % 11 === 10) audio.sfx('error', { vol: 0.35 })
      const sec = Math.floor((performance.now() - started) / 1000)
      setHoldSec(sec)
      if (i > 0 && i % 26 === 0 && say < HOLD_SAYS.length) {
        const t = HOLD_SAYS[say++]
        push({ kind: 'line', who: 'Hold', text: t, voice: 'robot' })
        setNow(t)
        void audio.say(t, { voice: 'robot', sub: false })
      }
      if (!got20 && sec >= 20) {
        got20 = true
        const st = useStore.getState()
        st.unlock('phone.hold', 'Hold Music Survivor', 'Stayed on hold for 20 seconds. Nobody does that. Brad owes you a yacht ride.')
        st.bump('aura', 20); st.bump('suspicion', 4)
        st.note('Endured 20 seconds of Vexxity hold music, which Arlo composed')
        fx.toast('Hold Music Survivor', '+20 aura. The music is, in fact, getting worse.', 'win')
        audio.sfx('achievement')
      }
      if (!got45 && sec >= 45) {
        got45 = true
        useStore.getState().bump('aura', 25)
        fx.meme('aura', '45 SECONDS ON HOLD')
        fx.toast('Record broken', 'Longest hold in company history. Previous record: you, 25 seconds ago.', 'win')
        audio.sfx('fanfare')
      }
    }, 340)
  }, [push])

  /* ---------- a full call ---------- */
  const placeCall = useCallback(async (num: string) => {
    if (statusRef.current !== 'idle') return
    audio.init()
    const id = ++callRef.current
    setTyping(false)
    const isHold = num === HOLD_NUMBER
    const contact = CONTACTS.find((c) => c.number === num)
    const routeId = contact ? contact.id : SPECIAL_ROUTE[num]
    const script = routeId ? SCRIPTS[routeId] : undefined
    const name = contact ? contact.name : isHold ? 'Vexxity Hold Line' : script ? script.who : 'Unknown'
    const sub = contact ? contact.role : isHold ? 'Not recommended' : script ? 'Special line' : 'Not in service'

    setStatus('ringing'); setCalling({ label: name, sub }); setProgress(0); setNow('')
    push({ kind: 'head', text: `${name}  ·  ${fmt(num)}` })

    const rings = isHold ? 1 : 2 + Math.floor(Math.random() * 2)
    for (let r = 0; r < rings; r++) {
      audio.sfx('ring')
      await sleep(1450)
      if (!alive(id)) return
    }
    if (isHold) { useStore.getState().incFlag('phone.calls'); await runHold(id); return }

    setStatus('connected')
    audio.sfx('click')
    const st = useStore.getState()
    st.incFlag('phone.calls')
    const ctx = getCtx()
    if (ctx.calls === 0) st.unlock('phone.first', 'Reference Checked', 'Called a reference. The reference called it a "situation".')

    // pick the take
    let lines: Line[]
    let take = 0
    let eff: Eff = { sus: 1 }
    let key = routeId || 'unknown'
    if (script) {
      take = countsRef.current[key] || 0
      const t = script.takes[Math.min(take, script.takes.length - 1)]
      lines = t(ctx)
      eff = script.eff
    } else {
      take = wrongRef.current++
      lines = UNKNOWN[Math.min(take, UNKNOWN.length - 1)](ctx, take + 1)
      key = 'unknown'
    }
    countsRef.current[key] = (countsRef.current[key] || 0) + 1
    if (key !== 'unknown') setHeard((h) => ({ ...h, [key]: (h[key] || 0) + 1 }))

    if (ctx.revealed && script && contact) {
      lines = [...lines, L('arlo', AFTER_REVEAL[take % AFTER_REVEAL.length], { rate: 1.02 })]
    }

    await sleep(380)
    if (!alive(id)) return
    audio.sfx('voicemail')
    await sleep(350)
    if (!alive(id)) return

    const mid = Math.max(1, Math.ceil(lines.length / 2))
    for (let i = 0; i < lines.length; i++) {
      if (!alive(id)) return
      const ln = lines[i]
      push({ kind: 'line', who: script ? script.who : 'Operator', text: ln.t, voice: ln.v })
      setNow(ln.t); setProgress((i + 1) / lines.length)
      if (ln.sfx) audio.sfx(ln.sfx)
      // the reference "speaks" -> suspicion rises (only if you listen past the midpoint)
      if (i === mid - 1) {
        const k = take === 0 ? 1 : 0.45
        const s2 = useStore.getState()
        if (eff.sus) s2.bump('suspicion', Math.round(eff.sus * k))
        if (eff.del) s2.bump('delusion', Math.round(eff.del * k))
        if (eff.aura) s2.bump('aura', Math.round(eff.aura * k))
        if (take === 0 && script) s2.note(script.note)
        if (take === 0) audio.sfx(eff.sus && eff.sus >= 8 ? 'stinger' : 'tick')
        if (script?.unlock && take >= (script.id === 'operator' ? 2 : 0)) {
          s2.unlock(...script.unlock)
        }
      }
      await audio.say(ln.t, { voice: ln.v, rate: ln.rate, pitch: ln.pitch, sub: false })
      if (!alive(id)) return
      await sleep(i < lines.length - 1 ? 300 : 150)
    }
    if (!alive(id)) return

    // operator reveal: the third dial turns every future voicemail
    if (routeId === 'operator' && take >= 2 && !useStore.getState().flags['phone.revealed']) {
      const s3 = useStore.getState()
      s3.setFlag('phone.revealed', true)
      s3.bump('suspicion', 12); s3.bump('delusion', -6); s3.bump('aura', 15)
      fx.meme('npc', 'THE OPERATOR WAS ARLO')
      fx.glitch(500); fx.shake(350)
      audio.sfx('scratch')
    }

    // answering machine tail
    audio.sfx('voicemail')
    setNow('Recording ...')
    await sleep(900)
    if (!alive(id)) return
    const closer = CLOSERS[(countsRef.current[key] + (take || 0)) % CLOSERS.length]
    push({ kind: 'sys', text: closer })
    await audio.say(closer, { voice: 'robot', rate: 1.08, sub: false })
    if (!alive(id)) return

    // collection achievements
    const s4 = useStore.getState()
    const done = CONTACTS.filter((c) => (countsRef.current[c.id] || 0) > 0).length
    if (done === CONTACTS.length) {
      s4.unlock('phone.all', 'Due Diligence Goblin', 'Reference-checked every reference. They all said "no comment" differently.')
      s4.bump('aura', 10)
    }
    if (routeId === 'mom' && take >= 2) s4.unlock('phone.mom3', 'Mom Has Muted You', 'Called Mom three times. She says hi. She also says stop.')
    finish(false, false)
  }, [finish, push, runHold])

  /* ---------- keypad ---------- */
  const press = useCallback((ch: string) => {
    audio.init()
    audio.sfx('dtmf', { level: toIdx(ch) })
    setPressed(ch); window.setTimeout(() => setPressed((p) => (p === ch ? null : p)), 110)
    if (statusRef.current !== 'idle') return // keys just beep during a call
    if (dialedRef.current.length >= 10) { audio.sfx('deny'); return }
    setDialed((d) => d + ch)
  }, [])

  const back = useCallback(() => {
    if (statusRef.current !== 'idle' || typing) return
    audio.sfx('tick'); setDialed((d) => d.slice(0, -1))
  }, [typing])

  const callNow = useCallback(() => {
    audio.init()
    if (statusRef.current !== 'idle') return
    const d = dialedRef.current
    if (!d) { audio.sfx('deny'); fx.toast('No number', 'Dial something. Even Arlo dials something.', 'error'); return }
    void placeCall(d)
  }, [placeCall])

  // tapping a card types the number in with real tones, then dials
  const dialCard = (c: Contact) => {
    audio.init()
    if (statusRef.current !== 'idle' || typing) { audio.sfx('deny'); return }
    clearTyping(); setTyping(true); setDialed('')
    c.number.split('').forEach((ch, i) => {
      typeTimers.current.push(window.setTimeout(() => {
        if (!mounted.current) return
        audio.sfx('dtmf', { level: toIdx(ch) })
        setPressed(ch); window.setTimeout(() => setPressed((p) => (p === ch ? null : p)), 90)
        setDialed((d) => d + ch)
      }, 120 + i * 135))
    })
  }

  // auto-dial: 7 digits, or a known short code after a brief pause
  useEffect(() => {
    if (status !== 'idle' || !dialed) return
    if (/^\d{7}$/.test(dialed)) {
      const t = window.setTimeout(() => void placeCall(dialed), 300)
      return () => window.clearTimeout(t)
    }
    if (SHORT.has(dialed)) {
      const t = window.setTimeout(() => void placeCall(dialed), 1400)
      return () => window.clearTimeout(t)
    }
  }, [dialed, status, placeCall])

  // keyboard (only while the section is on screen and no text field has focus)
  useEffect(() => {
    const el = root.current
    let io: IntersectionObserver | null = null
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting }, { threshold: 0.25 })
      io.observe(el)
    } else visible.current = true
    const onKey = (e: KeyboardEvent) => {
      if (!visible.current || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (/^[0-9*#]$/.test(e.key)) { press(e.key); e.preventDefault() }
      else if (e.key === 'Backspace') back()
      else if (e.key === 'Enter' && !(t && t.tagName === 'BUTTON')) callNow()
      else if (e.key === 'Escape') hangUp()
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); io?.disconnect() }
  }, [press, back, callNow, hangUp])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false; callRef.current++
      clearHold(); clearTyping(); audio.stopVoice()
      if (statusRef.current === 'holding') audio.music.resume()
    }
  }, [])

  useEffect(() => { logBox.current?.scrollTo({ top: logBox.current.scrollHeight }) }, [log])

  const contacted = CONTACTS.filter((c) => heard[c.id]).length
  const display = useMemo(() => fmt(dialed) || '', [dialed])
  const busy = status !== 'idle'
  const statusText = status === 'idle' ? (typing ? 'DIALING' : dialed ? 'READY' : 'IDLE')
    : status === 'ringing' ? 'RINGING' : status === 'holding' ? `ON HOLD ${String(Math.floor(holdSec / 60)).padStart(2, '0')}:${String(holdSec % 60).padStart(2, '0')}` : 'VOICEMAIL'

  return (
    <section className="panel ph" ref={root} aria-label="Reference Check Hotline">
      <div className="label">MECHANIC · REFERENCE CHECK HOTLINE</div>
      <h2 className="h-mid ph-title">Ring Arlo&apos;s <em className="hot">references.</em></h2>
      <p className="lead ph-lead">
        Tap a card or dial the number on it (keyboard works). Everyone is out. Everyone left a voicemail. The longer you listen, the worse it gets. There are also numbers that aren&apos;t on any card.
      </p>

      <div className="ph-grid">
        {/* ---------------- the handset ---------------- */}
        <div className={`ph-set ${status}`}>
          <div className="ph-screen" aria-label="Phone display">
            <div className="ph-screen-top">
              <span className={`ph-led ${status}`} aria-hidden="true" />
              <span className="label">{statusText}</span>
              <span className="label ph-ref">{contacted}/{CONTACTS.length} REFS</span>
            </div>
            <div className={`ph-number ${display ? '' : 'empty'}`}>{calling ? fmt(dialed || '') || calling.label : display || '— — —'}</div>
            <div className="ph-who">
              {calling ? <><b>{calling.label}</b><span className="dim"> · {calling.sub}</span></> : <span className="dim">Dial, then CALL. Seven digits auto-dial.</span>}
            </div>
            <div className="ph-now" aria-hidden="true">{busy ? (status === 'ringing' ? 'ringing…' : now) : ''}</div>
            <div className="ph-bar" aria-hidden="true"><i style={{ transform: `scaleX(${status === 'holding' ? Math.min(1, holdSec / 45) : progress})` }} /></div>
          </div>

          <div className="ph-keys" role="group" aria-label="Keypad">
            {KEYS.map(([k, sub]) => (
              <button key={k} type="button" className={`ph-key ${pressed === k ? 'on' : ''}`} onClick={() => press(k)} aria-label={`${k === '*' ? 'star' : k === '#' ? 'pound' : k}`}>
                <b>{k}</b><small>{sub}</small>
              </button>
            ))}
          </div>

          <div className="ph-actions">
            {!busy ? (
              <>
                <button type="button" className="btn hot ph-call" onClick={callNow} disabled={typing}>Call</button>
                <button type="button" className="btn ghost" onClick={back} disabled={!dialed || typing} aria-label="Delete last digit">Del</button>
              </>
            ) : (
              <button type="button" className="btn ph-hang" onClick={hangUp}>Hang up</button>
            )}
          </div>

          <div className="ph-sus" aria-hidden="true">
            <span className="label">Suspicion</span>
            <div className="ph-sus-bar"><i style={{ width: `${suspicion}%` }} /></div>
            <span className="label hot">{Math.round(suspicion)}%</span>
          </div>
        </div>

        {/* ---------------- speed dial + transcript ---------------- */}
        <div className="ph-side">
          <ul className="ph-cards" aria-label="Speed dial">
            {CONTACTS.map((c) => (
              <li key={c.id}>
                <button type="button" className={`ph-card ${heard[c.id] ? 'done' : ''}`} onClick={() => dialCard(c)} disabled={busy || typing} aria-label={`Call ${c.name}, ${c.role}`}>
                  <span className="ph-card-top"><b>{c.name}</b><span className="ph-count">{heard[c.id] ? `×${heard[c.id]}` : ''}</span></span>
                  <span className="ph-role">{c.role}</span>
                  <span className="ph-num">{fmt(c.number)}</span>
                  <span className="ph-blurb dim">{c.blurb}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="ph-log">
            <div className="ph-log-head">
              <span className="label">Call log · transcript</span>
              {log.length > 0 && <button type="button" className="ph-clear" onClick={() => setLog([])}>clear</button>}
            </div>
            <div className="ph-log-body" ref={logBox} role="log" aria-live="polite" aria-label="Call transcript" tabIndex={0}>
              {log.length === 0 && <p className="dim ph-empty">No calls yet. Dial 0 if you don&apos;t know where to start. (You know where to start. You&apos;re a founder.)</p>}
              {log.map((r) => r.kind === 'head' ? (
                <div className="ph-row head" key={r.id}>{r.text}</div>
              ) : r.kind === 'sys' ? (
                <div className="ph-row sys" key={r.id}>{r.text}</div>
              ) : (
                <div className={`ph-row line v-${r.voice}`} key={r.id}><span className="ph-who-tag">{r.who}</span> {r.text}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
