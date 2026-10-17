import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { fx, useStore } from '../state/store'
import './TabHydra.css'

/* ------------------------------------------------------------------ */
/* Mechanic: Fake Productivity Dashboard ("Tab Hydra")                 */
/* Close a tab -> two grow back. The only way out is a tab called Work. */
/* ------------------------------------------------------------------ */

interface Tab { id: number; title: string; seed: number; dying?: boolean; work?: boolean; fresh?: boolean }
interface Dlg { title: string; body: string; icon?: string; buttons: { label: string; run?: () => void }[] }

const PALETTE = ['#ece4d2', '#d4a84a', '#ff4b1f', '#cfff2e', '#a79f8b', '#8a5a2b']

const BASE_TITLES = [
  'Inbox (11,402)', 'How to look busy - wikiHow', 'is it normal to have 47 tabs', 'Jira - VEX-1 (Do the thing)',
  'Synergy - Encyclopedia', 'Notion - The Page', 'Standing desk (not for standing)', 'LinkedOut - You appeared in 0 searches',
  'Flights to Dubai (for the content)', 'Recipe: air fryer ambition', "Calendar - 0 meetings, 9 'syncs'", 'Domain available: vexxity-labs-2.io',
  'Sigma grindset (1).pdf', 'Am I the main character? - quiz', 'Stock photo: man laughing at salad', 'Cofounder wanted (no equity)(no salary)',
  'Series A - what is it', 'Why does my laptop sound like that', "Mom's post - 14 reactions", 'Pitch deck v14_FINAL_final2',
  'Talk: Failing Upward', 'Standup (skipped)', 'Slack - #general (just me)', 'Best protein for founders',
  'Typing test - 41 wpm', "Whiteboard - 'DISRUPT' (circled)", 'Tax stuff (later)', "Download: 'Invisible Hustle.zip'",
  'Crypto - fully recovered soon', 'r/entrepreneur - help', 'Video: 14hr rain on server room', "Shop: 'CEO' mug",
  'Weather - sunny (in tab)', 'Video call - waiting for host (host is me)', 'Podcast: I Have a Podcast', 'Resume.docx - Chief Everything',
  'Maps: coworking nearby', 'Free couch (collab space)', "Forum: 'how to pivot' (0 pts)", 'Spreadsheet: runway (9 days)',
  'Logo ideas - lion, but corporate', 'Unsubscribe - 612 of 640', 'AI wrote my bio, I disagree', 'Terms and Conditions (read: 0%)',
  "Is 'Chief' a real title", 'Gym membership (cancel?)', 'Quiz: which founder are you',
]

const TIERS: string[][] = [
  ['New Tab', 'Tab (copy)', 'Why did that open', 'How to close tabs - wikiHow', 'Are you sure? - Q&A', 'Tab you just closed (restored)', 'Pop-up (do not)', 'Untitled (5)', '404 - focus not found', 'Loading... still', 'Welcome back to this tab', 'Closing tabs: a guide'],
  ['A tab spawned a tab', 'Hydra (mythology) - Encyclopedia', 'Cut one head off: myth tips', 'Does closing tabs make more tabs', 'Cache cleared! (refilled)', 'Tab 48 of ???', 'A tab about tabs', 'Extension: TabsMax (installed itself)', 'You closed this on purpose', 'Task manager - 3 tabs not responding', 'Memory: 11 GB (vibes)', 'Resume session? Yes Yes Yes', "Arlo's shame - private window"],
  ['The tab closes you', 'Tab (you) - Tab', 'What is a tab, really', 'Tab 100 of ∞', 'A tab was here', 'Every tab is open in another tab', 'Sentient tab - do not close', 'tabs.exe has stopped being responsible', "'Work' - search (you are looking at it)", 'Your mom opened this', 'Therapy? - book later', 'Tabs are forever - a post', "A Tab Of One's Own"],
  ['this tab was closed 1,204 times', 'reality - page not found', 'Heat death of the universe (4 min read)', 'The last tab (kidding)', 'Tabs = Assets (tax doc)', 'You - open in new tab', 'Arlo is the hydra', 'Tab: the musical', "ctrl+W isn't a hint. it's a threat.", 'just click Work', 'We can do this all day', 'Tab #?? of the Apocalypse'],
]

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const tierOf = (n: number) => (n < 8 ? 0 : n < 25 ? 1 : n < 50 ? 2 : 3)

function Fav({ seed, work }: { seed: number; work?: boolean }) {
  const c = work ? '#d4a84a' : PALETTE[seed % PALETTE.length]
  return <span className={`th-fav s${(seed >> 3) % 4}`} style={{ background: c }} aria-hidden="true" />
}

function Chart({ hist }: { hist: number[] }) {
  const W = 320, H = 110
  const data = hist.length < 2 ? [hist[0] ?? 47, hist[0] ?? 47] : hist
  const max = Math.max(...data, 50) * 1.1
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${(H - (v / max) * H).toFixed(1)}`)
  const last = pts[pts.length - 1].split(',')
  return (
    <svg className="th-chart" viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label={`Tabs over time, now ${data[data.length - 1]}`}>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="th-grid" />)}
      <polyline points={`0,${H} ${pts.join(' ')} ${W},${H}`} className="th-area" />
      <polyline points={pts.join(' ')} className="th-line" />
      <line x1="0" x2={W} y1={H - 1.5} y2={H - 1.5} className="th-work" />
      <circle cx={last[0]} cy={last[1]} r="3.4" className="th-dot" />
      <text x="2" y={H + 11} className="th-axis">TABS (vermilion)</text>
      <text x={W - 2} y={H + 11} textAnchor="end" className="th-axis">ACTUAL WORK (the line at the bottom)</text>
    </svg>
  )
}

export default function TabHydra() {
  const wasEscaped = useMemo(() => !!useStore.getState().flags['tabs.escaped'], [])
  const idRef = useRef(1000)
  const createdRef = useRef(0)
  const closedRef = useRef(0)
  const recent = useRef<string[]>([])
  const timers = useRef<number[]>([])
  const stripRef = useRef<HTMLDivElement>(null)

  const initial = useCallback((): Tab[] => {
    const t: Tab[] = BASE_TITLES.slice(0, 46).map((title, i) => ({ id: i + 1, title, seed: hash(title) }))
    t.splice(29, 0, { id: 999, title: 'Work (1)', seed: hash('Work'), work: true })
    return t
  }, [])

  const [tabs, setTabs] = useState<Tab[]>(() => (wasEscaped ? [{ id: 1, title: 'Untitled', seed: 7, work: true }] : initial()))
  const [closed, setClosed] = useState(0)
  const [hist, setHist] = useState<number[]>([47])
  const [phase, setPhase] = useState<'browse' | 'doc' | 'done'>(wasEscaped ? 'done' : 'browse')
  const [dlg, setDlg] = useState<Dlg | null>(null)
  const [tip, setTip] = useState('')
  const [active, setActive] = useState<number | null>(null)
  const [flash, setFlash] = useState(false)
  const [typed, setTyped] = useState('')
  const [collapse, setCollapse] = useState(false)
  const [tick, setTick] = useState(0)
  const [refusal, setRefusal] = useState(0)

  const live = tabs.filter((t) => !t.dying).length
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)) }
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])
  useEffect(() => { const i = window.setInterval(() => setTick((t) => t + 1), 2400); return () => clearInterval(i) }, [])

  const makeTab = (n: number): Tab => {
    const pool = TIERS[tierOf(n)].filter((t) => !recent.current.includes(t))
    let title = pick(pool.length ? pool : TIERS[tierOf(n)])
    recent.current = [title, ...recent.current].slice(0, 9)
    if (n > 30 && Math.random() < 0.35) title += ` (${Math.floor(Math.random() * 90 + 2)})`
    createdRef.current++
    return { id: idRef.current++, title, seed: hash(title + createdRef.current), fresh: true }
  }

  const addTabs = (count: number, n: number, at = 0) => {
    const fresh = Array.from({ length: count }, () => makeTab(n))
    setTabs((p) => [...p.slice(0, at), ...fresh, ...p.slice(at)])
  }

  const openDialog = (d: Dlg) => { setDlg((cur) => cur ?? d); audio.sfx('error') }

  const milestone = (n: number) => {
    const s = useStore.getState()
    switch (n) {
      case 1: fx.toast('Tab closed', '2 new tabs have been opened in its honor.'); break
      case 3: setTip('Tip: closing tabs faster than they open is not a supported workflow.'); break
      case 5:
        openDialog({ title: 'Are you sure?', icon: '?', body: 'This tab contains unsaved vibes.', buttons: [
          { label: 'Close anyway', run: () => { s.bump('delusion', 2); fx.subtitle('Those vibes were load-bearing.', 'ARLO') } },
          { label: 'Keep vibes' },
        ] }); break
      case 8: setTip('Pro tip: Ctrl+W closes tabs even faster. (Not that it helps.)'); break
      case 12:
        openDialog({ title: 'Browser', icon: '!', body: 'This page is not responding. Wait for it, or close the program?', buttons: [
          { label: 'Wait', run: () => { addTabs(3, 12); fx.toast('Waited', 'Waiting opened 3 tabs.') } },
          { label: 'Close program', run: () => { addTabs(2, 12); fx.toast('Program closed', 'It reopened. Also 2 tabs.', 'error') } },
        ] }); break
      case 15:
        fx.shake(350); audio.sfx('thud')
        fx.toast('Memory warning', `${(live * 0.24).toFixed(1)} GB in use. Arlo's laptop has entered the chat.`, 'error'); break
      case 20:
        openDialog({ title: 'Productivity Score', icon: 'i', body: "Congratulations. You've been upgraded to ELITE. Score verified by: Arlo.", buttons: [
          { label: 'Humbled', run: () => { s.bump('suspicion', 3); s.bump('delusion', 3) } },
        ] }); break
      case 25: s.note('Closed 25 of Arlo\'s tabs and watched the count go up'); setTip('A "Locate Work" button has been added. Nobody asked for it. It is working.'); break
      case 35:
        openDialog({ title: 'Low memory', icon: '!', body: 'Close some tabs to free memory?', buttons: [
          { label: 'Close some tabs', run: () => { addTabs(3, 35); fx.toast('Closing tabs', 'Closing tabs opened 3 tabs.') } },
          { label: 'Open more tabs', run: () => { addTabs(5, 35); audio.sfx('laser') } },
        ] }); break
      case 40: fx.meme('cooked'); break
      case 55: fx.glitch(500); s.note('Closed 55 tabs and the tabs closed back'); break
      case 70: fx.toast('Hint (final)', "Honestly? Just click Work.", 'system'); break
    }
  }

  const closeTab = (tab: Tab) => {
    if (phase !== 'browse' || tab.dying) return
    audio.init()
    if (tab.work) {
      const r = refusal + 1
      setRefusal(r)
      audio.sfx('deny')
      const lines = ['Work cannot be closed. Nobody has ever closed it.', 'Work is pinned. By whom? We will not be taking questions.', 'You are trying to close Work. Noted. Escalating.', 'Work has closed you.']
      fx.toast('Work', lines[Math.min(r - 1, 3)], 'error')
      useStore.getState().bump('suspicion', 1)
      return
    }
    const n = closedRef.current + 1
    closedRef.current = n
    setClosed(n)
    audio.sfx('pop', { pitch: 0.9 + Math.min(n, 40) * 0.012 })
    later(() => { audio.sfx('tick', { pitch: 1.2 + Math.random() * 0.2, vol: 0.5 }) }, 90)
    later(() => { audio.sfx('tick', { pitch: 1.5 + Math.random() * 0.2, vol: 0.5 }) }, 170)
    const a = makeTab(n), b = makeTab(n)
    setTabs((p) => {
      const i = p.findIndex((t) => t.id === tab.id)
      if (i < 0) return p
      return [...p.slice(0, i), { ...tab, dying: true }, a, b, ...p.slice(i + 1)]
    })
    later(() => setTabs((p) => p.filter((t) => t.id !== tab.id)), 230)
    setHist((h) => [...h.slice(-59), live + 1])
    const s = useStore.getState()
    s.incFlag('tabs.closed')
    s.bump('aura', 3)
    s.bump('delusion', 0.5)
    s.bump('suspicion', 0.35)
    milestone(n)
  }

  const selectTab = (tab: Tab) => {
    audio.init()
    if (phase !== 'browse') return
    if (tab.work) { openWork(); return }
    audio.sfx('click', { vol: 0.5 })
    setActive(tab.id)
  }

  const openWork = () => {
    if (phase !== 'browse') return
    audio.init()
    audio.sfx('ding')
    audio.sfx('whoosh', { vol: 0.5 })
    setDlg(null)
    setTyped('')
    setPhase('doc')
  }

  /* autotype the diary entry */
  useEffect(() => {
    if (phase !== 'doc') return
    const text = `Dear diary,\n\nToday I closed ${closedRef.current} tabs.\nThey opened ${createdRef.current} more.\n\nI did no work.\nThis is the first thing I have typed that was not a pitch deck.\n\nI think I'm fine.\n\n- A.`
    let i = 0
    let stopped = false
    const step = () => {
      if (stopped) return
      i++
      setTyped(text.slice(0, i))
      const ch = text[i - 1]
      if (ch && ch !== ' ' && ch !== '\n' && i % 2 === 0) audio.sfx('tick', { pitch: 0.8 + Math.random() * 0.5, vol: 0.35 })
      if (i >= text.length) { window.setTimeout(() => !stopped && finishEscape(), 1100); return }
      const delay = ch === ',' || ch === '.' ? 380 : ch === '\n' ? 180 : 52 + Math.random() * 40
      window.setTimeout(step, delay)
    }
    const t0 = window.setTimeout(step, 1100)
    return () => { stopped = true; clearTimeout(t0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const finishEscape = () => {
    const s = useStore.getState()
    setCollapse(true)
    audio.sfx('success'); audio.sfx('fanfare', { vol: 0.8 })
    fx.flash('#d4a84a')
    s.setFlag('tabs.escaped', true)
    s.bump('aura', 300); s.bump('delusion', -6); s.bump('suspicion', -4)
    s.note(`Closed ${closedRef.current} tabs, watched ${createdRef.current} appear, then opened one document titled "Untitled"`)
    s.unlock('hydra', 'Tab Slayer', 'Closed one tab: Work. Opened one document: Untitled.')
    later(() => { setPhase('done'); setTabs([{ id: 1, title: 'Untitled', seed: 7, work: true }]); setCollapse(false) }, 1500)
  }

  const reopen = () => {
    audio.init(); audio.sfx('whoosh')
    closedRef.current = 0; createdRef.current = 0
    setTabs(initial()); setClosed(0); setHist([47]); setPhase('browse'); setTyped(''); setDlg(null); setTip(''); setActive(null); setRefusal(0)
    fx.toast('Session restored', '47 tabs restored. You are welcome.')
  }

  const locate = () => {
    audio.sfx('ding', { vol: 0.6 })
    const el = stripRef.current?.querySelector('[data-work="1"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setFlash(true); later(() => setFlash(false), 2200)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
      e.preventDefault()
      audio.init()
      const s = useStore.getState()
      s.incFlag('eggs'); s.bump('suspicion', 2); s.bump('aura', 15)
      s.note('Tried Ctrl+W on a tab and was blocked by Vexxity Labs Endpoint Security')
      setDlg({
        title: 'Vexxity Labs Endpoint Security', icon: '!',
        body: "Action blocked. 'Close Tab' (Ctrl+W) has been classified as a Tier-2 Productivity Reduction Event. Incident #VX-4471 has been filed with your manager. Your manager is Arlo. Arlo is reading this.",
        buttons: [{ label: 'OK' }, { label: 'Appeal', run: () => fx.toast('Appeal denied', 'Reviewed in 0.003s by Arlo.', 'error') }],
      })
      audio.sfx('error'); fx.shake(250)
    }
  }

  const closeDlg = (b?: { run?: () => void }) => { audio.sfx('click'); setDlg(null); b?.run?.() }

  /* derived dashboard numbers */
  const workPct = phase === 'done' ? 100 : (0.4 * 47) / Math.max(live, 1)
  const prod = Math.min(99.4, 62 + closed * 1.3)
  const gb = (live * 0.24).toFixed(1)
  const ticker = [
    `Productivity up ${Math.round(prod * 41)}% (methodology: vibes)`,
    `Focus time today: 0m 00s`,
    `Estimated RAM: ${gb} GB`,
    `Tabs per minute: ${Math.max(1, Math.round(closed * 2.4))} and rising`,
    `Meetings avoided: 0 (none were scheduled)`,
    `Synergy index: ${(1.1 + closed * 0.07).toFixed(2)}x`,
  ]
  const activeTab = tabs.find((t) => t.id === active && !t.dying)

  return (
    <section className="panel th" aria-labelledby="th-h" onKeyDown={onKey}>
      <div className="label">MECHANIC · FAKE PRODUCTIVITY DASHBOARD</div>
      <h2 className="h-mid" id="th-h">Arlo's workflow, <em>live</em>.</h2>
      <p className="lead dim th-lead">
        {phase === 'done' ? 'There is one tab. It is a document. This is considered a regression by management.'
          : 'Forty-seven tabs. One of them is Work. Close the ones that are not. Each close is final. (It is not final.)'}
      </p>

      <div className={`th-browser ${collapse ? 'collapsing' : ''}`}>
        <div className="th-chrome">
          <span className="th-lights"><i /><i /><i /></span>
          <div className="th-url">vexxity.internal/<b>productivity-dashboard</b></div>
          <span className="th-count" aria-live="polite">{live} tab{live === 1 ? '' : 's'}</span>
        </div>

        <div className={`th-strip ${flash ? 'locating' : ''}`} ref={stripRef} role="tablist" aria-label="Open tabs">
          {tabs.map((t, i) => (
            <div key={t.id} role="presentation" data-work={t.work ? '1' : undefined}
              className={`th-tab ${t.dying ? 'dying' : ''} ${t.fresh ? 'fresh' : ''} ${active === t.id || (t.work && phase !== 'browse') ? 'on' : ''} ${t.work ? 'work' : ''}`}
              style={collapse && !t.work ? { animationDelay: `${Math.min(i, 60) * 14}ms` } : undefined}>
              <button className="th-tabbtn" role="tab" aria-selected={active === t.id} onClick={() => selectTab(t)} title={t.title}>
                <Fav seed={t.seed} work={t.work} />
                <span className="th-ttl">{t.title}</span>
              </button>
              {phase === 'browse' && <button className="th-x" aria-label={`Close tab ${t.title}`} onClick={() => closeTab(t)}>×</button>}
            </div>
          ))}
        </div>

        <div className="th-page">
          {phase === 'browse' && (
            <div className="th-dash">
              <div className="th-dash-head">
                <span className="label">PRODUCTIVITY · {activeTab ? `viewing: ${activeTab.title}` : 'overview'}</span>
                <span className="th-verified">verified by: Arlo</span>
              </div>
              <div className="th-grid-wrap">
                <div className="th-tiles">
                  <div className="th-tile"><span className="label">Actual work</span><b className={workPct < 0.2 ? 'hot' : ''}>{workPct.toFixed(2)}%</b></div>
                  <div className="th-tile"><span className="label">Tabs</span><b key={live} className="th-pop">{live}</b></div>
                  <div className="th-tile"><span className="label">Tabs related to work</span><b>1</b></div>
                  <div className="th-tile"><span className="label">Productivity (self-reported)</span><b className="brass">{prod.toFixed(1)}%</b></div>
                </div>
                <div className="th-chart-box">
                  <Chart hist={hist} />
                  <div className="th-ram"><i style={{ width: `${Math.min(100, (live / 120) * 100)}%` }} /><span className="label">RAM {gb} GB</span></div>
                </div>
              </div>
              <div className="th-ticker" key={tick} aria-live="off">▲ {ticker[tick % ticker.length]}</div>
              {closed >= 20 && <button className="btn ghost th-locate" onClick={locate}>Locate Work tab</button>}
              {closed >= 25 && live > 0 && <p className="th-small dim">Tabs related to work: 1. It is in there. It has always been in there.</p>}
            </div>
          )}

          {phase !== 'browse' && (
            <div className="th-doc">
              <div className="th-doc-bar"><span className="label">Untitled</span><span className="label dim">{phase === 'done' ? 'saved (first time ever)' : 'saved (never)'}</span></div>
              <div className="th-sheet">
                <h3>Untitled</h3>
                <pre aria-live="polite">{typed}<i className="th-caret" /></pre>
                {phase === 'done' && (
                  <div className="th-final">
                    <div className="th-final-grid">
                      <div><span className="label">Tabs</span><b>1</b></div>
                      <div><span className="label">Actual work</span><b className="brass">100%</b></div>
                      <div><span className="label">Productivity</span><b className="dim">unverifiable</b></div>
                    </div>
                    <p className="th-small dim">Management has requested the dashboard be restored.</p>
                    <button className="btn" onClick={reopen}>Reopen closed tabs (⌘⇧T)</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {dlg && (
            <div className="th-modal" role="alertdialog" aria-label={dlg.title}>
              <div className="win th-win">
                <div className="win-title"><span>{dlg.title}</span><span className="win-x" aria-hidden="true">x</span></div>
                <div className="win-body"><div className="win-icon">{dlg.icon ?? '!'}</div><p>{dlg.body}</p></div>
                <div className="th-win-btns">{dlg.buttons.map((b) => <button key={b.label} className="win-btn" onClick={() => closeDlg(b)}>{b.label}</button>)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="th-status label" aria-live="polite">{tip || (phase === 'browse' ? `closed: ${closed} · opened: ${createdRef.current}` : phase === 'doc' ? 'Document opened.' : 'Hydra: slain.')}</div>
      </div>
    </section>
  )
}
