import { useEffect, useRef, useState } from 'react'
import { fx, useStore } from '../state/store'
import { audio } from '../audio/engine'
import './overlay.css'

const MEMES: Record<string, { glyph: string; text: string; cls?: string }> = {
  skull: { glyph: '💀', text: '' },
  bruh: { glyph: '', text: 'bruh.', cls: 'm-text' },
  true: { glyph: '✅', text: 'TRUE', cls: 'm-text' },
  cooked: { glyph: '🍳', text: 'HE IS COOKED', cls: 'm-text' },
  nofr: { glyph: '🧢', text: 'NO CAP?', cls: 'm-text' },
  sigma: { glyph: '🗿', text: '' },
  L: { glyph: '', text: 'L', cls: 'm-huge' },
  fine: { glyph: '🔥☕🔥', text: 'this is fine', cls: 'm-text' },
  stonks: { glyph: '📈', text: 'STONKS', cls: 'm-text' },
  aura: { glyph: '', text: '-10000 AURA', cls: 'm-text bad' },
  npc: { glyph: '🤖', text: 'NPC DETECTED', cls: 'm-text' },
  ratio: { glyph: '', text: 'RATIO', cls: 'm-huge' },
  clown: { glyph: '🤡', text: '' },
  eyes: { glyph: '👀', text: '' },
}

function MemeShot({ id, kind, text }: { id: number; kind: string; text?: string }) {
  const m = MEMES[kind] ?? { glyph: '', text: text ?? kind, cls: 'm-text' }
  const style = useRef({ ['--r' as any]: `${(Math.random() - 0.5) * 18}deg`, ['--x' as any]: `${(Math.random() - 0.5) * 40}vw`, ['--y' as any]: `${(Math.random() - 0.5) * 30}vh` })
  useEffect(() => { const t = setTimeout(() => fx.dismissMeme(id), 1500); return () => clearTimeout(t) }, [id])
  return (
    <div className={`meme ${m.cls ?? ''}`} style={style.current} aria-hidden>
      {m.glyph && <span className="meme-g">{m.glyph}</span>}
      {(text ?? m.text) && <span className="meme-t">{text ?? m.text}</span>}
    </div>
  )
}

function ToastItem({ id, kind, title, body }: { id: number; kind: string; title: string; body?: string }) {
  useEffect(() => { const t = setTimeout(() => fx.dismissToast(id), kind === 'achievement' ? 5200 : 4200); return () => clearTimeout(t) }, [id, kind])
  useEffect(() => { if (kind === 'achievement') audio.sfx('achievement'); else if (kind === 'error') audio.sfx('error'); else audio.sfx('notify') }, [kind])
  return (
    <div className={`toast t-${kind}`} role="status" onClick={() => fx.dismissToast(id)}>
      <span className="toast-k">{kind === 'achievement' ? 'ACHIEVEMENT UNLOCKED' : kind === 'error' ? 'SYSTEM ERROR' : kind === 'win' ? 'VICTORY' : 'SYSTEM'}</span>
      <b>{title}</b>
      {body && <span className="toast-b">{body}</span>}
    </div>
  )
}

export default function Overlay() {
  const toasts = useStore((s) => s.toasts)
  const memes = useStore((s) => s.memes)
  const sub = useStore((s) => s.subtitle)
  const flash = useStore((s) => s.flashColor)
  const shakeUntil = useStore((s) => s.shakeUntil)
  const glitchUntil = useStore((s) => s.glitchUntil)
  const fried = useStore((s) => s.friedMode)
  const [, force] = useState(0)

  // transient body classes
  useEffect(() => {
    const b = document.body
    const ms = Math.max(0, shakeUntil - performance.now())
    if (ms > 0) { b.classList.add('shaking'); const t = setTimeout(() => b.classList.remove('shaking'), ms); return () => clearTimeout(t) }
  }, [shakeUntil])
  useEffect(() => {
    const b = document.body
    const ms = Math.max(0, glitchUntil - performance.now())
    if (ms > 0) { b.classList.add('glitching'); const t = setTimeout(() => b.classList.remove('glitching'), ms); return () => clearTimeout(t) }
  }, [glitchUntil])
  useEffect(() => { document.body.classList.toggle('fried', fried) }, [fried])
  // subtitle expiry
  useEffect(() => {
    if (!sub) return
    const t = setTimeout(() => { if (useStore.getState().subtitle === sub) useStore.setState({ subtitle: null }); force((n) => n + 1) }, Math.max(100, sub.until - performance.now()))
    return () => clearTimeout(t)
  }, [sub])

  return (
    <>
      <div className="toasts" aria-live="polite">{toasts.slice(-4).map((t) => <ToastItem key={t.id} {...t} />)}</div>
      <div className="memes">{memes.slice(-3).map((m) => <MemeShot key={m.id} {...m} />)}</div>
      {sub && <div className="subtitle" role="status" aria-live="polite"><span>{sub.who}</span>{sub.text}</div>}
      {flash && <div className="flash" style={{ background: flash }} />}
    </>
  )
}
