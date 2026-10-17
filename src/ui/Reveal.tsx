import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react'

/** Fade/slide-in on first intersection. Cheap IntersectionObserver wrapper. */
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div', style }: { children: ReactNode; delay?: number; className?: string; as?: any; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect() } }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>{children}</Tag>
}
