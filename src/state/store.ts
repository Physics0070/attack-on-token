import { create } from 'zustand'

/** Core session state. Everything the site "remembers" about the visitor lives here. */
export type StatKey = 'delusion' | 'aura' | 'suspicion' | 'ego'

export interface Toast { id: number; kind: 'achievement' | 'system' | 'error' | 'win'; title: string; body?: string }
export interface MemeShot { id: number; kind: string; text?: string }

export type BossOutcome = 'none' | 'ignored' | 'fed' | 'blackhole'
export type SalaryOutcome = 'none' | 'walked' | 'paid' | 'employed'

interface State {
  /* ---- stats (all 0..100 except aura, which is unbounded & can go negative) ---- */
  delusion: number   // Arlo's confidence. Rises with every flex.
  aura: number       // brainrot currency. Starts at 0.
  suspicion: number  // how much the SITE doubts Arlo. Rises as he proves himself.
  ego: number        // boss size, 0..100
  /* ---- narrative memory ---- */
  flags: Record<string, number | boolean | string>
  log: string[]                      // human-readable decision history (feeds Consequences + Final Form)
  achievements: string[]
  bossOutcome: BossOutcome
  salaryOutcome: SalaryOutcome
  page: 1 | 2                        // the site has exactly two pages
  chapter: number                    // integer chapter index 0..6 (continuous position lives in scrollState)
  started: boolean                   // passed the gaslight gate
  ending: string | null
  /* ---- audio settings (engine subscribes to these) ---- */
  audio: { enabled: boolean; muted: boolean; master: number; music: number; sfx: number; voice: number; ambient: number }
  /* ---- transient fx ---- */
  toasts: Toast[]
  memes: MemeShot[]
  subtitle: { text: string; who: string; until: number } | null
  shakeUntil: number
  flashColor: string | null
  glitchUntil: number
  friedMode: boolean
  godMode: boolean
  /* ---- actions ---- */
  bump: (k: StatKey, d: number, why?: string) => void
  setStat: (k: StatKey, v: number) => void
  setFlag: (k: string, v: number | boolean | string) => void
  incFlag: (k: string, d?: number) => void
  note: (line: string) => void
  unlock: (id: string, title: string, desc?: string) => void
  setChapter: (n: number) => void
  setAudio: (p: Partial<State['audio']>) => void
  set: (p: Partial<State>) => void
  reset: () => void
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v))
let uid = 1

const fresh = () => ({
  delusion: 12, aura: 0, suspicion: 0, ego: 18,
  flags: {} as Record<string, number | boolean | string>,
  log: [] as string[], achievements: [] as string[],
  bossOutcome: 'none' as BossOutcome, salaryOutcome: 'none' as SalaryOutcome,
  page: 1 as 1 | 2, chapter: 0, started: false, ending: null as string | null,
  toasts: [] as Toast[], memes: [] as MemeShot[], subtitle: null, shakeUntil: 0,
  flashColor: null as string | null, glitchUntil: 0, friedMode: false, godMode: false,
})

export const useStore = create<State>((set, get) => ({
  ...fresh(),
  audio: { enabled: false, muted: false, master: 0.8, music: 0.7, sfx: 0.9, voice: 0.9, ambient: 0.6 },

  bump: (k, d) => set((s) => ({
    [k]: k === 'aura' ? Math.round(s[k] + d) : clamp(s[k] + d),
  } as Partial<State>)),
  setStat: (k, v) => set({ [k]: k === 'aura' ? v : clamp(v) } as Partial<State>),
  setFlag: (k, v) => set((s) => ({ flags: { ...s.flags, [k]: v } })),
  incFlag: (k, d = 1) => set((s) => ({ flags: { ...s.flags, [k]: ((s.flags[k] as number) || 0) + d } })),
  note: (line) => set((s) => ({ log: [...s.log, line] })),
  unlock: (id, title, desc) => {
    if (get().achievements.includes(id)) return
    set((s) => ({
      achievements: [...s.achievements, id],
      toasts: [...s.toasts, { id: uid++, kind: 'achievement', title, body: desc }],
    }))
  },
  setChapter: (n) => set({ chapter: n }),
  setAudio: (p) => set((s) => ({ audio: { ...s.audio, ...p } })),
  set: (p) => set(p),
  reset: () => set((s) => ({ ...fresh(), started: true, audio: s.audio })),
}))

/* ------------------------------------------------------------------ */
/* fx: imperative helpers for everything transient. Safe to call anywhere. */
/* ------------------------------------------------------------------ */
const st = () => useStore.getState()
export const fx = {
  toast(title: string, body?: string, kind: Toast['kind'] = 'system') {
    useStore.setState((s) => ({ toasts: [...s.toasts, { id: uid++, kind, title, body }] }))
  },
  /** Full-screen reaction sticker: 'skull' | 'bruh' | 'true' | 'cooked' | 'nofr' | 'sigma' | 'L' | 'fine' | 'stonks' | 'aura' | 'npc' | 'ratio' | any text */
  meme(kind: string, text?: string) {
    useStore.setState((s) => ({ memes: [...s.memes, { id: uid++, kind, text }] }))
  },
  subtitle(text: string, who = 'ARLO', ms = 3600) {
    useStore.setState({ subtitle: { text, who, until: performance.now() + ms } })
  },
  shake(ms = 500) { useStore.setState({ shakeUntil: performance.now() + ms }) },
  flash(color = '#ece4d2') { useStore.setState({ flashColor: color }); setTimeout(() => useStore.setState({ flashColor: null }), 120) },
  glitch(ms = 700) { useStore.setState({ glitchUntil: performance.now() + ms }) },
  dismissToast(id: number) { useStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })) },
  dismissMeme(id: number) { useStore.setState((s) => ({ memes: s.memes.filter((t) => t.id !== id) })) },
  get: st,
}

/* ------------------------------------------------------------------ */
/* scrollState: hot per-frame data. NOT reactive (read inside useFrame). */
/* ------------------------------------------------------------------ */
export const scrollState = {
  pos: 0,        // continuous chapter position: 2.35 = 35% through chapter 2
  vel: 0,        // smoothed scroll velocity (px/frame, abs)
  mouse: { x: 0, y: 0 },   // -1..1
  chaos: 0,      // 0..1 shader chaos (driven by chapter + events; read by post-processing)
  bossHit: 0,    // pulses 1->0 when the 3D boss is hit
  bossScale: 1,
  inkMode: 0,
  invertUntil: 0, // performance.now() deadline for colour-invert flash
}

export const CHAPTERS = [
  { id: 'arrival', no: '01', name: 'The Arrival' },
  { id: 'legend', no: '02', name: 'The Legend' },
  { id: 'interrogation', no: '03', name: 'The Interrogation' },
  { id: 'fever', no: '04', name: 'The Corporate Fever Dream' },
  { id: 'boss', no: '05', name: 'The Ego' },
  { id: 'consequences', no: '06', name: 'The Consequences' },
  { id: 'final', no: '07', name: 'The Final Form' },
] as const
