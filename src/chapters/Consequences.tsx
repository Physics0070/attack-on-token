import { useMemo, useState } from 'react'
import { fx, useStore } from '../state/store'
import { audio } from '../audio/engine'
import { APOLOGY } from '../content/copy'
import Reveal from '../ui/Reveal'

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const fill = (s: string, thing: string, n: number) => s.replace(/\{thing\}/g, thing).replace(/\{n\}/g, String(n))

function incidentName(f: Record<string, number | boolean | string>, bossOutcome: string, salary: string) {
  if (bossOutcome === 'blackhole') return 'the Singularity Event'
  if (salary === 'employed') return 'the unpaid onboarding of a visitor'
  if (f['inflation.burst']) return 'the Achievement.exe incident'
  if (((f['tabs.closed'] as number) || 0) > 12) return 'the Tab Situation'
  if (f['slot.jackpot']) return 'the viral parking-ticket post'
  if (((f['tribunal.convicted'] as number) || 0) >= 3) return 'the Tribunal Proceedings'
  return 'the recent website'
}

export default function Consequences() {
  const s = useStore()
  const [seed, setSeed] = useState(0)
  const [issued, setIssued] = useState(false)
  const thing = useMemo(() => incidentName(s.flags, s.bossOutcome, s.salaryOutcome), [s.flags, s.bossOutcome, s.salaryOutcome])
  const n = Math.max(3, s.log.length)
  const text = useMemo(
    () => [pick(APOLOGY.openers), pick(APOLOGY.blames), pick(APOLOGY.fixes), pick(APOLOGY.closers)].map((x) => fill(x, thing, n)).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, thing, n],
  )
  const eggs = (s.flags.eggs as number) || 0
  const trustYou = Math.max(2, Math.round(78 - eggs * 7 - ((s.flags.popups as number) || 0) * 2 - ((s.flags.gaslit as number) || 0) * 3 - (s.flags['tabs.closed'] ? 6 : 0)))
  const trustArlo = Math.max(0, Math.round(100 - s.suspicion))
  const issue = () => {
    setIssued(true); setSeed((x) => x + 1)
    audio.sfx('stinger')
    audio.say(text, { voice: 'corporate', sub: 'VEXXITY HR' })
    s.bump('aura', 250); s.bump('suspicion', 3)
    s.note('Had a polished executive apology issued on your behalf')
    fx.toast('Apology published', 'It has already received 0 likes and 1 comment from Mom.')
  }
  return (
    <section className="chapter" data-chapter={5}>
      <div className="wrap stack" style={{ gap: 60 }}>
        <div>
          <div className="chapter-tag label"><span>06 / 07</span><i /><span>The Consequences</span></div>
          <Reveal><h2 className="h-display">The website<br /><em>remembers.</em></h2></Reveal>
        </div>
        <div className="conseq-grid">
          <Reveal className="panel">
            <div className="label">Mechanic 12 · Reverse Portfolio Audit</div>
            <h3 className="h-mid" style={{ margin: '8px 0' }}>Everything you did, filed.</h3>
            <div className="chips">
              <span className="chip">Delusion <b>{Math.round(s.delusion)}</b></span>
              <span className="chip">Suspicion <b>{Math.round(s.suspicion)}</b></span>
              <span className="chip">Aura <b>{s.aura.toLocaleString('en-US')}</b></span>
              <span className="chip">Decisions <b>{s.log.length}</b></span>
            </div>
            <ol className="dossier" aria-label="Decision log">
              {s.log.length === 0 && <li><b>—</b><span>You did nothing. Bold. Suspiciously bold. The file is still thick.</span></li>}
              {s.log.slice(-14).map((l, i) => <li key={i}><b>{String(i + 1).padStart(2, '0')}</b><span>{l}</span></li>)}
            </ol>
          </Reveal>
          <div style={{ display: 'grid', gap: 22 }}>
            <Reveal className="panel" delay={80}>
              <div className="label">Mechanic 13 · Corporate Apology Engine</div>
              <h3 className="h-mid" style={{ margin: '8px 0' }}>Regarding {thing}.</h3>
              <p className="apology" aria-live="polite">{issued ? text : 'A statement has been drafted. It apologises for everything except what happened.'}<span className="sig">— Office of the Chief Visionary, Vexxity Labs (also Arlo)</span></p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn hot" onClick={issue}>{issued ? 'Issue another apology' : 'Issue apology'}</button>
                {issued && <button className="btn ghost" onClick={() => { setSeed((x) => x + 1); audio.sfx('click') }}>Redraft</button>}
              </div>
            </Reveal>
            <Reveal className="panel" delay={160}>
              <div className="label">Trust audit</div>
              <div className="trust">
                <div><span>The site's trust in Arlo: <b className={trustArlo < 40 ? 'hot' : ''}>{trustArlo}%</b></span><div className="bar"><b style={{ width: `${trustArlo}%`, background: 'var(--brass)' }} /></div></div>
                <div><span>The site's trust in <i>you</i>: <b className={trustYou < 40 ? 'hot' : ''}>{trustYou}%</b></span><div className="bar"><b style={{ width: `${trustYou}%`, background: 'var(--verm)' }} /></div></div>
              </div>
              <p className="dim" style={{ marginTop: 12, fontSize: 12 }}>{trustYou < 45 ? 'You poked things, gaslit-clicked things and dismissed warnings. The site has opened a file on you too.' : 'You behaved suspiciously well. This is also suspicious.'}</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
