import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useStore } from '../state/store'
import { ARLO } from '../content/copy'
import Reveal from '../ui/Reveal'
import './chapters.css'

export default function Arrival() {
  const started = useStore((s) => s.started)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!started || !root.current) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reduce) { gsap.set('.hero-ch', { yPercent: 0, opacity: 1 }); return }
      gsap.fromTo('.hero-ch', { yPercent: 115, rotate: 6, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.5, ease: 'expo.out', stagger: 0.035, delay: 0.7 })
      gsap.fromTo('.hero-fade', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12, delay: 1.6 })
    }, root)
    return () => ctx.revert()
  }, [started])
  const split = (s: string, cls = '') => s.split('').map((c, i) => <span key={i} className="hero-clip"><span className={`hero-ch ${cls}`}>{c === ' ' ? ' ' : c}</span></span>)
  return (
    <section className="chapter tall arrival" data-chapter={0} ref={root}>
      <div className="hero">
        <div className="hero-meta label hero-fade"><span>Profile № 0001</span><span>Status: <b className="brass">Verified Legend™</b> <small className="dim">(by Arlo)</small></span><span>Vexxity Labs · Est. 2020 · 1 employee</span></div>
        <h1 className="hero-name" aria-label={ARLO.name}>
          <span className="hero-line" aria-hidden>{split('ARLO')}</span>
          <span className="hero-line italic" aria-hidden>{split('Pemberton–Vex', 'it')}</span>
        </h1>
        <div className="hero-sub hero-fade">
          <p className="h-mid">{ARLO.title}</p>
          <p className="dim claim">{ARLO.tagline}</p>
        </div>
        <div className="hero-scroll label hero-fade"><i /> Scroll to enter the legend</div>
      </div>
      <div className="wrap bio">
        {ARLO.bio.map((p, i) => (
          <Reveal key={i} delay={i * 90} className="panel bio-p">
            <span className="label">§ 0{i + 1}</span>
            <p className={i === 3 ? '' : 'claim'}>{p}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
