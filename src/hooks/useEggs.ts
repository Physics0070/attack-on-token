import { useEffect } from 'react'
import { fx, scrollState, useStore } from '../state/store'
import { audio } from '../audio/engine'
import { EGG_LINES, IDLE_LINES, CHEEVOS } from '../content/copy'

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const TITLE = document.title

/** Hidden interactions: konami, typed words, right-click, copy, tab-away, mouse shake, fast scroll, idle. */
export function useEggs() {
  useEffect(() => {
    const found = new Set<string>()
    const egg = (id: string) => {
      if (found.has(id)) return false
      found.add(id)
      const st = useStore.getState()
      st.incFlag('eggs'); st.bump('aura', 333)
      if (((useStore.getState().flags.eggs as number) || 0) >= 5) st.unlock('eggs5', CHEEVOS.eggs5.title, CHEEVOS.eggs5.desc)
      return true
    }
    let kBuf: string[] = [], tBuf = ''
    let lastInput = performance.now(), idleN = 0
    const touch = () => { lastInput = performance.now(); idleN = 0 }

    const onKey = (e: KeyboardEvent) => {
      touch()
      kBuf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key); kBuf = kBuf.slice(-10)
      if (kBuf.join() === KONAMI.join()) {
        const st = useStore.getState()
        const on = !st.godMode
        st.set({ godMode: on })
        if (on && egg('konami')) { st.incFlag('konami'); st.bump('aura', 1000000); st.setStat('delusion', 100) }
        audio.sfx('fanfare'); audio.sfx('airhorn'); fx.flash('#d4a84a'); fx.shake(700)
        ;['stonks', 'sigma', 'aura'].forEach((m, i) => setTimeout(() => fx.meme(m), i * 350))
        fx.subtitle(pick(EGG_LINES[on ? 'godmode' : 'konami']), 'ARLO', 4200)
        const c = CHEEVOS.konami ?? CHEEVOS.godmode; if (c) st.unlock('konami', c.title, c.desc)
        kBuf = []
      }
      if (e.key.length === 1 && !(e.target as HTMLElement)?.closest?.('input, textarea')) {
        tBuf = (tBuf + e.key.toLowerCase()).slice(-12)
        if (tBuf.endsWith('hireme') && egg('hireme')) { fx.subtitle(pick(EGG_LINES.hireme), 'ARLO', 4200); audio.sfx('notify'); fx.meme('eyes') }
        if (tBuf.endsWith('fry')) {
          const st = useStore.getState(); const on = !st.friedMode; st.set({ friedMode: on })
          if (on) { egg('fried'); fx.subtitle(pick(EGG_LINES.fried), 'SITE', 3600); audio.sfx('glitch'); const c = CHEEVOS.fried; st.unlock('fried', c.title, c.desc) }
          tBuf = ''
        }
      }
    }
    const onCtx = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea')) return
      e.preventDefault(); egg('rightclick'); touch()
      fx.toast('Inspect Arlo', pick(EGG_LINES.rightclick)); audio.sfx('deny')
    }
    const onCopy = () => { if (egg('copy')) { fx.subtitle(pick(EGG_LINES.copy), 'LEGAL', 4200); audio.sfx('cashRegister') } }
    const onVis = () => {
      if (document.hidden) { document.title = pick(EGG_LINES.tabaway); egg('tabaway') }
      else { document.title = TITLE; if (found.has('tabaway')) fx.subtitle(pick(EGG_LINES.tabback), 'ARLO', 3600) }
    }
    // mouse shake: many direction reversals in a short window
    let rev: number[] = [], lastX = 0, lastDir = 0
    const onMove = (e: PointerEvent) => {
      touch()
      const dx = e.clientX - lastX; lastX = e.clientX
      const dir = Math.sign(dx)
      if (Math.abs(dx) > 14 && dir && dir !== lastDir) { rev.push(performance.now()); lastDir = dir }
      rev = rev.filter((t) => performance.now() - t < 700)
      if (rev.length >= 8) { rev = []; if (egg('shake')) { fx.subtitle(pick(EGG_LINES.shake), 'ARLO', 3600); fx.meme('eyes'); audio.sfx('whoosh') } }
    }
    const iv = setInterval(() => {
      const st = useStore.getState()
      if (!st.started) return
      if (scrollState.vel > 70 && egg('scrollfast')) fx.subtitle(pick(EGG_LINES.scrollfast), 'SITE', 3600)
      const idle = performance.now() - lastInput
      if (idle > 28000 + idleN * 14000) {
        idleN++
        fx.subtitle(IDLE_LINES[Math.min(IDLE_LINES.length - 1, idleN - 1 + Math.floor(Math.random() * 2))], 'THE SITE', 5200)
        if (idleN === 1 && egg('idle')) st.unlock('idle', CHEEVOS.idle.title, CHEEVOS.idle.desc)
        audio.sfx('notify')
      }
    }, 1000)
    window.addEventListener('keydown', onKey)
    window.addEventListener('contextmenu', onCtx)
    window.addEventListener('copy', onCopy)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', touch); window.addEventListener('wheel', touch, { passive: true }); window.addEventListener('scroll', touch, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(iv)
      window.removeEventListener('keydown', onKey); window.removeEventListener('contextmenu', onCtx); window.removeEventListener('copy', onCopy)
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', touch); window.removeEventListener('wheel', touch); window.removeEventListener('scroll', touch)
      document.removeEventListener('visibilitychange', onVis)
      document.title = TITLE
    }
  }, [])
}
