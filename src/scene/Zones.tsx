import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { textTexture, loadFonts } from './textures'
import { S, ZONE, FLOOR_Y } from './sceneState'
import { scrollState, useStore } from '../state/store'
import { ACHIEVEMENTS } from '../content/copy'

const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const dummy = new THREE.Object3D()

function useVisible(ref: React.RefObject<THREE.Object3D | null>, lo: number, hi: number) {
  useFrame(() => { if (ref.current) ref.current.visible = scrollState.pos > lo && scrollState.pos < hi })
}

/* ---------------- 02 THE LEGEND: monolith corridor with achievement plaques ---------------- */
function Legend() {
  const g = useRef<THREE.Group>(null)
  useVisible(g, -1, 2.8)
  const items = useMemo(() => ACHIEVEMENTS.slice(0, 8).map((a, i) => {
    const left = i % 2 === 0
    return {
      x: (left ? -1 : 1) * (4.6 + (i % 3) * 0.5), z: -10 - i * 3.4, h: 5 + (i % 4) * 0.9, left,
      tex: textTexture([
        { t: a.year, size: 34, font: 'mono', color: '#d4a84a', gap: 18 },
        { t: a.title, size: 82, italic: true, color: '#ece4d2' },
      ], 768, 480, { pad: 44 }),
    }
  }), [])
  const refs = useRef<THREE.Group[]>([])
  useFrame(() => {
    const pos = scrollState.pos
    items.forEach((it, i) => {
      const gr = refs.current[i]; if (!gr) return
      const rise = sm(0.6 + i * 0.07, 1.0 + i * 0.07, pos)
      gr.scale.y = Math.max(0.001, rise)
      gr.position.y = FLOOR_Y + (it.h * rise) / 2
      gr.rotation.y = (it.left ? 0.25 : -0.25) + Math.sin(S.t * 0.3 + i) * 0.02
    })
  })
  return (
    <group ref={g}>
      {items.map((it, i) => (
        <group key={i} ref={(r) => { if (r) refs.current[i] = r }} position={[it.x, FLOOR_Y, it.z]}>
          <mesh>
            <boxGeometry args={[2.8, it.h, 0.45]} />
            <meshStandardMaterial color="#14110e" metalness={0.92} roughness={0.22} envMapIntensity={0.9} />
          </mesh>
          <mesh position={[0, it.h * 0.08, 0.24]}>
            <planeGeometry args={[2.6, 1.62]} />
            <meshBasicMaterial map={it.tex} transparent toneMapped={false} />
          </mesh>
          <mesh position={[0, -it.h / 2 + 0.02, 0.24]}>
            <planeGeometry args={[2.6, 0.02]} />
            <meshBasicMaterial color="#ff4b1f" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ---------------- 03 THE INTERROGATION: scanner cone + doubts ---------------- */
const CLAIMS = ['FLUENT IN 17 LANGUAGES?', 'EXPERT IN EVERYTHING?', '"VISIONARY" — SOURCE?', 'REVENUE: $0.00', 'CERTIFIED BY WHOM?', '3 TUTORIALS ≠ 17 LANGUAGES', 'EVIDENCE: PENDING', 'DEFINE "SENIOR"']
function Interro() {
  const g = useRef<THREE.Group>(null)
  useVisible(g, 1.4, 3.6)
  const cone = useRef<THREE.Mesh>(null)
  const tags = useMemo(() => CLAIMS.map((c, i) => ({
    tex: textTexture([{ t: c, size: 54, font: 'mono', weight: 700, color: i % 3 === 0 ? '#ff4b1f' : '#ece4d2' }], 1024, 128, { bg: 'rgba(11,9,7,0.85)', border: '#a79f8b', align: 'center' }),
    a: (i / CLAIMS.length) * Math.PI * 2, r: 5 + (i % 3) * 1.3, y: 0.4 + (i % 4) * 1.1,
  })), [])
  const tr = useRef<THREE.Mesh[]>([])
  useFrame(() => {
    const k = sm(1.5, 2.1, scrollState.pos) * (1 - sm(3.0, 3.5, scrollState.pos))
    tags.forEach((t, i) => {
      const m = tr.current[i]; if (!m) return
      const a = t.a + S.t * 0.12
      m.position.set(ZONE.interro.x + Math.cos(a) * t.r, ZONE.interro.y + t.y - 1.5 + Math.sin(S.t * 0.7 + i) * 0.2, ZONE.interro.z + Math.sin(a) * t.r)
      m.lookAt(S.camPos); m.scale.setScalar(k)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.45 * (Math.sin(S.t * 5 + i * 3) > -0.8 ? 1 : 0.2)
    })
    if (cone.current) { (cone.current.material as THREE.MeshBasicMaterial).opacity = (0.05 + S.level * 0.1) * k; (cone.current.material as THREE.MeshBasicMaterial).color.copy(S.C) }
  })
  return (
    <group ref={g}>
      <mesh ref={cone} position={[ZONE.interro.x, 5.4, ZONE.interro.z]} rotation-x={Math.PI}>
        <coneGeometry args={[4.6, 17, 56, 1, true]} />
        <meshBasicMaterial transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {tags.map((t, i) => (
        <mesh key={i} ref={(r) => { if (r) tr.current[i] = r }}>
          <planeGeometry args={[3.4, 0.43]} />
          <meshBasicMaterial map={t.tex} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------------- 04 FEVER DREAM: tumbling cubes, buzzwords, dead dialogs ---------------- */
const WORDS = ['SYNERGY', 'DISRUPT', 'LEVERAGE', 'PIVOT', 'ALIGN', 'CIRCLE BACK', 'BANDWIDTH', '10X', 'UNICORN', 'LEARNINGS']
function Fever() {
  const g = useRef<THREE.Group>(null)
  useVisible(g, 2.4, 4.9)
  const inst = useRef<THREE.InstancedMesh>(null)
  const N = 110
  const data = useMemo(() => Array.from({ length: N }, () => ({
    p: new THREE.Vector3(rnd(-16, 16), rnd(-2, 9), rnd(-16, 16)), r: new THREE.Vector3(rnd(0, 6), rnd(0, 6), rnd(0, 6)), s: rnd(0.25, 1.1), v: rnd(0.2, 1.2), ph: rnd(0, 6),
  })), [])
  const colors = useMemo(() => [new THREE.Color('#cfff2e'), new THREE.Color('#ff4b1f'), new THREE.Color('#ece4d2'), new THREE.Color('#14110e')], [])
  const words = useMemo(() => WORDS.map((w) => textTexture([{ t: w, size: 150, font: 'mono', weight: 700, color: '#cfff2e' }], 1024, 256, { align: 'center' })), [])
  const dialogs = useMemo(() => [0, 1, 2, 3].map((i) => textTexture([
    { t: ['Synergy.exe', 'Vision.dll', 'Tab47.exe', 'Ego.sys'][i], size: 34, font: 'mono', weight: 700, color: '#ffffff', gap: 22 },
    { t: ['has stopped working', 'is not a valid win32 vibe', 'cannot be closed', 'is at 100% (unrelated)'][i], size: 40, font: 'mono', color: '#000000' },
  ], 640, 280, { bg: '#c0c0c0', border: '#ff4b1f', pad: 30 })), [])
  const wr = useRef<THREE.Mesh[]>([]); const dr = useRef<THREE.Mesh[]>([])
  useFrame(() => {
    const m = inst.current; if (!m) return
    const k = sm(2.6, 3.2, scrollState.pos) * (1 - sm(4.2, 4.7, scrollState.pos))
    const c = scrollState.chaos
    for (let i = 0; i < N; i++) {
      const d = data[i]
      dummy.position.set(ZONE.fever.x + d.p.x + Math.sin(S.t * d.v + d.ph) * 1.2, ZONE.fever.y + d.p.y + Math.cos(S.t * d.v * 0.8 + d.ph) * 0.9, ZONE.fever.z + d.p.z)
      dummy.rotation.set(d.r.x + S.t * 0.3 * d.v, d.r.y + S.t * 0.25, d.r.z)
      dummy.scale.setScalar(d.s * k * (1 + (Math.sin(S.t * 8 + i) > 0.97 ? 0.8 * c : 0)))
      dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
      const flick = Math.sin(S.t * (2 + d.v * 6) + i) > 0.6 ? 0 : 1
      m.setColorAt(i, colors[(i + (flick ? 0 : 1) + Math.floor(S.t * 0.7)) % 4 === 3 ? 3 : (i + flick) % 3])
    }
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
    words.forEach((_, i) => {
      const w = wr.current[i]; if (!w) return
      const a = (i / WORDS.length) * Math.PI * 2 + S.t * 0.07
      w.position.set(ZONE.fever.x + Math.cos(a) * 11, ZONE.fever.y + 2.5 + Math.sin(S.t * 0.5 + i * 2) * 1.8, ZONE.fever.z + Math.sin(a) * 11)
      w.lookAt(S.camPos); w.scale.setScalar(k * (1 + Math.sin(S.t * 3 + i) * 0.04 * c))
      w.visible = Math.sin(S.t * 2 + i * 5) > -0.9
    })
    dialogs.forEach((_, i) => {
      const w = dr.current[i]; if (!w) return
      const a = (i / 4) * Math.PI * 2 + S.t * 0.1 + 0.6
      w.position.set(ZONE.fever.x + Math.cos(a) * 7.5, ZONE.fever.y + 0.4 + Math.sin(S.t + i) * 0.8, ZONE.fever.z + Math.sin(a) * 7.5)
      w.rotation.y = -a + Math.PI / 2 + Math.sin(S.t * 0.6 + i) * 0.4; w.rotation.z = Math.sin(S.t * 0.9 + i) * 0.15
      w.scale.setScalar(k)
    })
  })
  return (
    <group ref={g}>
      <instancedMesh ref={inst} args={[undefined, undefined, N]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.7} roughness={0.25} flatShading />
      </instancedMesh>
      {words.map((t, i) => (
        <mesh key={i} ref={(r) => { if (r) wr.current[i] = r }}>
          <planeGeometry args={[6, 1.5]} />
          <meshBasicMaterial map={t} transparent toneMapped={false} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {dialogs.map((t, i) => (
        <mesh key={'d' + i} ref={(r) => { if (r) dr.current[i] = r }}>
          <planeGeometry args={[3.6, 1.575]} />
          <meshBasicMaterial map={t} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------------- 05 BOSS ARENA ---------------- */
function Arena() {
  const g = useRef<THREE.Group>(null)
  useVisible(g, 3.3, 5.3)
  const N = 28
  const refs = useRef<THREE.Mesh[]>([])
  const ring = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const k = sm(3.5, 4.1, scrollState.pos) * (1 - sm(4.8, 5.2, scrollState.pos))
    const ego = useStore.getState().ego / 100
    for (let i = 0; i < N; i++) {
      const m = refs.current[i]; if (!m) continue
      const a = (i / N) * Math.PI * 2 + S.t * 0.05
      const R = 10.5 + ego * 3
      const beat = 0.5 + 0.5 * Math.sin(S.t * 4 + i * 0.7)
      const h = (2.5 + beat * 3.5 + S.level * 4 + scrollState.bossHit * 3) * k
      m.position.set(ZONE.boss.x + Math.cos(a) * R, FLOOR_Y + h / 2, ZONE.boss.z + Math.sin(a) * R)
      m.scale.set(1, Math.max(0.001, h), 1)
    }
    if (ring.current) { ring.current.position.set(ZONE.boss.x, FLOOR_Y + 0.05, ZONE.boss.z); ring.current.scale.setScalar(k * (1 + ego * 0.3)); ring.current.rotation.z = S.t * 0.1 }
  })
  return (
    <group ref={g}>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} ref={(r) => { if (r) refs.current[i] = r }}>
          <boxGeometry args={[0.22, 1, 0.22]} />
          <meshBasicMaterial color="#ff4b1f" toneMapped={false} />
        </mesh>
      ))}
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[9.8, 10, 128]} />
        <meshBasicMaterial color="#ece4d2" transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------------- 06 CONSEQUENCES: a slow rain of documents ---------------- */
function Papers() {
  const g = useRef<THREE.Group>(null)
  useVisible(g, 4.6, 6.4)
  const inst = useRef<THREE.InstancedMesh>(null)
  const N = 160
  const data = useMemo(() => Array.from({ length: N }, () => ({ x: rnd(-14, 14), y: rnd(0, 18), z: rnd(-14, 14), v: rnd(0.4, 1.1), r: rnd(0, 6), s: rnd(0.3, 0.7) })), [])
  useFrame(() => {
    const m = inst.current; if (!m) return
    const k = sm(4.9, 5.4, scrollState.pos) * (1 - sm(5.8, 6.3, scrollState.pos))
    for (let i = 0; i < N; i++) {
      const d = data[i]
      const y = 11 - ((d.y + S.t * d.v) % 18)
      dummy.position.set(ZONE.conseq.x + d.x + Math.sin(S.t * 0.7 + d.r) * 1.2, y - 3, ZONE.conseq.z + d.z)
      dummy.rotation.set(S.t * 0.6 * d.v + d.r, S.t * 0.4 + d.r, d.r)
      dummy.scale.set(d.s * k, d.s * 1.3 * k, 1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <group ref={g}>
      <instancedMesh ref={inst} args={[undefined, undefined, N]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#a79f8b" side={THREE.DoubleSide} transparent opacity={0.55} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

export default function Zones() {
  const [ready, setReady] = useState(false)
  useEffect(() => { loadFonts().then(() => setReady(true)) }, [])
  useThree()
  if (!ready) return null
  return (<><Legend /><Interro /><Fever /><Arena /><Papers /></>)
}
