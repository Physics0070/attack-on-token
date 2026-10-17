import Reveal from '../ui/Reveal'
import BossFight from '../mechanics/BossFight'

export default function Boss() {
  return (
    <section className="chapter boss-ch" data-chapter={4} style={{ minHeight: '170svh', justifyContent: 'flex-start' }}>
      <div className="wrap">
        <div className="chapter-tag label"><span>05 / 07</span><i /><span>The Ego</span></div>
        <Reveal><h2 className="h-display">He built<br /><em>a boss.</em></h2></Reveal>
        <div style={{ height: '28vh' }} />
        <Reveal><BossFight /></Reveal>
      </div>
    </section>
  )
}
