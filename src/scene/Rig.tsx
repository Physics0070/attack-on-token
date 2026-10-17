import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { KEYS, S, FINAL_FORMS } from './sceneState'
import { scrollState, useStore } from '../state/store'
import { audio } from '../audio/engine'

const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const v = (a: [number, number, number]) => new THREE.Vector3(a[0], a[1], a[2])
const KC = KEYS.map((k) => ({ cam: v(k.cam), look: v(k.look), core: v(k.core), drift: v(k.drift) }))
const N = KEYS.length
const cols = KEYS.map((k) => ({ A: new THREE.Color(k.A), B: new THREE.Color(k.B), C: new THREE.Color(k.C), f: new THREE.Color(k.floor) }))

const tA = new THREE.Vector3(), tB = new THREE.Vector3(), cam = new THREE.Vector3(), look = new THREE.Vector3(), core = new THREE.Vector3()
const lookS = new THREE.Vector3()
let inited = false
let lastChapter = -1

function sample(pos: number, kind: 'cam' | 'look' | 'core', out: THREE.Vector3) {
  const g = pos - 0.5
  let i = Math.floor(g)
  if (i < 0) i = -1
  const loc = (k: number) => Math.min(0.5, Math.max(-0.5, pos - k - 0.5))
  const at = (k: number, o: THREE.Vector3) => {
    const kc = KC[k]
    o.copy(kc[kind])
    if (kind !== 'look') o.addScaledVector(kc.drift, loc(k))
    else o.addScaledVector(kc.drift, loc(k) * 0.9)
    return o
  }
  if (i < 0) return out.copy(at(0, tA))
  if (i >= N - 1) return out.copy(at(N - 1, tA))
  const t = sm(0.12, 0.88, g - i)
  at(i, tA); at(i + 1, tB)
  out.lerpVectors(tA, tB, t)
  if (kind === 'cam') out.x += Math.sin(Math.PI * t) * KEYS[i].arc
  return out
}

function lerpParam(pos: number, f: (k: typeof KEYS[number]) => number) {
  const g = pos - 0.5
  const i = Math.floor(g)
  if (i < 0) return f(KEYS[0])
  if (i >= N - 1) return f(KEYS[N - 1])
  const t = sm(0.12, 0.88, g - i)
  return f(KEYS[i]) * (1 - t) + f(KEYS[i + 1]) * t
}

export default function Rig() {
  const { camera, size } = useThree()
  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const now = performance.now()
    const pos = Math.min(N - 0.001, Math.max(0, scrollState.pos))
    S.t = st.clock.elapsedTime
    const sc = useStore.getState()

    sample(pos, 'cam', cam); sample(pos, 'look', look); sample(pos, 'core', core)
    const aspect = size.width / size.height
    const portrait = aspect < 1
    if (portrait) cam.addScaledVector(look.clone().sub(cam).normalize(), -(1 - aspect) * 5)

    // intro dolly-in after the gate opens
    const intro = sc.started ? 1 : 0
    S.intro = S.intro ?? 0
    S.intro += (intro - S.intro) * (1 - Math.exp(-dt * 0.9))
    cam.z += (1 - S.intro) * 9
    cam.y += (1 - S.intro) * 1.2

    // damped follow = cinematic lag
    if (!inited) { camera.position.copy(cam); lookS.copy(look); inited = true }
    const k = 1 - Math.exp(-dt * 3.2)
    camera.position.lerp(cam, k)
    lookS.lerp(look, 1 - Math.exp(-dt * 4))

    // mouse parallax + fever jitter
    const m = scrollState.mouse
    const right = tA.set(1, 0, 0).applyQuaternion(camera.quaternion)
    const par = 0.55 * (1 - scrollState.chaos * 0.4)
    const pcam = camera.position.clone().addScaledVector(right, m.x * par).addScaledVector(tB.set(0, 1, 0), m.y * par * 0.55)
    if (now < sc.shakeUntil) { pcam.x += (Math.random() - 0.5) * 0.35; pcam.y += (Math.random() - 0.5) * 0.35 }
    const chaos = scrollState.chaos
    if (chaos > 0.5) { pcam.x += Math.sin(S.t * 31) * 0.02 * chaos; pcam.y += Math.cos(S.t * 27) * 0.02 * chaos }
    camera.position.copy(pcam)
    camera.lookAt(lookS)
    const cm = camera as THREE.PerspectiveCamera
    // roll + fov punch with scroll velocity
    camera.rotation.z += Math.sin(S.t * 0.4) * 0.006 + m.x * -0.012 + (now < sc.shakeUntil ? (Math.random() - 0.5) * 0.04 : 0)
    const baseFov = portrait ? 40 + (1 - aspect) * 34 : 40
    const tf = baseFov + Math.min(14, scrollState.vel * 0.35) + scrollState.bossHit * 3
    cm.fov += (tf - cm.fov) * (1 - Math.exp(-dt * 5))
    cm.updateProjectionMatrix()
    S.camPos.copy(camera.position)

    // palette + core parameters
    const g = pos - 0.5
    const i = Math.max(0, Math.min(N - 2, Math.floor(g)))
    const t = g < 0 ? 0 : g >= N - 1 ? 1 : sm(0.12, 0.88, g - i)
    const ia = g >= N - 1 ? N - 1 : i, ib = g >= N - 1 ? N - 1 : i + 1
    S.A.lerpColors(cols[ia].A, cols[ib].A, t); S.B.lerpColors(cols[ia].B, cols[ib].B, t)
    S.C.lerpColors(cols[ia].C, cols[ib].C, t); S.floor.lerpColors(cols[ia].f, cols[ib].f, t)
    S.corePos.copy(core)
    let scale = lerpParam(pos, (kk) => kk.scale)
    S.amp = lerpParam(pos, (kk) => kk.amp); S.spike = lerpParam(pos, (kk) => kk.spike)
    S.iri = lerpParam(pos, (kk) => kk.iri); S.dark = lerpParam(pos, (kk) => kk.dark)
    S.eye = lerpParam(pos, (kk) => kk.eye); S.noise = lerpParam(pos, (kk) => kk.noise); S.tone = lerpParam(pos, (kk) => kk.tone)
    S.poster = pos > 2.8 && pos < 4.0 ? 6 : 0

    // boss: size follows ego, spikes follow ego
    const bossW = sm(3.6, 4.2, pos) * (1 - sm(4.75, 5.3, pos))
    if (bossW > 0) {
      const ego = sc.ego / 100
      scale *= 0.65 + ego * 0.95 + scrollState.bossHit * 0.06
      S.spike += ego * 0.5 * bossW
      S.amp += ego * 0.12 * bossW
    }
    scrollState.bossScale = scale
    // final form
    const fw = sm(5.55, 6.2, pos)
    if (fw > 0) {
      const ff = FINAL_FORMS[sc.ending ?? 'humble'] ?? FINAL_FORMS.humble
      S.A.lerp(new THREE.Color(ff.A), fw); S.B.lerp(new THREE.Color(ff.B), fw); S.C.lerp(new THREE.Color(ff.C), fw)
      S.floor.lerp(new THREE.Color(ff.floor), fw)
      S.amp += (ff.amp - S.amp) * fw; S.spike += (ff.spike - S.spike) * fw
      S.dark += (ff.dark - S.dark) * fw
      scale += (ff.scale - scale) * fw
    }
    S.coreScale += (scale - S.coreScale) * (1 - Math.exp(-dt * 4))
    if (!S.coreScale || Number.isNaN(S.coreScale)) S.coreScale = scale
    S.finalForm = sc.ending ?? 'humble'

    // chaos: chapter baseline + events
    let ct = lerpParam(pos, (kk) => kk.chaos)
    if (now < sc.glitchUntil) ct = Math.min(1, ct + 0.6)
    ct += scrollState.bossHit * 0.25 + (sc.friedMode ? 0.3 : 0) + (sc.godMode ? 0.2 : 0)
    scrollState.chaos += (Math.min(1, ct) - scrollState.chaos) * (1 - Math.exp(-dt * 6))
    scrollState.bossHit *= Math.exp(-dt * 5)
    S.level += (audio.level() - S.level) * 0.3

    const ch = Math.min(N - 1, Math.floor(pos + 0.0001))
    if (ch !== lastChapter) { lastChapter = ch }
  })
  return null
}
