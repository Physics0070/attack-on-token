import { useEffect } from 'react'
import { scrollState, useStore } from '../state/store'
import { audio } from '../audio/engine'

/** Turns document scroll into a continuous chapter position (2.35 = 35% through chapter 2) + velocity + mouse. */
export function useScrollDriver(resetKey: number, page: 1 | 2 = 1) {
  useEffect(() => {
    let tops: number[] = [], hs: number[] = []
    let last = window.scrollY, raf = 0, running = true
    const measure = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
      tops = els.map((e) => e.getBoundingClientRect().top + window.scrollY)
      hs = els.map((e) => e.offsetHeight)
    }
    measure()
    const mi = window.setInterval(measure, 600)
    const onMove = (e: PointerEvent) => {
      scrollState.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.mouse.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', measure)
    let lastCh = -1
    const tick = () => {
      if (!running) return
      const y = window.scrollY
      scrollState.vel += (Math.abs(y - last) - scrollState.vel) * 0.15
      last = y
      if (tops.length) {
        const c = y + window.innerHeight * 0.5
        let i = 0
        for (let k = 0; k < tops.length; k++) if (c >= tops[k]) i = k
        const f = Math.min(1, Math.max(0, (c - tops[i]) / Math.max(1, hs[i])))
        const target = page === 1 ? (i === 2 ? 2 + f * 0.5 : i + f) : (i === 0 ? 3.5 + f * 0.5 : i + 3 + f)
        scrollState.pos += (target - scrollState.pos) * 0.18
        const ch = Math.min(6, Math.floor(scrollState.pos + 0.02))
        if (ch !== lastCh) {
          lastCh = ch
          useStore.getState().setChapter(ch)
          audio.setChapter(ch)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(raf); clearInterval(mi); window.removeEventListener('pointermove', onMove); window.removeEventListener('resize', measure) }
  }, [resetKey, page])
}
