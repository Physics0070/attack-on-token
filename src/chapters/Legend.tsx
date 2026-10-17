import { useState } from 'react'
import { useStore, fx } from '../state/store'
import { audio } from '../audio/engine'
import { ACHIEVEMENTS, LEGEND_STATS } from '../content/copy'
import Reveal from '../ui/Reveal'
import Inflation from '../mechanics/Inflation'
import Franchise from '../mechanics/Franchise'

export default function Legend() {
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggle = (i: number) => {
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(i)) n.delete(i)
      else {
        n.add(i)
        const st = useStore.getState()
        st.bump('suspicion', 4); st.bump('delusion', -2); audio.sfx('tick')
        st.note(`Checked the fine print on "${ACHIEVEMENTS[i].title}"`)
        if (n.size === 4) { fx.meme('eyes'); audio.sfx('stinger'); fx.subtitle('You are reading the receipts. Bold.', 'SITE', 2800) }
        if (n.size === ACHIEVEMENTS.length) st.unlock('receipts', 'Receipts Collector', 'You opened every achievement. The site is now nervous.')
      }
      return n
    })
  }
  return (
    <section className="chapter tall" data-chapter={1}>
      <div className="wrap">
        <div className="chapter-tag label"><span>02 / 07</span><i /><span>The Legend</span></div>
        <Reveal><h2 className="h-display">A career<br /><em>in draft.</em></h2></Reveal>
        <Reveal className="stat-grid" delay={120}>
          {LEGEND_STATS.map((s) => (
            <div className="stat-cell" key={s.label}>
              <span className="label">{s.label}</span>
              <strong className="claim">{s.value}</strong>
              <small>{s.note}</small>
            </div>
          ))}
        </Reveal>

        <Reveal><div className="label" style={{ marginBottom: 12 }}>Selected achievements · tap a row to see what actually happened</div></Reveal>
        <Reveal className="ledger" delay={80}>
          {ACHIEVEMENTS.map((a, i) => (
            <button key={i} className={`ledger-row ${open.has(i) ? 'open' : ''}`} onClick={() => toggle(i)} aria-expanded={open.has(i)} data-cursor="fact-check">
              <span className="yr">{a.year}</span>
              <span className="tt claim">{a.title}</span>
              <span className="hint">{open.has(i) ? 'debunked' : 'verify?'}</span>
              <span className="real" role="status">↳ {a.real}</span>
            </button>
          ))}
        </Reveal>

        <Reveal><Inflation /></Reveal>
        <div style={{ height: 90 }} />
        <Reveal><Franchise /></Reveal>
      </div>
    </section>
  )
}
