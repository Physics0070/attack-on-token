import * as THREE from 'three'

/** Per-chapter choreography. Camera/look/core keyframes sit at chapter centres; `drift` is a slow push across the chapter. */
export interface Key {
  cam: [number, number, number]; look: [number, number, number]; core: [number, number, number]; scale: number
  drift: [number, number, number]; arc: number
  A: string; B: string; C: string; floor: string
  amp: number; spike: number; iri: number; dark: number; eye: number; poster: number; chaos: number; noise: number; tone: number
}
export const KEYS: Key[] = [
  { cam: [0, 0.3, 8.8], look: [-1.7, 0.1, 0], core: [0, 0, 0], scale: 1.55, drift: [0, 0.2, -2.2], arc: 2,
    A: '#ff4b1f', B: '#d4a84a', C: '#ece4d2', floor: '#ece4d2', amp: 0.2, spike: 0.0, iri: 0.9, dark: 0, eye: 0, poster: 0, chaos: 0.02, noise: 1.1, tone: 1 },
  { cam: [-3.4, 0.9, -6], look: [1.5, 0.6, -16], core: [3.5, 0.4, -17], scale: 1.0, drift: [0, 0, -10], arc: 3,
    A: '#d4a84a', B: '#ff4b1f', C: '#ece4d2', floor: '#d4a84a', amp: 0.17, spike: 0.02, iri: 1.0, dark: 0, eye: 0, poster: 0, chaos: 0.08, noise: 1.3, tone: 1 },
  { cam: [0, 1.8, -38], look: [0, 0.6, -46], core: [0, 1.1, -46], scale: 1.25, drift: [0, 0.4, -3], arc: -3,
    A: '#ece4d2', B: '#d4a84a', C: '#ece4d2', floor: '#ece4d2', amp: 0.08, spike: 0.0, iri: 0.5, dark: 0, eye: 1, poster: 0, chaos: 0.18, noise: 1.0, tone: 0.8 },
  { cam: [5, 1.2, -60], look: [0, 0.3, -70], core: [-1, 0.5, -70], scale: 0.95, drift: [-2, 0, -5], arc: 2,
    A: '#cfff2e', B: '#ff4b1f', C: '#cfff2e', floor: '#cfff2e', amp: 0.34, spike: 0.28, iri: 0.9, dark: 0, eye: 0, poster: 6, chaos: 0.8, noise: 1.8, tone: 1 },
  { cam: [0, 1.4, -88], look: [0, 1.0, -101], core: [0, 1.1, -101], scale: 2.4, drift: [0, 0.2, -1.5], arc: -2,
    A: '#ff4b1f', B: '#ff4b1f', C: '#ece4d2', floor: '#ff4b1f', amp: 0.26, spike: 0.34, iri: 0.8, dark: 0, eye: 0, poster: 0, chaos: 0.45, noise: 1.5, tone: 1 },
  { cam: [0, 0.4, -116], look: [0, 0, -124], core: [0, 0, -124], scale: 0.7, drift: [0, 0, -3], arc: 2,
    A: '#8a8272', B: '#a79f8b', C: '#ece4d2', floor: '#a79f8b', amp: 0.1, spike: 0.0, iri: 0.25, dark: 0.55, eye: 0, poster: 0, chaos: 0.12, noise: 0.9, tone: 0.55 },
  { cam: [0, 0.2, -134], look: [0, 0, -143], core: [0, 0, -143], scale: 1.9, drift: [0, 0, -2], arc: 0,
    A: '#ff4b1f', B: '#d4a84a', C: '#ece4d2', floor: '#d4a84a', amp: 0.2, spike: 0.05, iri: 1.0, dark: 0, eye: 0, poster: 0, chaos: 0.05, noise: 1.2, tone: 1 },
]

export const FLOOR_Y = -3.2
export const ZONE = {
  legend: new THREE.Vector3(0, 0, -22),
  interro: new THREE.Vector3(0, 1.1, -46),
  fever: new THREE.Vector3(-1, 0.5, -70),
  boss: new THREE.Vector3(0, 1.1, -101),
  conseq: new THREE.Vector3(0, 0, -124),
  final: new THREE.Vector3(0, 0, -143),
}

/** Ending-specific final form look. */
export const FINAL_FORMS: Record<string, { A: string; B: string; C: string; amp: number; spike: number; scale: number; dark: number; rings: number; floor: string }> = {
  humble: { A: '#d4a84a', B: '#ece4d2', C: '#ece4d2', amp: 0.06, spike: 0, scale: 1.3, dark: 0, rings: 3, floor: '#d4a84a' },
  blackhole: { A: '#ff4b1f', B: '#d4a84a', C: '#ece4d2', amp: 0.02, spike: 0, scale: 2.1, dark: 0.98, rings: 6, floor: '#ff4b1f' },
  employee: { A: '#a79f8b', B: '#ece4d2', C: '#ece4d2', amp: 0.04, spike: 0, scale: 1.1, dark: 0.3, rings: 0, floor: '#a79f8b' },
  npc: { A: '#8a8272', B: '#8a8272', C: '#ece4d2', amp: 0.0, spike: 0, scale: 1.1, dark: 0.6, rings: 0, floor: '#8a8272' },
  grifter: { A: '#cfff2e', B: '#d4a84a', C: '#ece4d2', amp: 0.3, spike: 0.2, scale: 1.8, dark: 0, rings: 2, floor: '#cfff2e' },
  fraud: { A: '#ff4b1f', B: '#ff4b1f', C: '#ece4d2', amp: 0.35, spike: 0.5, scale: 2.1, dark: 0, rings: 1, floor: '#ff4b1f' },
  chosen: { A: '#ece4d2', B: '#d4a84a', C: '#ece4d2', amp: 0.12, spike: 0.1, scale: 2.0, dark: 0, rings: 5, floor: '#ece4d2' },
}

/** Hot, per-frame computed values (written by <Rig/>, read by every scene component). */
export const S = {
  A: new THREE.Color('#ff4b1f'), B: new THREE.Color('#d4a84a'), C: new THREE.Color('#ece4d2'), floor: new THREE.Color('#ece4d2'),
  corePos: new THREE.Vector3(), coreScale: 1,
  amp: 0.2, spike: 0, iri: 0.9, dark: 0, eye: 0, poster: 0, noise: 1.1, tone: 1,
  camPos: new THREE.Vector3(), t: 0,
  finalForm: 'humble' as string,
  level: 0,
  intro: 0,
}
