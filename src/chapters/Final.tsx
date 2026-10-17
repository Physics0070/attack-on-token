import { useEffect, useMemo, useState } from 'react'
import { fx, useStore } from '../state/store'
import { audio } from '../audio/engine'
import { ENDINGS, CHEEVOS } from '../content/copy'
import Reveal from '../ui/Reveal'

type EndId = keyof typeof ENDINGS
const ORDER: EndId[] = ['humble', 'blackhole', 'employee', 'npc', 'grifter', 'fraud', 'chosen']
const KEY = 'apv.endings'
const seenEndings = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }

function decide(s: ReturnType<typeof useStore.getState>): EndId {
  const f = s.flags
  const touched = ['inflation.peak', 'tribunal.convicted', 'tribunal.acquitted', 'captcha.score', 'tabs.closed', 'slot.pulls', 'phone.calls', 'aura.scan', 'jobs.applied', 'salary.rounds', 'franchise.seen'].filter((k) => f[k] !== undefined && f[k] !== 0).length
  if (touched >= 8 && s.bossOutcome === 'ignored') return 'chosen'
  if (s.bossOutcome === 'blackhole') return 'blackhole'
  if (s.salaryOutcome === 'employed') return 'employee'
  if (s.suspicion >= 70) return 'fraud'
  if (s.bossOutcome === 'ignored' && s.delusion <= 55) return 'humble'
  if (s.delusion >= 70) return 'grifter'
  return 'npc'
}

export default function Final() {
  const s = useStore()
  const [revealed, setRevealed] = useState(false)
  const [seen, setSeen] = useState<string[]>(seenEndings)
  const end = useMemo(() => (revealed ? decide(useStore.getState()) : null), [revealed])
  const E = end ? ENDINGS[end] : null

  useEffect(() => { if (!revealed) useStore.setState({ ending: null }) }, [revealed])

  const reveal = async () => {
    const st = useStore.getState()
    const id = decide(st)
    audio.music.cut(); audio.sfx('drumroll'); fx.shake(1800)
    await new Promise((r) => setTimeout(r, 1900))
    audio.sfx('cymbal'); fx.flash('#ece4d2'); fx.glitch(500)
    useStore.setState({ ending: id }); setRevealed(true)
    audio.music.play('final')
    audio.say(ENDINGS[id].voice, { voice: 'announcer', sub: 'ANNOUNCER' })
    st.note(`Reached ending: ${ENDINGS[id].name}`)
    const next = Array.from(new Set([...seenEndings(), id]))
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage is optional */ }
    setSeen(next)
    if (next.length >= 3) st.unlock('multi', 'Timeline Tourist', 'Three different endings. You are the reason there is a reset button.')
    if (st.suspicion >= 100) st.unlock('sus100', CHEEVOS.sus100.title, CHEEVOS.sus100.desc)
    if (st.delusion >= 100) st.unlock('delusion100', CHEEVOS.delusion100.title, CHEEVOS.delusion100.desc)
  }
  const share = async () => {
    if (!E) return
    const t = `I got the "${E.name}" ending on Arlo Pemberton-Vex's profile. Delusion ${Math.round(s.delusion)}, Suspicion ${Math.round(s.suspicion)}, Aura ${s.aura}. ${E.quote}`
    try { await navigator.clipboard.writeText(t); fx.toast('Verdict copied', 'Paste it somewhere that will tolerate it.') } catch { fx.toast('Copy blocked', 'Your browser said no. It has standards.') }
  }
  const reset = () => { audio.sfx('rimshot'); window.dispatchEvent(new CustomEvent('apv:reset')) }

  return (
    <section className="chapter final" data-chapter={6}>
      <div className="wrap">
        <div className="chapter-tag label"><span>07 / 07</span><i /><span>The Final Form</span></div>
        {!E ? (
          <Reveal>
            <h2 className="h-display">What did<br /><em>you make?</em></h2>
            <p className="lead" style={{ margin: '22px 0' }}>The timeline is about to collapse into one person. Your decisions have been weighed, mostly by a script.</p>
            <button className="btn hot" onClick={reveal} data-cursor="collapse">Collapse the timeline</button>
          </Reveal>
        ) : (
          <div className="panel final-card" role="region" aria-label="Your ending" aria-live="polite">
            <div className="label">Final form · {seen.length} of 7 endings discovered</div>
            <div className="final-name">{E.name}</div>
            <div className="h-mid hot" style={{ fontStyle: 'italic' }}>{E.epithet}</div>
            <p className="lead" style={{ marginTop: 16 }}>{E.verdict}</p>
            <div className="final-quote">“{E.quote}”</div>
            <div className="final-grid">
              <div><span className="label">Delusion</span><strong>{Math.round(s.delusion)}</strong></div>
              <div><span className="label">Suspicion</span><strong>{Math.round(s.suspicion)}</strong></div>
              <div><span className="label">Aura</span><strong>{s.aura.toLocaleString('en-US')}</strong></div>
              <div><span className="label">Decisions</span><strong>{s.log.length}</strong></div>
            </div>
            <div className="label">Unlocked: {s.achievements.length} achievements · {(s.flags.eggs as number) || 0} secrets found</div>
            <div className="endings" aria-label="Endings discovered">{ORDER.map((id) => <span key={id} className={seen.includes(id) ? 'got' : ''}>{seen.includes(id) ? ENDINGS[id].name : '???'}</span>)}</div>
            <div className="final-btns">
              <button className="btn hot" onClick={reset} data-cursor="again?">Reset the timeline</button>
              <button className="btn" onClick={share}>Copy my verdict</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
