/* ------------------------------------------------------------------ */
/* Procedural audio engine — 100% WebAudio + speechSynthesis.          */
/* No samples, no URLs. Every public method is no-throw & safe to call */
/* before init() (it simply does nothing / remembers the request).     */
/* ------------------------------------------------------------------ */
import { useStore, fx } from '../state/store'

export type SfxName =
  | 'click' | 'hover' | 'tick' | 'boom' | 'orchestra' | 'fanfare' | 'error' | 'ding' | 'scratch' | 'glitch'
  | 'coin' | 'achievement' | 'sadTrombone' | 'airhorn' | 'whoosh' | 'laser' | 'hit' | 'crit' | 'heal' | 'pop'
  | 'shutter' | 'inflate' | 'deflate' | 'cashRegister' | 'drumroll' | 'cymbal' | 'rimshot' | 'applause'
  | 'ring' | 'hangup' | 'voicemail' | 'bell' | 'stinger' | 'dtmf' | 'slot' | 'jackpot' | 'notify' | 'deny'
  | 'success' | 'thud' | 'riser' | 'cut' | 'zap' | 'dialup'
export type TrackName = 'ambient' | 'dramatic' | 'fever' | 'boss' | 'final' | 'none'
export type VoiceName = 'ai' | 'announcer' | 'corporate' | 'arlo' | 'mom' | 'recruiter' | 'robot'
export interface SfxOpts { vol?: number; pitch?: number; level?: number }
/** pitch/rate here are ABSOLUTE overrides of the profile preset. queue=true appends instead of interrupting. */
export interface SayOpts { voice?: VoiceName; rate?: number; pitch?: number; sub?: boolean | string; queue?: boolean }

/* ------------------------------ core graph ------------------------------ */
type Curve = ReturnType<typeof makeCurve>
function makeCurve(fn: (x: number) => number, n = 2048) {
  const c = new Float32Array(n)
  for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1)
  return c
}

let ctx: AudioContext | null = null
let master!: GainNode
let comp!: DynamicsCompressorNode
let analyser!: AnalyserNode
let busMusic!: GainNode
let busSfx!: GainNode
let busVoice!: GainNode
let busAmb!: GainNode
let gateMusic!: GainNode
let gateAmb!: GainNode
let rvIn!: GainNode
let white!: AudioBuffer
let CV!: { soft: Curve; hard: Curve; crush: Curve }

let live = 0                 // currently alive source nodes (polyphony cap for sfx)
const MAX_LIVE = 80
let chapterN = 0
let intensity = 0
let wantTrack: TrackName | null = null
let cutState = false
const lastAt: Partial<Record<SfxName, number>> = {}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
const sget = () => useStore.getState().audio

function build() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return
  const c = new AC({ latencyHint: 'interactive' })
  ctx = c
  CV = {
    soft: makeCurve((x) => Math.tanh(x * 3) / Math.tanh(3)),
    hard: makeCurve((x) => Math.tanh(x * 6) / Math.tanh(6)),
    crush: makeCurve((x) => Math.round(x * 5) / 5),
  }
  master = c.createGain(); master.gain.value = 0
  comp = c.createDynamicsCompressor()
  comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22
  analyser = c.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0
  master.connect(comp); comp.connect(analyser); analyser.connect(c.destination)

  busMusic = c.createGain(); busSfx = c.createGain(); busVoice = c.createGain(); busAmb = c.createGain()
  gateMusic = c.createGain(); gateAmb = c.createGain()
  busMusic.connect(gateMusic); gateMusic.connect(master)
  busAmb.connect(gateAmb); gateAmb.connect(master)
  busSfx.connect(master); busVoice.connect(master)

  // shared white-noise buffer (looped, random start offset per use)
  white = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
  const wd = white.getChannelData(0)
  for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1

  // generated reverb impulse response: dark exponentially-decaying stereo noise
  const len = Math.floor(c.sampleRate * 2.4)
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const u = i / len
      lp += ((Math.random() * 2 - 1) - lp) * (0.62 - 0.5 * u)   // tail gets darker
      d[i] = lp * Math.pow(1 - u, 2.8) * Math.min(1, i / 160)
    }
  }
  const conv = c.createConvolver(); conv.buffer = ir
  rvIn = c.createGain(); rvIn.gain.value = 1
  const rvOut = c.createGain(); rvOut.gain.value = 0.9
  rvIn.connect(conv); conv.connect(rvOut); rvOut.connect(busSfx)

  applySettings(sget())
  c.addEventListener('statechange', () => { if (c.state === 'running') applySettings(sget()) })
}

function applySettings(a: ReturnType<typeof sget>) {
  try {
    const c = ctx; if (!c) return
    const t = c.currentTime
    master.gain.setTargetAtTime(a.muted ? 0 : clamp(a.master) * 0.9, t, 0.03)
    busMusic.gain.setTargetAtTime(clamp(a.music), t, 0.03)
    busSfx.gain.setTargetAtTime(clamp(a.sfx), t, 0.03)
    busVoice.gain.setTargetAtTime(clamp(a.voice), t, 0.03)
    busAmb.gain.setTargetAtTime(clamp(a.ambient), t, 0.03)
    if (a.muted) stopVoice()
  } catch { /* never throw */ }
}

/* ------------------------------ primitives ------------------------------ */
function envShape(p: AudioParam, t: number, vol: number, a: number, dur: number, sus?: boolean, rel = 0.05) {
  p.setValueAtTime(0.0001, t)
  p.linearRampToValueAtTime(Math.max(0.0002, vol), t + a)
  if (sus) {
    p.setValueAtTime(Math.max(0.0002, vol), t + Math.max(a, dur - rel))
    p.linearRampToValueAtTime(0.0001, t + Math.max(a + 0.001, dur))
  } else {
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.002, dur))
  }
}

function safeDisc(nodes: AudioNode[]) { for (const n of nodes) { try { n.disconnect() } catch { /* */ } } }

interface ToneO {
  f: number; t: number; dur: number
  type?: OscillatorType
  f2?: number; glide?: number                 // exponential glide to f2 over dur*glide
  seq?: [number, number][]                    // [timeOffset, freq] linear ramps
  vol?: number; a?: number; sus?: boolean; rel?: number
  det?: number; detNode?: AudioNode
  lp?: number; lp2?: number; lp3?: number; lpT?: number; q?: number; hp?: number
  ws?: Curve
  am?: { rate: number; depth: number }
  vib?: { rate: number; depth: number }
  dest?: AudioNode; rv?: number; pri?: boolean
}

function tone(o: ToneO) {
  const c = ctx; if (!c) return
  if (!o.pri && live > MAX_LIVE) return
  const t = Math.max(o.t, c.currentTime)
  const dur = o.dur
  const osc = c.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(Math.max(1, o.f), t)
  if (o.seq) for (const [dt, fr] of o.seq) osc.frequency.linearRampToValueAtTime(Math.max(1, fr), t + dt)
  else if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + Math.max(0.005, dur * (o.glide ?? 1)))
  if (o.det) osc.detune.value = o.det
  const nodes: AudioNode[] = []
  let tail: AudioNode = osc
  const chain = (n: AudioNode) => { tail.connect(n); tail = n; nodes.push(n) }
  if (o.ws) { const w = c.createWaveShaper(); w.curve = o.ws; chain(w) }
  if (o.lp) {
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q ?? 0.7
    f.frequency.setValueAtTime(o.lp, t)
    if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + Math.max(0.01, dur * (o.lpT ?? 1)))
    if (o.lp3) f.frequency.exponentialRampToValueAtTime(o.lp3, t + dur)
    chain(f)
  }
  if (o.hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; chain(f) }
  const g = c.createGain()
  envShape(g.gain, t, o.vol ?? 0.3, o.a ?? 0.005, dur, o.sus, o.rel)
  chain(g)
  const extra: OscillatorNode[] = []
  if (o.am) {
    const ag = c.createGain(); ag.gain.value = 1 - o.am.depth / 2
    const lfo = c.createOscillator(); lfo.frequency.value = o.am.rate
    const lg = c.createGain(); lg.gain.value = o.am.depth / 2
    lfo.connect(lg); lg.connect(ag.gain); lfo.start(t); lfo.stop(t + dur + 0.06)
    chain(ag); nodes.push(lg); extra.push(lfo)
  }
  if (o.vib) {
    const lfo = c.createOscillator(); lfo.frequency.value = o.vib.rate
    const vg = c.createGain(); vg.gain.value = o.vib.depth
    lfo.connect(vg); vg.connect(osc.detune); lfo.start(t); lfo.stop(t + dur + 0.06)
    nodes.push(vg); extra.push(lfo)
  }
  if (o.detNode) o.detNode.connect(osc.detune)
  tail.connect(o.dest ?? busSfx)
  if (o.rv) { const s = c.createGain(); s.gain.value = o.rv; tail.connect(s); s.connect(rvIn); nodes.push(s) }
  osc.start(t); osc.stop(t + dur + 0.06)
  live++
  osc.onended = () => {
    live--
    if (o.detNode) { try { o.detNode.disconnect(osc.detune) } catch { /* */ } }
    safeDisc([osc, ...nodes, ...extra])
  }
}

interface NoiseO {
  t: number; dur: number; vol?: number; a?: number; sus?: boolean; rel?: number
  ftype?: BiquadFilterType; f?: number; f2?: number; q?: number; fT?: number
  ws?: Curve; dest?: AudioNode; rv?: number; pri?: boolean
  auto?: (p: AudioParam) => void
}

function noise(o: NoiseO) {
  const c = ctx; if (!c) return
  if (!o.pri && live > MAX_LIVE) return
  const t = Math.max(o.t, c.currentTime)
  const src = c.createBufferSource(); src.buffer = white; src.loop = true
  const nodes: AudioNode[] = []
  let tail: AudioNode = src
  const chain = (n: AudioNode) => { tail.connect(n); tail = n; nodes.push(n) }
  if (o.ftype) {
    const f = c.createBiquadFilter(); f.type = o.ftype; f.Q.value = o.q ?? 0.8
    f.frequency.setValueAtTime(o.f ?? 1000, t)
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + Math.max(0.01, o.dur * (o.fT ?? 1)))
    chain(f)
  }
  if (o.ws) { const w = c.createWaveShaper(); w.curve = o.ws; chain(w) }
  const g = c.createGain()
  if (o.auto) { g.gain.setValueAtTime(0.0001, t); o.auto(g.gain) }
  else envShape(g.gain, t, o.vol ?? 0.3, o.a ?? 0.003, o.dur, o.sus, o.rel)
  chain(g)
  tail.connect(o.dest ?? busSfx)
  if (o.rv) { const s = c.createGain(); s.gain.value = o.rv; tail.connect(s); s.connect(rvIn); nodes.push(s) }
  src.start(t, Math.random() * 1.6); src.stop(t + o.dur + 0.06)
  live++
  src.onended = () => { live--; safeDisc([src, ...nodes]) }
}

/** Shared lowpass/highpass → gain mixer for stacked voices (disconnects itself later). */
function mixer(t: number, dur: number, o: { vol?: number; lp?: number; lp2?: number; lp3?: number; lpT?: number; q?: number; hp?: number; ws?: Curve; rv?: number; dest?: AudioNode }): AudioNode {
  const c = ctx!
  const nodes: AudioNode[] = []
  const input = c.createGain(); nodes.push(input)
  let tail: AudioNode = input
  const chain = (n: AudioNode) => { tail.connect(n); tail = n; nodes.push(n) }
  if (o.ws) { const w = c.createWaveShaper(); w.curve = o.ws; chain(w) }
  if (o.lp) {
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q ?? 1
    const tt = Math.max(t, c.currentTime)
    f.frequency.setValueAtTime(o.lp, tt)
    if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, tt + Math.max(0.01, dur * (o.lpT ?? 1)))
    if (o.lp3) f.frequency.exponentialRampToValueAtTime(o.lp3, tt + dur)
    chain(f)
  }
  if (o.hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; chain(f) }
  const g = c.createGain(); g.gain.value = o.vol ?? 1; chain(g)
  tail.connect(o.dest ?? busSfx)
  if (o.rv) { const s = c.createGain(); s.gain.value = o.rv; tail.connect(s); s.connect(rvIn); nodes.push(s) }
  window.setTimeout(() => safeDisc(nodes), Math.max(0, (t - c.currentTime + dur + 1.3) * 1000))
  return input
}

/** 808-ish metallic cluster for cymbals/crashes. */
function metal(t: number, dur: number, vol: number, dest?: AudioNode) {
  const m = mixer(t, dur, { hp: 6500, vol, dest, rv: 0.25 })
  for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
    tone({ type: 'square', f: f * 7.1, t, dur, vol: 0.12, a: 0.002, dest: m, pri: !!dest })
  }
  noise({ t, dur, vol: 0.7, ftype: 'highpass', f: 7500, dest: m, pri: !!dest })
}

function timp(t: number, vol: number, dest?: AudioNode, pri = false) {
  tone({ type: 'sine', f: 130, f2: 62, t, dur: 0.8, vol, glide: 0.35, a: 0.003, dest, rv: dest ? 0 : 0.3, pri })
  tone({ type: 'triangle', f: 95, f2: 55, t, dur: 0.4, vol: vol * 0.5, glide: 0.4, dest, pri })
  noise({ t, dur: 0.07, vol: vol * 0.7, ftype: 'lowpass', f: 600, dest, pri })
}

function riser(t: number, sec: number, vol: number, dest?: AudioNode, pri = false) {
  const m = mixer(t, sec + 0.1, { lp: 260, lp2: 6500, lpT: 1, q: 2, rv: dest ? 0 : 0.25, dest })
  for (const f of [73.4, 110, 146.8, 174.6, 220]) {
    for (const d of [-9, 9]) {
      tone({ type: 'sawtooth', f, f2: f * 2, t, dur: sec, vol: vol * 0.1, a: sec * 0.92, sus: true, rel: 0.02, det: d, dest: m, pri })
    }
  }
  noise({ t, dur: sec, vol: vol * 0.55, a: sec * 0.92, sus: true, rel: 0.02, ftype: 'bandpass', f: 300, f2: 7000, q: 0.8, dest, pri })
  // timpani heartbeat roll that accelerates
  let x = 0, gap = sec * 0.16, k = 0
  while (x < sec - 0.12 && k < 14) { timp(t + x, vol * (0.1 + 0.35 * (x / sec)), dest, pri); x += gap; gap = Math.max(0.07, gap * 0.8); k++ }
}

/* -------------------------------- SFX -------------------------------- */
const ROW = [697, 770, 852, 941], COL = [1209, 1336, 1477]
function dtmfFreqs(d: number): [number, number] {
  const n = ((Math.round(d) % 12) + 12) % 12
  if (n === 10) return [941, 1209]
  if (n === 11) return [941, 1477]
  if (n === 0) return [941, 1336]
  const k = n - 1
  return [ROW[Math.floor(k / 3)], COL[k % 3]]
}

type SfxFn = (t: number, v: number, p: number, lv: number | undefined) => void

const SFX: Record<SfxName, SfxFn> = {
  click: (t, v, p) => {
    noise({ t, dur: 0.025, vol: 0.3 * v, ftype: 'highpass', f: 2500 })
    tone({ type: 'square', f: 1900 * p, f2: 700 * p, t, dur: 0.035, vol: 0.1 * v, lp: 6000 })
  },
  hover: (t, v, p) => tone({ f: 1500 * p, f2: 1900 * p, t, dur: 0.05, vol: 0.05 * v, a: 0.004 }),
  tick: (t, v, p) => tone({ type: 'triangle', f: 3000 * p, f2: 2000 * p, t, dur: 0.022, vol: 0.14 * v, hp: 800 }),

  boom: (t, v, p) => {
    // vine-boom style: dropping sine, hard-clipped, soaked in reverb
    tone({ f: 118 * p, f2: 34 * p, t, dur: 1.15, vol: 0.9 * v, glide: 0.55, a: 0.002, ws: CV.soft, rv: 0.7 })
    tone({ f: 230 * p, f2: 62 * p, t, dur: 0.4, vol: 0.45 * v, glide: 0.5, a: 0.001, ws: CV.hard })
    noise({ t, dur: 0.24, vol: 0.9 * v, ftype: 'lowpass', f: 900, f2: 110, ws: CV.soft, rv: 0.8 })
    noise({ t, dur: 0.035, vol: 0.45 * v, ftype: 'bandpass', f: 1800, q: 0.9 })
    noise({ t: t + 0.03, dur: 1.7, vol: 0.2 * v, ftype: 'lowpass', f: 260, f2: 70, rv: 1 })
  },
  orchestra: (t, v, p) => {
    const m = mixer(t, 1.7, { lp: 4200, lp2: 800, lpT: 0.9, q: 1.2, vol: 1, rv: 0.45 })
    const notes = [38, 45, 50, 53, 57, 62, 65, 69]            // Dm stack
    notes.forEach((n, k) => {
      for (const d of [-11, 11]) tone({ type: k < 2 ? 'square' : 'sawtooth', f: mtof(n) * p, t, dur: 1.6, vol: 0.075 * v, a: 0.012, det: d, dest: m })
    })
    timp(t, 0.7 * v)
    metal(t + 0.005, 1.7, 0.35 * v)
    noise({ t, dur: 0.05, vol: 0.4 * v, ftype: 'lowpass', f: 3000 })
  },
  fanfare: (t, v, p) => {
    const arp = [60, 64, 67, 72]
    arp.forEach((n, k) => {
      const m = mixer(t + k * 0.11, 0.2, { lp: 500, lp2: 3800, lpT: 0.4, q: 2, rv: 0.25 })
      for (const d of [-7, 7]) tone({ type: 'sawtooth', f: mtof(n) * p, t: t + k * 0.11, dur: 0.2, vol: 0.16 * v, a: 0.01, det: d, dest: m, sus: true, rel: 0.04 })
    })
    const t2 = t + 0.46
    const m2 = mixer(t2, 1.2, { lp: 700, lp2: 4200, lpT: 0.25, lp3: 1800, q: 2, rv: 0.4 })
    for (const n of [60, 64, 67, 72, 76]) for (const d of [-8, 8]) {
      tone({ type: 'sawtooth', f: mtof(n) * p, t: t2, dur: 1.2, vol: 0.1 * v, a: 0.02, det: d, dest: m2, sus: true, rel: 0.5, vib: { rate: 5.2, depth: 8 } })
    }
    timp(t2, 0.35 * v)
  },
  error: (t, v, p) => {
    // original two-tone descending "something went wrong" chime
    tone({ type: 'triangle', f: 784 * p, t, dur: 0.17, vol: 0.28 * v, a: 0.004, lp: 3500 })
    tone({ type: 'sine', f: 1568 * p, t, dur: 0.12, vol: 0.06 * v })
    tone({ type: 'triangle', f: 494 * p, t: t + 0.15, dur: 0.6, vol: 0.32 * v, a: 0.004, lp: 3000, rv: 0.12 })
    tone({ type: 'sine', f: 988 * p, t: t + 0.15, dur: 0.35, vol: 0.07 * v })
    tone({ type: 'square', f: 247 * p, t: t + 0.15, dur: 0.3, vol: 0.05 * v, lp: 900 })
  },
  ding: (t, v, p) => {
    tone({ f: 1568 * p, t, dur: 1.1, vol: 0.3 * v, a: 0.003, rv: 0.25 })
    tone({ f: 3136 * p, t, dur: 0.6, vol: 0.1 * v })
    tone({ f: 4200 * p, t, dur: 0.25, vol: 0.04 * v })
  },
  scratch: (t, v, p) => {
    const seq: [number, number][] = [[0.04, 1900], [0.09, 280], [0.15, 2300], [0.21, 190], [0.29, 1600], [0.36, 130], [0.46, 2000], [0.55, 60]]
    tone({ type: 'sawtooth', f: 400 * p, seq: seq.map(([a, b]) => [a, b * p] as [number, number]), t, dur: 0.56, vol: 0.4 * v, a: 0.004, sus: true, rel: 0.05, lp: 3800, q: 3, hp: 120, ws: CV.soft })
    noise({ t, dur: 0.56, vol: 0.4 * v, ftype: 'bandpass', f: 3500, f2: 700, q: 1.3, sus: true, rel: 0.05, ws: CV.soft })
  },
  glitch: (t, v, p) => {
    let x = 0
    for (let i = 0; i < 8; i++) {
      const d = rnd(0.02, 0.06)
      const f = rnd(150, 2800) * p
      tone({ type: 'square', f, seq: [[d, f * (Math.random() < 0.5 ? 0.5 : 2)]], t: t + x, dur: d, vol: 0.2 * v, a: 0.001, sus: true, rel: 0.004, ws: CV.crush })
      if (Math.random() < 0.65) noise({ t: t + x, dur: d, vol: 0.2 * v, ftype: 'highpass', f: rnd(1500, 5500), ws: CV.crush })
      x += d + (Math.random() < 0.35 ? 0.035 : 0.004)
    }
  },
  coin: (t, v, p) => {
    tone({ type: 'square', f: 988 * p, t, dur: 0.065, vol: 0.13 * v, a: 0.002, lp: 7000 })
    tone({ type: 'square', f: 1319 * p, t: t + 0.065, dur: 0.38, vol: 0.13 * v, a: 0.002, lp: 7000 })
    tone({ type: 'sine', f: 2637 * p, t: t + 0.065, dur: 0.2, vol: 0.04 * v })
  },
  achievement: (t, v, p) => {
    ;[72, 76, 79, 84].forEach((n, k) => {
      tone({ type: 'triangle', f: mtof(n) * p, t: t + k * 0.09, dur: 0.5, vol: 0.2 * v, a: 0.004, rv: 0.4 })
      tone({ f: mtof(n + 12) * p, t: t + k * 0.09, dur: 0.3, vol: 0.05 * v })
    })
    for (let i = 0; i < 6; i++) tone({ f: rnd(3000, 6200), t: t + 0.3 + i * 0.05, dur: 0.18, vol: 0.03 * v, rv: 0.5 })
    ;[79, 84, 88].forEach((n) => tone({ type: 'triangle', f: mtof(n) * p, t: t + 0.4, dur: 1.1, vol: 0.1 * v, a: 0.01, rv: 0.6 }))
  },
  sadTrombone: (t, v, p) => {
    const N: [number, number, number][] = [[233.1, 0, 0.4], [220, 0.46, 0.4], [207.7, 0.92, 0.4], [196, 1.38, 1.3]]
    N.forEach(([f, dt, d], k) => {
      const last = k === 3
      const m = mixer(t + dt, d, { lp: 320, lp2: 1700, lp3: 450, lpT: 0.38, q: 4, rv: 0.12 })
      const seq: [number, number][] | undefined = last ? [[0.55, f * p], [d, f * 0.9 * p]] : undefined
      for (const det of [-7, 7]) {
        tone({ type: 'sawtooth', f: f * p, seq, t: t + dt, dur: d, vol: 0.2 * v, a: 0.035, sus: true, rel: 0.07, det, dest: m, vib: last ? { rate: 5.5, depth: 26 } : undefined })
      }
      tone({ type: 'square', f: f * p, t: t + dt, dur: d, vol: 0.05 * v, a: 0.03, sus: true, rel: 0.07, dest: m })
    })
  },
  airhorn: (t, v, p) => {
    const blast = (t0: number, d: number) => {
      const m = mixer(t0, d, { lp: 5200, hp: 280, q: 0.7, ws: CV.hard, rv: 0.25 })
      for (const n of [70, 74, 77]) {
        const f = mtof(n) * p
        for (const det of [-14, 0, 14]) {
          tone({ type: 'sawtooth', f: f * 1.12, seq: [[0.07, f], [d, f * 0.995]], t: t0, dur: d, vol: 0.075 * v, a: 0.006, sus: true, rel: 0.1, det, dest: m, vib: { rate: 7, depth: 5 } })
        }
      }
      noise({ t: t0, dur: d, vol: 0.06 * v, ftype: 'bandpass', f: 2200, q: 0.8, sus: true, rel: 0.1 })
    }
    blast(t, 0.5)
    blast(t + 0.58, 0.8)
  },
  whoosh: (t, v, p) => {
    noise({ t, dur: 0.5, vol: 0.4 * v, a: 0.2, ftype: 'bandpass', f: 300 * p, f2: 3600 * p, q: 1.1, fT: 0.5 })
    noise({ t: t + 0.18, dur: 0.35, vol: 0.2 * v, a: 0.01, ftype: 'bandpass', f: 3600 * p, f2: 500 * p, q: 1.1 })
  },
  laser: (t, v, p) => {
    tone({ type: 'sawtooth', f: 2400 * p, f2: 180 * p, t, dur: 0.2, vol: 0.2 * v, a: 0.002, lp: 6000, glide: 0.9 })
    tone({ type: 'square', f: 1200 * p, f2: 90 * p, t, dur: 0.2, vol: 0.08 * v, a: 0.002, glide: 0.9 })
  },
  hit: (t, v, p) => {
    tone({ f: 190 * p, f2: 55 * p, t, dur: 0.16, vol: 0.55 * v, a: 0.001, glide: 0.7 })
    noise({ t, dur: 0.09, vol: 0.5 * v, ftype: 'bandpass', f: 1300, q: 0.8 })
    noise({ t, dur: 0.03, vol: 0.3 * v, ftype: 'highpass', f: 3500 })
  },
  crit: (t, v, p) => {
    SFX.hit(t, v, p * 0.9, undefined)
    tone({ f: 2093 * p, t: t + 0.02, dur: 0.9, vol: 0.2 * v, rv: 0.4 })
    tone({ f: 3136 * p, t: t + 0.02, dur: 0.5, vol: 0.1 * v })
    tone({ f: 130 * p, f2: 38 * p, t, dur: 0.6, vol: 0.5 * v, glide: 0.5, ws: CV.soft })
    metal(t, 0.7, 0.22 * v)
  },
  heal: (t, v, p) => {
    ;[72, 76, 79, 84, 88].forEach((n, k) => {
      tone({ f: mtof(n) * p, t: t + k * 0.06, dur: 0.55, vol: 0.14 * v, a: 0.008, rv: 0.5 })
      tone({ f: mtof(n) * 2 * p, t: t + k * 0.06, dur: 0.25, vol: 0.03 * v })
    })
  },
  pop: (t, v, p) => {
    tone({ f: 280 * p, f2: 1100 * p, t, dur: 0.07, vol: 0.4 * v, a: 0.002, glide: 0.8 })
    noise({ t, dur: 0.012, vol: 0.2 * v, ftype: 'highpass', f: 3000 })
  },
  shutter: (t, v) => {
    noise({ t, dur: 0.018, vol: 0.5 * v, ftype: 'bandpass', f: 3500, q: 0.9 })
    tone({ type: 'square', f: 420, f2: 150, t, dur: 0.025, vol: 0.08 * v })
    noise({ t: t + 0.06, dur: 0.025, vol: 0.4 * v, ftype: 'bandpass', f: 2000, q: 0.9 })
    tone({ type: 'square', f: 320, f2: 120, t: t + 0.06, dur: 0.03, vol: 0.07 * v })
  },
  inflate: (t, v, p, lv) => {
    const l = clamp(lv ?? 0.5)
    const f = (200 + l * 800) * p
    tone({ type: 'sawtooth', f, f2: f * 1.2, t, dur: 0.3, vol: 0.2 * v, a: 0.025, sus: true, rel: 0.1, lp: 800 + l * 1800, q: 3, vib: { rate: 24, depth: 30 } })
    tone({ type: 'sine', f: f * 2, f2: f * 2.4, t, dur: 0.3, vol: 0.05 * v, a: 0.03, sus: true, rel: 0.1 })
    noise({ t, dur: 0.3, vol: 0.1 * v, a: 0.03, sus: true, rel: 0.1, ftype: 'bandpass', f: 2600, q: 1.2 })
  },
  deflate: (t, v, p, lv) => {
    const l = clamp(lv ?? 0.5)
    const f = (260 + l * 700) * p
    tone({ type: 'sawtooth', f, f2: 70 * p, t, dur: 0.85, vol: 0.2 * v, a: 0.02, lp: 1800, q: 2, am: { rate: 26, depth: 0.7 }, vib: { rate: 17, depth: 60 } })
    noise({ t, dur: 0.8, vol: 0.18 * v, ftype: 'bandpass', f: 3000, f2: 700, q: 1 })
  },
  cashRegister: (t, v, p) => {
    noise({ t, dur: 0.05, vol: 0.5 * v, ftype: 'bandpass', f: 1800, q: 1 })
    tone({ f: 130, f2: 60, t, dur: 0.09, vol: 0.4 * v })
    for (let i = 0; i < 4; i++) noise({ t: t + 0.015 + i * 0.022, dur: 0.012, vol: 0.18 * v, ftype: 'highpass', f: 4500 })
    const c0 = t + 0.1
    ;[3136, 4186, 5274].forEach((f, k) => tone({ f: f * p, t: c0, dur: 1.2 - k * 0.3, vol: (0.2 - k * 0.05) * v, a: 0.001, rv: 0.2 }))
    tone({ type: 'triangle', f: 1568 * p, t: c0, dur: 0.6, vol: 0.1 * v })
    noise({ t: c0, dur: 0.02, vol: 0.2 * v, ftype: 'highpass', f: 5000 })
  },
  drumroll: (t, v) => {
    const D = 1.5, n = 40
    noise({
      t, dur: D + 0.2, ftype: 'bandpass', f: 1900, q: 0.7, ws: CV.soft,
      auto: (p) => {
        for (let i = 0; i < n; i++) {
          const u = i / n
          const ts = t + D * Math.pow(u, 0.9)
          const nx = t + D * Math.pow((i + 1) / n, 0.9)
          const a = (0.22 + 0.78 * u) * 0.8 * v
          p.setValueAtTime(a, ts)
          p.exponentialRampToValueAtTime(0.001, Math.max(ts + 0.004, Math.min(ts + 0.05, nx - 0.002)))
        }
        p.setValueAtTime(0.0001, t + D + 0.18)
      },
    })
    tone({ f: 190, f2: 160, t, dur: D, vol: 0.12 * v, a: D * 0.9, sus: true, rel: 0.05 })
  },
  cymbal: (t, v, p) => {
    metal(t, 1.9, 0.5 * v * p)
    noise({ t, dur: 0.08, vol: 0.2 * v, ftype: 'highpass', f: 4000 })
  },
  rimshot: (t, v, p) => {
    tone({ type: 'triangle', f: 260 * p, f2: 150 * p, t, dur: 0.14, vol: 0.5 * v, glide: 0.8 })
    noise({ t, dur: 0.08, vol: 0.4 * v, ftype: 'bandpass', f: 1700, q: 0.8 })
    tone({ type: 'triangle', f: 160 * p, f2: 85 * p, t: t + 0.15, dur: 0.18, vol: 0.55 * v, glide: 0.8 })
    noise({ t: t + 0.15, dur: 0.1, vol: 0.35 * v, ftype: 'bandpass', f: 1200, q: 0.8 })
    const t3 = t + 0.34
    tone({ type: 'square', f: 880 * p, f2: 520 * p, t: t3, dur: 0.05, vol: 0.12 * v, hp: 500 })
    noise({ t: t3, dur: 0.07, vol: 0.5 * v, ftype: 'highpass', f: 2500 })
    metal(t3, 0.7, 0.3 * v)
  },
  applause: (t, v) => {
    const D = 2.7
    noise({ t, dur: D, vol: 0.14 * v, a: 0.5, sus: true, rel: 0.9, ftype: 'lowpass', f: 1100, q: 0.5 })
    for (const [fc, q, vv] of [[1700, 0.7, 0.9], [3200, 0.9, 0.5]] as const) {
      noise({
        t, dur: D, ftype: 'bandpass', f: fc, q,
        auto: (p) => {
          let last = t
          const times: number[] = []
          for (let k = 0; k < 400 && times.length < 150; k++) {
            const u = Math.random()
            if (Math.random() < Math.pow(Math.sin(Math.PI * u), 0.7)) times.push(t + u * D)
          }
          times.sort((a, b) => a - b)
          for (const raw of times) {
            const ts = Math.max(raw, last + 0.004)
            const dd = rnd(0.014, 0.045)
            p.setValueAtTime(rnd(0.25, 1) * vv * 0.55 * v, ts)
            p.exponentialRampToValueAtTime(0.002, ts + dd)
            last = ts + dd
          }
        },
      })
    }
  },
  ring: (t, v) => {
    for (const s of [0, 0.62]) {
      for (const f of [440, 480]) tone({ f, t: t + s, dur: 0.46, vol: 0.14 * v, a: 0.008, sus: true, rel: 0.03, am: { rate: 20, depth: 0.9 }, lp: 3000 })
      noise({ t: t + s, dur: 0.46, vol: 0.02 * v, ftype: 'bandpass', f: 2500, q: 2, sus: true, rel: 0.03 })
    }
  },
  hangup: (t, v) => {
    tone({ f: 150, f2: 55, t, dur: 0.12, vol: 0.5 * v })
    noise({ t, dur: 0.06, vol: 0.4 * v, ftype: 'bandpass', f: 900, q: 0.8 })
    noise({ t: t + 0.08, dur: 0.03, vol: 0.2 * v, ftype: 'highpass', f: 2500 })
    for (let i = 0; i < 3; i++) for (const f of [480, 620]) tone({ f, t: t + 0.22 + i * 0.4, dur: 0.24, vol: 0.1 * v, a: 0.005, sus: true, rel: 0.02 })
  },
  voicemail: (t, v, p) => {
    ;[(523), 659, 784].forEach((f, k) => tone({ f: f * p, t: t + k * 0.11, dur: 0.1, vol: 0.14 * v, a: 0.004, sus: true, rel: 0.02 }))
    tone({ f: 1000 * p, t: t + 0.5, dur: 0.42, vol: 0.18 * v, a: 0.005, sus: true, rel: 0.02 })
  },
  bell: (t, v, p) => {
    const R = [1, 2.76, 5.4, 8.93], G = [1, 0.5, 0.28, 0.14], Dd = [2.2, 1.5, 0.9, 0.55]
    R.forEach((r, k) => tone({ f: 880 * r * p, t, dur: Dd[k], vol: 0.2 * G[k] * v, a: 0.002, rv: 0.4 }))
  },
  stinger: (t, v, p) => {
    const m = mixer(t, 1.1, { lp: 3200, lp2: 380, lpT: 0.8, q: 2, rv: 0.5 })
    for (const f of [110, 155.6, 220, 311.1]) for (const d of [-12, 12]) {
      tone({ type: 'sawtooth', f: f * p, t, dur: 1.1, vol: 0.09 * v, a: 0.008, det: d, dest: m })
    }
    tone({ f: 55 * p, f2: 40 * p, t, dur: 1, vol: 0.5 * v, ws: CV.soft })
    noise({ t, dur: 0.5, vol: 0.25 * v, ftype: 'bandpass', f: 4000, f2: 600, q: 0.7 })
    metal(t, 0.9, 0.2 * v)
  },
  dtmf: (t, v, _p, lv) => {
    const [a, b] = dtmfFreqs(lv ?? 0)
    tone({ f: a, t, dur: 0.14, vol: 0.2 * v, a: 0.003, sus: true, rel: 0.01 })
    tone({ f: b, t, dur: 0.14, vol: 0.2 * v, a: 0.003, sus: true, rel: 0.01 })
  },
  slot: (t, v, p) => {
    const r = 0.92 + Math.random() * 0.16
    tone({ type: 'triangle', f: 950 * p * r, f2: 420 * p * r, t, dur: 0.035, vol: 0.25 * v, a: 0.001 })
    noise({ t, dur: 0.016, vol: 0.25 * v, ftype: 'bandpass', f: 2600, q: 1 })
    tone({ f: 150, f2: 90, t, dur: 0.04, vol: 0.18 * v })
  },
  jackpot: (t, v, p) => {
    ;[72, 76, 79, 84, 88, 91].forEach((n, k) => tone({ type: 'square', f: mtof(n) * p, t: t + k * 0.065, dur: 0.16, vol: 0.09 * v, a: 0.003, lp: 6000, rv: 0.25 }))
    const t2 = t + 0.42
    const R = [1, 2.76, 5.4]
    R.forEach((r, k) => tone({ f: 1046 * r * p, t: t2, dur: 2, vol: (0.2 - k * 0.05) * v, a: 0.002, rv: 0.5 }))
    ;[60, 64, 67, 72].forEach((n) => tone({ type: 'triangle', f: mtof(n) * p, t: t2, dur: 1.4, vol: 0.1 * v, a: 0.01, rv: 0.4 }))
    for (let i = 0; i < 22; i++) SFX.coin(t2 + i * 0.065 + rnd(0, 0.02), v * 0.55, p * rnd(0.85, 1.9), undefined)
    // siren whoop
    tone({ type: 'triangle', f: 500, seq: [[0.25, 1000], [0.5, 500], [0.75, 1000]], t: t + 0.1, dur: 0.75, vol: 0.07 * v, sus: true, rel: 0.1 })
  },
  notify: (t, v, p) => {
    tone({ f: 988 * p, t, dur: 0.18, vol: 0.2 * v, a: 0.004, rv: 0.15 })
    tone({ f: 1319 * p, t: t + 0.1, dur: 0.4, vol: 0.2 * v, a: 0.004, rv: 0.2 })
  },
  deny: (t, v, p) => {
    tone({ type: 'square', f: 150 * p, f2: 120 * p, t, dur: 0.11, vol: 0.2 * v, lp: 900, a: 0.003, sus: true, rel: 0.01 })
    tone({ type: 'square', f: 130 * p, f2: 90 * p, t: t + 0.15, dur: 0.22, vol: 0.2 * v, lp: 800, a: 0.003, sus: true, rel: 0.02 })
  },
  success: (t, v, p) => {
    ;[67, 72, 76].forEach((n, k) => tone({ type: 'triangle', f: mtof(n) * p, t: t + k * 0.075, dur: k === 2 ? 0.55 : 0.18, vol: 0.2 * v, a: 0.004, rv: 0.25 }))
    tone({ f: mtof(88) * p, t: t + 0.15, dur: 0.4, vol: 0.05 * v })
  },
  thud: (t, v, p) => {
    tone({ f: 95 * p, f2: 38 * p, t, dur: 0.3, vol: 0.7 * v, glide: 0.8, a: 0.002 })
    noise({ t, dur: 0.1, vol: 0.4 * v, ftype: 'lowpass', f: 260, f2: 90 })
  },
  riser: (t, v) => riser(t, 1.7, 0.6 * v),
  cut: (t, v) => {
    noise({ t, dur: 0.005, vol: 0.5 * v, ftype: 'highpass', f: 3500, a: 0.0005 })
  },
  zap: (t, v, p) => {
    const seq: [number, number][] = []
    for (let i = 1; i <= 14; i++) seq.push([i * 0.02, rnd(80, 900) * p])
    tone({ type: 'square', f: 400 * p, seq, t, dur: 0.3, vol: 0.14 * v, a: 0.002, hp: 200, ws: CV.crush })
    noise({ t, dur: 0.3, vol: 0.3 * v, ftype: 'bandpass', f: 3500, f2: 5500, q: 1.5, ws: CV.crush })
    tone({ type: 'sawtooth', f: 60 * p, t, dur: 0.3, vol: 0.2 * v, lp: 500 })
  },
  dialup: (t, v) => {
    tone({ f: 350, t, dur: 0.22, vol: 0.09 * v, a: 0.004, sus: true, rel: 0.01 })
    tone({ f: 440, t, dur: 0.22, vol: 0.09 * v, a: 0.004, sus: true, rel: 0.01 })
    for (let i = 0; i < 5; i++) {
      const [a, b] = dtmfFreqs(Math.floor(Math.random() * 10))
      tone({ f: a, t: t + 0.28 + i * 0.1, dur: 0.07, vol: 0.09 * v, sus: true, rel: 0.005 })
      tone({ f: b, t: t + 0.28 + i * 0.1, dur: 0.07, vol: 0.09 * v, sus: true, rel: 0.005 })
    }
    const h = t + 0.9
    tone({ f: 2100, t: h, dur: 0.38, vol: 0.1 * v, a: 0.01, sus: true, rel: 0.02 })
    const seq: [number, number][] = []
    for (let k = 1; k <= 20; k++) seq.push([k * 0.045, pick([1200, 1800, 2400, 980, 1650, 2250, 1300])])
    tone({ type: 'square', f: 1200, seq, t: h + 0.4, dur: 0.95, vol: 0.07 * v, sus: true, rel: 0.04, lp: 4500 })
    noise({ t: h + 0.4, dur: 0.95, vol: 0.12 * v, ftype: 'bandpass', f: 2800, q: 0.9, sus: true, rel: 0.04 })
    noise({ t: h + 1.35, dur: 0.3, vol: 0.12 * v, ftype: 'highpass', f: 2000 })
  },
}

const GAP: Partial<Record<SfxName, number>> = { hover: 60, click: 25, tick: 25, slot: 30, pop: 30, coin: 30 }

function sfx(name: SfxName, o?: SfxOpts) {
  try {
    const c = ctx; if (!c) return
    const a = sget()
    if (!a.enabled || a.muted) return
    if (c.state !== 'running') { c.resume().catch(() => { /* */ }); return }
    const fn = SFX[name]; if (!fn) return
    const n = performance.now()
    const last = lastAt[name]
    if (last !== undefined && n - last < (GAP[name] ?? 18)) return
    lastAt[name] = n
    fn(c.currentTime + 0.004, o?.vol ?? 1, o?.pitch ?? 1, o?.level)
  } catch { /* never throw */ }
}

/* ------------------------------- MUSIC ------------------------------- */
interface Track { name: TrackName; out: GainNode; kill: () => void }
let cur: Track | null = null
const dying = new Set<Track>()

function runSeq(stepDur: (i: number) => number, onStep: (i: number, t: number) => void): () => void {
  let i = 0
  let next = ctx!.currentTime + 0.08
  const pump = () => {
    const c = ctx; if (!c) return
    const n = c.currentTime
    if (next < n - 0.2) next = n + 0.05
    while (next < n + 0.2) {
      try { onStep(i, next) } catch { /* */ }
      next += stepDur(i); i++
    }
  }
  pump()
  const id = window.setInterval(pump, 40)
  return () => window.clearInterval(id)
}

/* ---- ambient drone pad ---- */
interface AmbCfg { root: number; r: number[]; lfo: number; cut: number; noise: number; det: number; wob: number; vol: number }
const AMB: AmbCfg[] = [
  { root: 73.42, r: [1, 1.5, 2, 2.4, 3], lfo: 0.07, cut: 420, noise: 0.015, det: 7, wob: 0, vol: 1 },          // 0 low D minor
  { root: 82.41, r: [1, 1.5, 2, 2.5, 3, 5], lfo: 0.09, cut: 700, noise: 0.015, det: 6, wob: 0, vol: 1 },      // 1 bright, regal E
  { root: 65.41, r: [1, 1.5, 2, 2.4, 3.6], lfo: 0.12, cut: 520, noise: 0.04, det: 11, wob: 4, vol: 1 },       // 2 C minor, tense
  { root: 69.3, r: [1, 1.4142, 2, 2.8284, 4], lfo: 0.31, cut: 900, noise: 0.2, det: 22, wob: 22, vol: 1.1 },  // 3 unstable tritone + noise
  { root: 55, r: [1, 1.5, 2, 2.4, 1.4142, 4], lfo: 0.2, cut: 1200, noise: 0.1, det: 13, wob: 9, vol: 1.1 },   // 4 heavy A
  { root: 98, r: [1, 2, 3], lfo: 0.04, cut: 360, noise: 0.008, det: 5, wob: 0, vol: 0.7 },                    // 5 sparse
  { root: 87.31, r: [1, 1.25, 1.5, 2, 2.5, 3], lfo: 0.06, cut: 1000, noise: 0.01, det: 5, wob: 0, vol: 1 },   // 6 resolved F major
]
let ambApply: ((glide: number) => void) | null = null

function buildAmbient(out: GainNode): () => void {
  const c = ctx!
  const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 3; filt.frequency.value = 500
  const mix = c.createGain(); mix.gain.value = 0.55
  mix.connect(filt); filt.connect(out)
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07
  const lfoG = c.createGain(); lfoG.gain.value = 200
  lfo.connect(lfoG); lfoG.connect(filt.frequency)
  const wob = c.createOscillator(); wob.frequency.value = 5.3
  const wobG = c.createGain(); wobG.gain.value = 0
  wob.connect(wobG)
  const srcs: AudioScheduledSourceNode[] = [lfo, wob]
  const slots: { oscs: OscillatorNode[]; g: GainNode }[] = []
  for (let i = 0; i < 6; i++) {
    const g = c.createGain(); g.gain.value = 0; g.connect(mix)
    const oscs: OscillatorNode[] = []
    for (const sg of [-1, 1]) {
      const o = c.createOscillator(); o.type = i % 3 === 2 ? 'triangle' : 'sawtooth'
      o.detune.value = sg * 7
      wobG.connect(o.detune)
      o.connect(g); o.start(); oscs.push(o); srcs.push(o)
    }
    slots.push({ oscs, g })
  }
  const sub = c.createOscillator(); sub.type = 'sine'
  const subG = c.createGain(); subG.gain.value = 0.35
  sub.connect(subG); subG.connect(filt); sub.start(); srcs.push(sub)
  const nsrc = c.createBufferSource(); nsrc.buffer = white; nsrc.loop = true
  const nbp = c.createBiquadFilter(); nbp.type = 'bandpass'; nbp.Q.value = 0.6; nbp.frequency.value = 700
  const ng = c.createGain(); ng.gain.value = 0
  nsrc.connect(nbp); nbp.connect(ng); ng.connect(out)
  lfo.start(); wob.start(); nsrc.start(0, Math.random()); srcs.push(nsrc)

  const apply = (glide: number) => {
    const t = c.currentTime, tc = Math.max(0.01, glide / 3)
    const ch = AMB[clamp(Math.round(chapterN), 0, AMB.length - 1)]
    const iv = intensity
    slots.forEach((s, i) => {
      const ratio = ch.r[i]
      const f = ch.root * (ratio || 1)
      s.oscs.forEach((o, k) => {
        o.frequency.setTargetAtTime(f, t, tc)
        o.detune.setTargetAtTime((k === 0 ? -1 : 1) * ch.det * (1 + iv * 3), t, tc)
      })
      s.g.gain.setTargetAtTime(ratio ? (0.11 * ch.vol) / (1 + i * 0.16) : 0, t, tc)
    })
    sub.frequency.setTargetAtTime(ch.root, t, tc)
    subG.gain.setTargetAtTime(0.3 * ch.vol, t, tc)
    const cut = ch.cut * (1 + iv * 1.6)
    filt.frequency.setTargetAtTime(cut, t, tc)
    filt.Q.setTargetAtTime(3 + iv * 4, t, tc)
    lfo.frequency.setTargetAtTime(ch.lfo * (1 + iv * 2.5), t, tc)
    lfoG.gain.setTargetAtTime(cut * 0.55, t, tc)
    ng.gain.setTargetAtTime(ch.noise + iv * 0.1, t, tc)
    nbp.frequency.setTargetAtTime(600 + iv * 1800 + (ch.noise > 0.1 ? 600 : 0), t, tc)
    wobG.gain.setTargetAtTime(ch.wob + iv * 35, t, tc)
    wob.frequency.setTargetAtTime(4.5 + iv * 5, t, tc)
  }
  apply(0.05)
  ambApply = apply
  return () => {
    if (ambApply === apply) ambApply = null
    for (const s of srcs) { try { s.stop() } catch { /* */ } }
    safeDisc([...srcs, mix, filt, lfoG, wobG, subG, nbp, ng, ...slots.map((s) => s.g)])
  }
}

/* ---- dramatic: swelling orchestral ostinato ---- */
function buildDramatic(out: GainNode): () => void {
  const step = 60 / 104 / 2
  const CHORDS = [[50, 53, 57, 62, 65, 69], [46, 50, 53, 58, 62, 65], [43, 50, 55, 58, 62, 67], [45, 52, 57, 61, 64, 69]]
  const PAT = [1, 2, 3, 2, 4, 3, 2, 3]
  return runSeq(() => step, (i, t) => {
    const bar = Math.floor(i / 8), s = i % 8, ch = CHORDS[bar % 4], cyc = bar % 16
    const sw = 0.3 + 0.7 * (cyc / 15)
    const f = mtof(ch[PAT[s]] + 12)
    const vel = (0.35 + 0.65 * sw) * (s === 0 ? 1.3 : s % 2 ? 0.75 : 1)
    for (const d of [-9, 9]) {
      tone({ type: 'sawtooth', f, t, dur: step * 1.05, vol: 0.05 * vel, a: 0.012, det: d, lp: 1100 + 2200 * sw, q: 1.2, dest: out, pri: true })
    }
    if (s === 0) {
      tone({ type: 'sawtooth', f: mtof(ch[0] - 12), t, dur: step * 8, vol: 0.12, a: 0.1, sus: true, rel: 0.3, lp: 480, dest: out, pri: true })
      tone({ type: 'sine', f: mtof(ch[0] - 12), t, dur: step * 8, vol: 0.2, a: 0.1, sus: true, rel: 0.3, dest: out, pri: true })
      if (bar % 2 === 0) {
        const m = mixer(t, step * 16, { lp: 700, lp2: 2600, lpT: 0.9, q: 1, dest: out })
        for (const n of [ch[2], ch[3], ch[4]]) for (const d of [-10, 10]) {
          tone({ type: 'sawtooth', f: mtof(n), t, dur: step * 16, vol: 0.04 * (0.4 + sw), a: 1.4, sus: true, rel: 0.6, det: d, dest: m, pri: true })
        }
      }
    }
    if (s === 0 || s === 4 || (s === 6 && sw > 0.65)) timp(t, (0.12 + 0.35 * sw) * (s === 0 ? 1.15 : 0.8), out, true)
    if (s === 0 && cyc === 0 && bar > 0) metal(t, 2.2, 0.22, out)
    if (s === 0 && cyc === 15) noise({ t, dur: step * 8, vol: 0.14, a: step * 7.5, sus: true, rel: 0.05, ftype: 'bandpass', f: 800, f2: 7000, q: 0.7, dest: out, pri: true })
  })
}

/* ---- fever: corporate muzak, souring with intensity ---- */
function buildFever(out: GainNode): () => void {
  const c = ctx!
  const wob = c.createOscillator(); wob.frequency.value = 5.2
  const wg = c.createGain(); wg.gain.value = 0
  wob.connect(wg); wob.start()
  const base = 60 / 92 / 2
  const CHORDS = [[60, 64, 67, 71, 74], [57, 60, 64, 67, 71], [62, 65, 69, 72, 76], [55, 59, 65, 69, 76]]
  const BASS = [36, 33, 38, 31]
  const HITS = new Set([0, 3, 6, 8, 11])
  const stopSeq = runSeq(
    (i) => base * (1 + intensity * 0.09 * Math.sin(i * 0.11)) * (i % 2 === 0 ? 1.1 : 0.9),   // swing + wobbly tempo
    (i, t0) => {
      const iv = intensity
      const ci = Math.floor(i / 16) % 4, s = i % 16
      const ch = CHORDS[ci]
      const t = t0
      wg.gain.setTargetAtTime(iv * 45, c.currentTime, 0.2)
      if (HITS.has(s) && Math.random() > iv * 0.18) {
        const reps = iv > 0.5 && Math.random() < (iv - 0.5) * 0.6 ? 3 : 1
        const sour = Math.random() < iv * 0.45 ? Math.floor(Math.random() * ch.length) : -1
        for (let r = 0; r < reps; r++) {
          ch.forEach((n, k) => {
            const f = mtof(n + (k === sour ? 1 : 0))
            const tt = t + k * 0.012 + r * 0.07
            const dt = (Math.random() - 0.5) * 2 * iv * 90
            tone({ type: 'sine', f, t: tt, dur: 1.15, vol: 0.05, a: 0.004, det: dt, detNode: wg, am: { rate: 5, depth: 0.35 }, lp: 3000, dest: out, pri: true })
            tone({ type: 'triangle', f: f * 2, t: tt, dur: 0.3, vol: 0.016, a: 0.002, det: dt, dest: out, pri: true })
          })
        }
      }
      if (s % 4 === 0) {
        const root = BASS[ci] + (s === 8 ? 7 : s === 12 ? 12 : 0) + (iv > 0.6 && Math.random() < iv * 0.4 ? 6 : 0)
        tone({ type: 'sine', f: mtof(root), t, dur: 0.45, vol: 0.2, a: 0.01, det: (Math.random() - 0.5) * iv * 60, dest: out, pri: true })
        tone({ type: 'triangle', f: mtof(root), t, dur: 0.3, vol: 0.05, a: 0.01, lp: 700, dest: out, pri: true })
      }
      if (s === 0 || s === 8) tone({ f: 100, f2: 50, t, dur: 0.2, vol: 0.2, glide: 0.6, dest: out, pri: true })
      noise({ t, dur: 0.045, vol: s % 2 ? 0.03 : 0.045, ftype: 'highpass', f: 7000, dest: out, pri: true })
      if (s % 4 === 2 && Math.random() < 0.3 + iv * 0.2) {
        const n = ch[Math.floor(Math.random() * ch.length)] + 12
        const f = mtof(n)
        tone({ type: 'sine', f, f2: f * (1 - iv * 0.12), t, dur: 0.5, vol: 0.04, a: 0.005, detNode: wg, dest: out, pri: true })
      }
      if (iv > 0.7 && Math.random() < (iv - 0.7) * 0.5) noise({ t, dur: 0.03, vol: 0.06, ftype: 'highpass', f: 2000, ws: CV.crush, dest: out, pri: true })
    },
  )
  return () => { stopSeq(); try { wob.stop() } catch { /* */ } safeDisc([wob, wg]) }
}

/* ---- boss: ~140bpm minor-key driver ---- */
function kick(t: number, dest: AudioNode, vol = 0.85) {
  tone({ f: 165, f2: 42, t, dur: 0.3, vol, glide: 0.45, a: 0.001, dest, pri: true })
  noise({ t, dur: 0.012, vol: vol * 0.25, ftype: 'highpass', f: 2200, dest, pri: true })
}
function snare(t: number, dest: AudioNode, vol = 0.32) {
  noise({ t, dur: 0.17, vol, ftype: 'bandpass', f: 2200, q: 0.7, dest, pri: true })
  tone({ type: 'triangle', f: 210, f2: 120, t, dur: 0.1, vol: vol * 0.9, glide: 0.8, dest, pri: true })
}
function buildBoss(out: GainNode): () => void {
  const step = 60 / 140 / 4
  const ROOT = [33, 29, 31, 28]
  const ARP = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 56, 59, 64]]
  const RIFF = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1]
  const AP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 3, 2, 1, 2]
  return runSeq(() => step, (i, t) => {
    const bar = Math.floor(i / 16), s = i % 16, ch = bar % 4, tier = Math.min(2, Math.floor(bar / 4))
    const fill = bar % 4 === 3 && s >= 12
    if (s % 4 === 0 || (s === 10 && bar % 2 === 1) || (s === 14 && bar % 4 === 3 && !fill)) kick(t, out)
    if (s === 4 || s === 12 || fill) snare(t, out, fill ? 0.2 + (s - 12) * 0.05 : 0.32)
    if (s % 2 === 0) noise({ t, dur: s % 8 === 6 ? 0.12 : 0.035, vol: s % 8 === 6 ? 0.12 : 0.09, ftype: 'highpass', f: 7500, dest: out, pri: true })
    else if (tier > 0) noise({ t, dur: 0.02, vol: 0.04, ftype: 'highpass', f: 8000, dest: out, pri: true })
    if (RIFF[s]) {
      const m = ROOT[ch] + (s === 8 || s === 13 ? 12 : 0)
      tone({ type: 'sawtooth', f: mtof(m), t, dur: step * 0.95, vol: 0.2, a: 0.003, lp: 1100, lp2: 220, q: 5, lpT: 0.9, dest: out, pri: true })
      tone({ f: mtof(m), t, dur: step * 0.95, vol: 0.22, a: 0.003, dest: out, pri: true })
    }
    const an = ARP[ch][AP[s]] + (tier > 0 && s % 8 >= 4 ? 12 : 0)
    tone({ type: tier > 1 ? 'sawtooth' : 'square', f: mtof(an), t, dur: step * 0.9, vol: 0.035 + (s % 4 === 0 ? 0.015 : 0), a: 0.003, lp: 2600, lp2: 900, lpT: 0.9, q: 3, dest: out, pri: true })
    if (s === 0 && bar % 8 === 0) metal(t, 1.4, 0.2, out)
    if (s === 0 && tier > 0 && bar % 2 === 0) {
      const m = mixer(t, step * 32, { lp: 600, lp2: 1800, lpT: 0.9, dest: out })
      for (const n of ARP[ch].slice(0, 3)) tone({ type: 'sawtooth', f: mtof(n - 12), t, dur: step * 32, vol: 0.03, a: 0.4, sus: true, rel: 0.2, det: 10, dest: m, pri: true })
    }
  })
}

/* ---- final: resolved chord bed ---- */
function buildFinal(out: GainNode): () => void {
  const CH = [[53, 57, 60, 64, 67], [52, 55, 60, 64, 67], [50, 57, 60, 64, 65], [46, 53, 57, 60, 65]]
  return runSeq(() => 0.5, (i, t) => {
    const ci = Math.floor(i / 16) % 4, s = i % 16, ch = CH[ci]
    if (s === 0) {
      const m = mixer(t, 8.6, { lp: 1300, q: 0.8, dest: out })
      for (const n of ch) for (const d of [-6, 6]) {
        tone({ type: 'triangle', f: mtof(n), t, dur: 8.6, vol: 0.05, a: 2.2, sus: true, rel: 2, det: d, dest: m, pri: true })
      }
      tone({ f: mtof(ch[0] - 12), t, dur: 8.6, vol: 0.18, a: 1.5, sus: true, rel: 2, dest: out, pri: true })
      tone({ type: 'sawtooth', f: mtof(ch[2]), t, dur: 8.6, vol: 0.018, a: 3, sus: true, rel: 2, lp: 900, dest: out, pri: true })
    }
    if (s % 2 === 0 && Math.random() < 0.65) {
      const n = ch[(s / 2 + (i % 3)) % ch.length] + 12
      tone({ f: mtof(n), t, dur: 1.8, vol: 0.04, a: 0.004, dest: out, pri: true })
      tone({ f: mtof(n) * 2.76, t, dur: 0.6, vol: 0.01, a: 0.002, dest: out, pri: true })
    }
  })
}

const TRACKS: Record<Exclude<TrackName, 'none'>, { build: (o: GainNode) => () => void; trim: number }> = {
  ambient: { build: buildAmbient, trim: 1 },
  dramatic: { build: buildDramatic, trim: 0.9 },
  fever: { build: buildFever, trim: 0.9 },
  boss: { build: buildBoss, trim: 0.75 },
  final: { build: buildFinal, trim: 0.9 },
}

function killTrack(tr: Track) {
  dying.delete(tr)
  try { tr.kill() } catch { /* */ }
  try { tr.out.gain.cancelScheduledValues(0); tr.out.gain.value = 0; tr.out.disconnect() } catch { /* */ }
}
function fadeOut(tr: Track, fade: number) {
  const c = ctx; if (!c) return
  try {
    tr.out.gain.cancelScheduledValues(c.currentTime)
    tr.out.gain.setTargetAtTime(0, c.currentTime, Math.max(0.01, fade / 3.5))
  } catch { /* */ }
  dying.add(tr)
  window.setTimeout(() => { if (dying.has(tr)) killTrack(tr) }, fade * 1000 + 350)
}
function ungate() {
  const c = ctx; if (!c || !cutState) return
  cutState = false
  const t = c.currentTime
  for (const g of [gateMusic, gateAmb]) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(1, t) }
}

function playTrack(track: TrackName, o?: { fade?: number }) {
  try {
    wantTrack = track
    const c = ctx
    if (!c || !sget().enabled) return
    ungate()
    if (cur && cur.name === track) return
    const fade = Math.max(0.02, o?.fade ?? (track === 'ambient' ? 3 : 1.2))
    if (cur) { fadeOut(cur, fade); cur = null }
    if (track === 'none') return
    const spec = TRACKS[track]
    const out = c.createGain(); out.gain.value = 0.0001
    out.connect(track === 'ambient' ? busAmb : busMusic)
    const kill = spec.build(out)
    out.gain.setTargetAtTime(spec.trim, c.currentTime, Math.max(0.01, fade / 3))
    cur = { name: track, out, kill }
  } catch { /* never throw */ }
}

function cutMusic() {
  try {
    wantTrack = 'none'
    const c = ctx; if (!c) return
    const t = c.currentTime
    cutState = true
    for (const g of [gateMusic, gateAmb]) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t) }
    if (cur) { const k = cur; cur = null; killTrack(k) }
    for (const d of Array.from(dying)) killTrack(d)
  } catch { /* */ }
}
function resumeMusic() {
  try {
    const c = ctx; if (!c) return
    const t = c.currentTime
    cutState = false
    for (const g of [gateMusic, gateAmb]) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(1, t, 0.04) }
    playTrack('ambient', { fade: 2 })
  } catch { /* */ }
}
function swell(sec = 3) {
  try {
    const c = ctx; if (!c || !sget().enabled || sget().muted) return
    const s = clamp(sec, 0.5, 12)
    riser(c.currentTime + 0.02, s, 0.9, busMusic, true)
  } catch { /* */ }
}

/* ------------------------------- VOICE ------------------------------- */
const PRESET: Record<VoiceName, { pitch: number; rate: number }> = {
  ai: { pitch: 0.55, rate: 0.82 }, announcer: { pitch: 0.6, rate: 0.92 }, corporate: { pitch: 1, rate: 1.05 },
  arlo: { pitch: 0.85, rate: 0.95 }, mom: { pitch: 1.5, rate: 1 }, recruiter: { pitch: 1.25, rate: 1.3 }, robot: { pitch: 0.4, rate: 0.75 },
}
const WHO: Record<VoiceName, string> = {
  ai: 'THE SITE', announcer: 'ANNOUNCER', corporate: 'VEXXITY HR', arlo: 'ARLO', mom: 'MOM', recruiter: 'RECRUITER', robot: 'UNIT 47',
}
const FEMALE: Record<VoiceName, boolean> = { ai: false, announcer: false, corporate: true, arlo: false, mom: true, recruiter: true, robot: false }
const MALE_RE = /david|daniel|alex\b|fred|mark|guy|ryan|james|george|thomas|oliver|rishi|aaron|arthur|\bmale\b|brian|liam|davis|eric/i
const FEM_RE = /zira|samantha|karen|susan|hazel|jenny|aria|female|victoria|moira|tessa|libby|sonia|serena|catherine|emma|ava|michelle|natasha/i
const ROBOT_RE = /fred|zarvox|robot|trinoids|albert|junior|ralph|whisper|bad news/i

let vcache: Record<string, SpeechSynthesisVoice | null> = {}
let vcount = -1
function synthOK(): SpeechSynthesis | null {
  try { return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null } catch { return null }
}
function pickVoice(profile: VoiceName): SpeechSynthesisVoice | null {
  const s = synthOK(); if (!s) return null
  const list = s.getVoices()
  if (list.length !== vcount) { vcount = list.length; vcache = {} }
  if (profile in vcache) return vcache[profile]
  if (!list.length) return null
  const en = list.filter((v) => /^en([-_]|$)/i.test(v.lang))
  const pool = en.length ? en : list
  const fem = FEMALE[profile]
  let best: SpeechSynthesisVoice | null = null, bs = -1e9
  for (const v of pool) {
    let sc = 0
    const lang = v.lang.replace('_', '-').toLowerCase()
    if (lang === 'en-us') sc += 3; else if (lang === 'en-gb') sc += 2.5; else if (lang.startsWith('en')) sc += 1
    if (fem ? FEM_RE.test(v.name) : MALE_RE.test(v.name)) sc += 4
    if (fem ? MALE_RE.test(v.name) : FEM_RE.test(v.name)) sc -= 4
    if (profile === 'robot' && ROBOT_RE.test(v.name)) sc += 5
    if (v.localService) sc += 0.5
    if (/natural|neural|online/i.test(v.name)) sc += 0.3
    if (sc > bs) { bs = sc; best = v }
  }
  vcache[profile] = best
  return best
}
try {
  const s = synthOK()
  if (s && s.addEventListener) s.addEventListener('voiceschanged', () => { vcount = -1; vcache = {} })
} catch { /* */ }

const pending = new Set<() => void>()
let speakingN = 0

function stopVoice() {
  try { synthOK()?.cancel() } catch { /* */ }
  for (const f of Array.from(pending)) { try { f() } catch { /* */ } }
}

function say(text: string, o?: SayOpts): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      const profile: VoiceName = o?.voice ?? 'ai'
      const pre = PRESET[profile] ?? PRESET.ai
      const pitch = o?.pitch ?? pre.pitch
      const rate = o?.rate ?? pre.rate
      const estMs = Math.max(700, text.length * 60) / Math.max(0.3, rate)
      const a = sget()
      const synth = synthOK()
      const vol = clamp(a.voice * a.master)
      const audible = !!synth && a.enabled && !a.muted && vol > 0.01

      if (o?.sub !== false) {
        const who = typeof o?.sub === 'string' ? o.sub : WHO[profile]
        fx.subtitle(text, who, clamp(estMs + 900, 2200, 14000))
      }
      if (!audible || !synth) {
        if (!o?.queue) stopVoice()
        const id = window.setTimeout(() => { pending.delete(fin); resolve() }, estMs)
        const fin = () => { window.clearTimeout(id); pending.delete(fin); resolve() }
        pending.add(fin)
        return
      }
      if (!o?.queue) stopVoice()
      try { if (synth.paused) synth.resume() } catch { /* */ }

      const u = new SpeechSynthesisUtterance(text)
      const v = pickVoice(profile)
      if (v) { u.voice = v; u.lang = v.lang } else u.lang = 'en-US'
      u.pitch = clamp(pitch, 0, 2)
      u.rate = clamp(rate, 0.1, 10)
      u.volume = vol
      let done = false, started = false
      let guard = 0, watch = 0
      const fin = () => {
        if (done) return
        done = true
        window.clearTimeout(guard); window.clearTimeout(watch)
        pending.delete(fin)
        speakingN = Math.max(0, speakingN - 1)
        resolve()
      }
      pending.add(fin)
      speakingN++
      u.onstart = () => { started = true }
      u.onend = fin
      u.onerror = fin
      guard = window.setTimeout(fin, estMs * 2.2 + 3500)
      if (!o?.queue) {
        // TTS blocked (no gesture / no voices): fall back to estimated duration
        watch = window.setTimeout(() => {
          if (!started && !done) { try { synth.cancel() } catch { /* */ } window.setTimeout(fin, estMs) }
        }, 2200)
      }
      synth.speak(u)
    } catch { resolve() }
  })
}

/* ------------------------------- LEVEL ------------------------------- */
const tdBuf = new Float32Array(512)
let lvSm = 0, lvAt = 0
function level(): number {
  try {
    const n = performance.now()
    if (n - lvAt < 8) return lvSm
    lvAt = n
    let target = 0
    if (ctx && analyser && ctx.state === 'running') {
      analyser.getFloatTimeDomainData(tdBuf)
      let sum = 0
      for (let i = 0; i < tdBuf.length; i++) sum += tdBuf[i] * tdBuf[i]
      target = clamp(Math.sqrt(sum / tdBuf.length) * 3.4)
    }
    if (speakingN > 0 && !sget().muted) target = Math.max(target, 0.16 + Math.random() * 0.26)   // TTS bypasses WebAudio; fake mouth-flap
    lvSm += (target - lvSm) * (target > lvSm ? 0.55 : 0.13)
    return clamp(lvSm)
  } catch { return 0 }
}

/* -------------------------------- API -------------------------------- */
function init() {
  try {
    if (!ctx) build()
    const c = ctx
    if (c && c.state !== 'running') c.resume().catch(() => { /* */ })
    if (!sget().enabled) useStore.getState().setAudio({ enabled: true })
    applySettings(sget())
    // unlock speech synthesis inside the gesture (iOS/Safari), then warm the voice list
    const s = synthOK()
    if (s) {
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; s.speak(u) } catch { /* */ }
      try { s.getVoices() } catch { /* */ }
    }
    if (c && !(c as unknown as { __wired?: boolean }).__wired) {
      ;(c as unknown as { __wired?: boolean }).__wired = true
      const wake = () => { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => { /* */ }) }
      for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, wake, { passive: true })
      document.addEventListener('visibilitychange', wake)
    }
    if (c && !cur && !cutState) playTrack(wantTrack ?? 'ambient')
  } catch { /* never throw */ }
}

try {
  useStore.subscribe((s, p) => { if (s.audio !== p.audio) applySettings(s.audio) })
} catch { /* */ }

export const audio = {
  init,
  sfx,
  music: {
    play: playTrack,
    cut: cutMusic,
    resume: resumeMusic,
    swell,
  },
  say,
  setChapter(n: number) {
    try { chapterN = clamp(Math.round(n), 0, 6); ambApply?.(2.8) } catch { /* */ }
  },
  setIntensity(v: number) {
    try { intensity = clamp(v); ambApply?.(0.8) } catch { /* */ }
  },
  level,
  stopVoice,
}

export default audio
