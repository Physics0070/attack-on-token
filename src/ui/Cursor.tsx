import { useEffect, useRef } from 'react'
import { scrollState } from '../state/store'
import './cursor.css'

/** Custom cursor: dot + lagging ring; grows over controls, becomes a crosshair over the 3D boss. */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf = 0
    let mode = ''
    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY
      const t = e.target as HTMLElement
      let m = ''
      if (t?.closest?.('button, a, input, select, textarea, [role=button], .win-x, label')) m = 'link'
      else if (t?.tagName === 'CANVAS' && scrollState.pos > 3.55 && scrollState.pos < 5.05) m = 'strike'
      else if (t?.tagName === 'CANVAS') m = ''
      const lab = (t?.closest?.('[data-cursor]') as HTMLElement | null)?.dataset.cursor ?? (m === 'strike' ? 'HIT' : '')
      if (m !== mode) { mode = m; ring.current?.setAttribute('data-mode', m) }
      if (label.current && label.current.textContent !== lab) label.current.textContent = lab
    }
    const down = () => ring.current?.classList.add('down'), up = () => ring.current?.classList.remove('down')
    const loop = () => {
      rx += (x - rx) * 0.2; ry += (y - ry) * 0.2
      if (dot.current) dot.current.style.transform = `translate(${x}px,${y}px)`
      if (ring.current) ring.current.style.transform = `translate(${rx}px,${ry}px)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up)
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up) }
  }, [])
  return (
    <>
      <div ref={dot} className="cur-dot" aria-hidden />
      <div ref={ring} className="cur-ring" aria-hidden><span ref={label} /></div>
    </>
  )
}
