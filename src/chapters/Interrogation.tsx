import Reveal from '../ui/Reveal'
import Tribunal from '../mechanics/Tribunal'
import Captcha from '../mechanics/Captcha'
import AuraScanner from '../mechanics/AuraScanner'
import Phone from '../mechanics/Phone'
import { fx, useStore } from '../state/store'
import { audio } from '../audio/engine'

export default function Interrogation() {
  return (
    <section className="chapter tall" data-chapter={2}>
      <div className="wrap stack">
        <div>
          <div className="chapter-tag label"><span>03 / 07</span><i /><span>The Interrogation</span></div>
          <Reveal><h2 className="h-display">Prove it.<br /><em>Any of it.</em></h2></Reveal>
          <Reveal delay={120}><p className="lead" style={{ marginTop: 20 }}>The scanner above has questions. You are the only available witness, judge, jury, and — pending the results — suspect.</p></Reveal>
        </div>
        <Reveal><Tribunal /></Reveal>
        <Reveal><Captcha /></Reveal>
        <Reveal><AuraScanner /></Reveal>
        <Reveal><Phone /></Reveal>
        <Reveal>
          <div className="panel" style={{ maxWidth: 620 }}>
            <div className="label">End of page 1 of 2</div>
            <h3 className="h-mid" style={{ margin: '8px 0 10px' }}>The interrogation is over. <em className="hot">The building is not.</em></h3>
            <p className="lead dim">Page 2 contains the Corporate Fever Dream, the boss, the consequences and your final form. Your decisions come with you.</p>
            <div style={{ marginTop: 16 }}>
              <button className="btn hot" data-cursor="page 2" onClick={() => { audio.sfx('boom'); audio.sfx('glitch'); fx.flash('#cfff2e'); fx.glitch(900); useStore.getState().note('Opted into page 2 of the website'); setTimeout(() => { useStore.setState({ page: 2 }); window.scrollTo(0, 0) }, 450) }}>Continue to page 2 →</button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
