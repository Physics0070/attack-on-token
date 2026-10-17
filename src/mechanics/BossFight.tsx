import { useCallback, useEffect, useRef, useState } from 'react'
import { fx, scrollState, useStore } from '../state/store'
import { bossBus } from '../state/bus'
import { audio } from '../audio/engine'
import { BOSS_LINES, CHEEVOS } from '../content/copy'
import './BossFight.css'

type Phase = 'idle' | 'p1' | 'cut' | 'p2' | 'ignored' | 'blackhole' | 'fled'
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** THE EGO. Real 3D boss (scene/Core). Twist: attacking FEEDS it. Win condition: stop. */
export default function BossFight() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [hp, setHp] = useState(100)
  const [dmg, setDmg] = useState<{ id: number; x: number; y: number; v: string }[]>([])
  const [hits, setHits] = useState(0)
  const ego = useStore((s) => s.ego)
  const ref = useRef({ phase: 'idle' as Phase, hp: 100, hits: 0, last: 0, cutDone: false, hintAt: 0, quipAt: 0, ignoreLine: 0 })
  const ptr = useRef({ x: innerWidth / 2, y: innerHeight / 2 })
  const id = useRef(1)

  const set = (p: Phase) => { ref.current.phase = p; setPhase(p) }
  const say = (t: string, voice: 'robot' | 'ai' | 'arlo' = 'robot', speak = true) => {
    if (speak) audio.say(t, { voice, sub: 'THE EGO' }); else fx.subtitle(t, 'THE EGO', 2800)
  }

  useEffect(() => {
    const m = (e: PointerEvent) => { ptr.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('pointermove', m, { passive: true }); window.addEventListener('pointerdown', m, { passive: true })
    return () => { window.removeEventListener('pointermove', m); window.removeEventListener('pointerdown', m) }
  }, [])

  const engage = async () => {
    audio.sfx('orchestra'); audio.music.play('boss'); fx.shake(400)
    set('p1'); ref.current.last = performance.now()
    useStore.getState().note('Picked a fight with a 3D representation of Arlo\'s ego')
    for (const l of BOSS_LINES.intro.slice(0, 2)) { if (ref.current.phase !== 'p1') break; say(l, 'robot', true); await sleep(2800) }
  }

  const phase2 = useCallback(async () => {
    const r = ref.current
    set('cut'); r.cutDone = true
    audio.music.cut()               // the comedic cut
    fx.subtitle(BOSS_LINES.cut, 'THE EGO', 2400)
    await sleep(2300)                // dramatic silence
    audio.sfx('boom'); fx.flash('#ece4d2'); fx.shake(600); fx.meme('stonks')
    r.hp = 100; setHp(100)
    useStore.getState().bump('ego', 14)
    useStore.getState().bump('delusion', 12)
    say(pick(BOSS_LINES.phase2), 'robot', true)
    audio.music.resume()
    r.last = performance.now()
    set('p2')
  }, [])

  const onHit = useCallback(() => {
    const r = ref.current
    if (r.phase !== 'p1' && r.phase !== 'p2') return
    const st = useStore.getState()
    r.hits++; setHits(r.hits); r.last = performance.now()
    st.setFlag('boss.hits', r.hits)
    scrollState.bossHit = 1; scrollState.bossScale += 0.05
    audio.sfx(r.phase === 'p1' ? 'hit' : 'thud', { pitch: 0.9 + Math.random() * 0.25 })
    let v = '0'
    if (r.phase === 'p1') {
      const d = 3 + Math.floor(Math.random() * 4); r.hp = Math.max(0, r.hp - d); setHp(r.hp); v = `-${d}`
      st.bump('ego', 2.4)
    } else { v = 'IMMUNE'; st.bump('ego', 1.6) }
    st.bump('delusion', 0.6); st.bump('aura', r.phase === 'p1' ? 40 : -15)
    const did = id.current++
    setDmg((a) => [...a.slice(-6), { id: did, x: ptr.current.x, y: ptr.current.y, v }])
    setTimeout(() => setDmg((a) => a.filter((x) => x.id !== did)), 900)
    // quips: it gets smugger the more it is fed
    if (r.hits % 4 === 0) fx.subtitle(pick(BOSS_LINES.hit), 'THE EGO', 2600)
    if (r.phase === 'p1' && r.hp <= 26 && !r.cutDone) phase2()
    if (r.phase === 'p2') {
      if (r.hits > 10 && r.hintAt < 1) { r.hintAt = 1; fx.subtitle(BOSS_LINES.hint[0], 'SITE', 4200) }
      if (r.hits > 22 && r.hintAt < 2) { r.hintAt = 2; fx.subtitle(BOSS_LINES.hint[1], 'SITE', 4200) }
      if (r.hits > 34 && r.hintAt < 3) { r.hintAt = 3; fx.subtitle(BOSS_LINES.hint[2], 'SITE', 4200) }
    }
    if (useStore.getState().ego >= 99.5) blackhole()
  }, [phase2])

  const blackhole = async () => {
    const r = ref.current; if (r.phase === 'blackhole') return
    set('blackhole')
    const st = useStore.getState()
    st.set({ bossOutcome: 'blackhole' }); st.setStat('ego', 100); st.setStat('delusion', 100); st.bump('aura', -99999)
    st.note('Fed the ego until it collapsed into a black hole')
    audio.music.cut(); audio.sfx('glitch'); await sleep(400); audio.sfx('boom')
    scrollState.invertUntil = performance.now() + 1800; fx.glitch(2200); fx.shake(1500); fx.meme('cooked')
    say(pick(BOSS_LINES.blackhole), 'robot', true)
    const c = CHEEVOS.bossFed; if (c) st.unlock('bossFed', c.title, c.desc)
    await sleep(2200); audio.music.resume(); audio.music.play('ambient')
  }

  // ignoring is the real mechanic: when the player stops, the ego starves
  useEffect(() => {
    const iv = setInterval(() => {
      const r = ref.current
      const st = useStore.getState()
      const idle = performance.now() - r.last
      if (r.phase === 'p1' && idle > 7000 && r.hits < 3) { fx.subtitle('Nothing is happening. Click the large shiny thing.', 'SITE', 3000); r.last = performance.now() }
      if (r.phase === 'p2' && idle > 2200) {
        st.bump('ego', -5.5)
        const now = performance.now()
        if (now - r.quipAt > 2600) { r.quipAt = now; const arr = BOSS_LINES.ignored; fx.subtitle(arr[Math.min(arr.length - 1, r.ignoreLine++)], 'THE EGO', 2400) }
        if (useStore.getState().ego <= 9) win()
      }
    }, 450)
    return () => clearInterval(iv)
  }, [])

  const win = async () => {
    const r = ref.current; if (r.phase === 'ignored') return
    set('ignored')
    const st = useStore.getState()
    st.set({ bossOutcome: 'ignored' }); st.setStat('ego', 4); st.bump('delusion', -28); st.bump('aura', 5000)
    st.note('Defeated the ego by simply ignoring it')
    audio.music.cut(); await sleep(800)
    audio.sfx('heal'); audio.sfx('success'); fx.flash('#d4a84a'); fx.meme('sigma')
    audio.say('Victory. Attention withdrawn. The ego has been starved.', { voice: 'announcer', sub: 'ANNOUNCER' })
    const c = CHEEVOS.bossIgnored; st.unlock('bossIgnored', c.title, c.desc)
    audio.music.resume()
  }

  const flee = () => {
    const st = useStore.getState()
    set('fled')
    if (st.bossOutcome === 'none') st.set({ bossOutcome: 'fed' })
    st.note('Walked away from the boss fight mid-sentence')
    audio.music.resume(); say(pick(BOSS_LINES.fed), 'robot', true)
  }

  useEffect(() => { bossBus.hit = onHit; return () => { delete bossBus.hit } }, [onHit])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.code === 'Space' || e.key === 'f') && (ref.current.phase === 'p1' || ref.current.phase === 'p2') && scrollState.pos > 3.6 && scrollState.pos < 5.05) { e.preventDefault(); onHit() } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onHit])
  // leaving the arena mid-fight stops the boss music so it never leaks into other chapters
  useEffect(() => {
    let away = 0
    const iv = setInterval(() => {
      const p = scrollState.pos, ph = ref.current.phase
      away = (ph === 'p1' || ph === 'p2') && (p < 3.2 || p > 5.4) ? away + 1 : 0
      if ((ph === 'p1' || ph === 'p2') && away >= 3) { set('fled'); const st = useStore.getState(); if (st.bossOutcome === 'none') st.set({ bossOutcome: 'fed' }); audio.music.play('ambient'); st.note('Fled the arena without a conclusion') }
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const active = phase === 'p1' || phase === 'p2' || phase === 'cut'
  return (
    <>
      <div className="panel boss-intro">
        <div className="label">Mechanic 11 · The Ego Boss Fight</div>
        <h3 className="h-mid" style={{ margin: '8px 0 10px' }}>{phase === 'idle' ? 'Fight the thing he built instead of a personality.' : phase === 'ignored' ? 'Defeated.' : phase === 'blackhole' ? 'Singularity.' : phase === 'fled' ? 'You walked away.' : 'THE EGO'}</h3>
        {phase === 'idle' && <>
          <p className="lead">A real-time 3D boss. Click it, tap it, or press <kbd>Space</kbd>. Hit points go down. Everything else, you will find out.</p>
          <div style={{ marginTop: 16 }}><button className="btn hot" onClick={engage} data-cursor="engage">Engage the ego</button></div>
        </>}
        {phase === 'ignored' && <p className="lead">It could not survive being ignored. Neither could the last three of Arlo's startups.</p>}
        {phase === 'blackhole' && <p className="lead">You fed it until it collapsed under its own gravity. Arlo is now a singularity with a LinkedIn.</p>}
        {phase === 'fled' && <p className="lead">The fight remains unresolved. The ego has noted your departure and updated its self-image to "mysterious".</p>}
        {active && <p className="lead dim">Hit it. Obviously. That is what bosses are for.</p>}
      </div>

      {active && (
        <div className="boss-hud" role="group" aria-label="Boss status">
          <div className="boss-row"><span className="label">Arlo's Ego · {phase === 'p2' || phase === 'cut' ? 'PHASE 2: HUMBLE BRAG MODE' : 'PHASE 1'}</span><span className="label">Attention fed: {hits}</span></div>
          <div className="boss-bar"><b className={hp < 30 ? 'low' : ''} style={{ width: `${hp}%` }} /></div>
          <div className="boss-row"><span className="label">Ego mass</span><div className="boss-bar thin"><b style={{ width: `${ego}%` }} /></div></div>
          <div className="boss-actions"><button className="btn hot" onPointerDown={(e) => { e.preventDefault(); onHit() }} aria-label="Strike the boss">Strike [space]</button><button className="btn ghost" onClick={flee}>Walk away</button></div>
        </div>
      )}
      {dmg.map((d) => <span key={d.id} className="dmg" style={{ left: d.x, top: d.y }}>{d.v}</span>)}
    </>
  )
}
