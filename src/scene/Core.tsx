import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CORE_VERT, CORE_FRAG } from './shaders'
import { S, FINAL_FORMS } from './sceneState'
import { scrollState, useStore, fx } from '../state/store'
import { bossBus } from '../state/bus'

/** The Ego Core — one liquid-steel body that migrates through the whole story and changes character per chapter. */
export default function Core() {
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: CORE_VERT, fragmentShader: CORE_FRAG,
    uniforms: {
      uTime: { value: 0 }, uAmp: { value: 0.2 }, uSpike: { value: 0 }, uNoise: { value: 1.1 }, uHit: { value: 0 }, uChaos: { value: 0 }, uPulse: { value: 0 },
      uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uColC: { value: new THREE.Color() },
      uIri: { value: 1 }, uPoster: { value: 0 }, uDark: { value: 0 }, uEye: { value: 0 },
    },
  }), [])
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 44), [])
  const ringGeo = useMemo(() => new THREE.TorusGeometry(1, 0.006, 8, 160), [])
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ece4d2', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), [])
  const rings = useMemo(() => Array.from({ length: 6 }, (_, i) => i), [])
  const spin = useRef(0)

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const u = mat.uniforms
    u.uTime.value = S.t
    u.uAmp.value = S.amp; u.uSpike.value = S.spike; u.uNoise.value = S.noise
    u.uHit.value = scrollState.bossHit; u.uChaos.value = scrollState.chaos
    u.uPulse.value = S.level
    u.uColA.value.copy(S.A); u.uColB.value.copy(S.B); u.uColC.value.copy(S.C)
    u.uIri.value = S.iri; u.uPoster.value = S.poster; u.uDark.value = S.dark; u.uEye.value = S.eye
    const g = group.current!
    g.position.copy(S.corePos)
    const m = scrollState.mouse
    g.position.x += m.x * 0.15; g.position.y += m.y * 0.1
    g.position.y += Math.sin(S.t * 0.6) * 0.08
    const sc = S.coreScale * (1 + S.level * 0.05)
    g.scale.setScalar(sc)
    spin.current += dt * (0.12 + scrollState.chaos * 1.6)
    // eye mode tracks the camera; otherwise slow turn
    if (S.eye > 0.5) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), S.camPos.clone().sub(g.position).normalize())
      g.quaternion.slerp(q, 0.08)
    } else {
      g.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2 + m.y * 0.2, spin.current, 0)), 0.1)
    }
    // halo rings (count driven by chapter / final form)
    const h = halo.current!
    const pos = scrollState.pos
    const want = pos > 5.5 ? (FINAL_FORMS[S.finalForm]?.rings ?? 3) : pos > 1.7 && pos < 2.7 ? 3 : pos > 3.6 && pos < 4.7 ? 2 : 0
    h.children.forEach((c, i) => {
      const on = i < want
      c.visible = on
      if (on) {
        c.rotation.x = S.t * (0.15 + i * 0.07) + i; c.rotation.y = S.t * (0.1 - i * 0.05) + i * 0.7
        c.scale.setScalar(1.45 + i * 0.28 + S.level * 0.1)
      }
    })
    ringMat.color.copy(S.C)
  })

  const onDown = (e: any) => {
    if (scrollState.pos > 3.55 && scrollState.pos < 5.05) { e.stopPropagation(); bossBus.hit?.() }
  }

  return (
    <group ref={group}>
      <mesh ref={mesh} geometry={geo} material={mat} onPointerDown={onDown} frustumCulled={false} />
      <group ref={halo}>
        {rings.map((i) => <mesh key={i} geometry={ringGeo} material={ringMat} visible={false} />)}
      </group>
    </group>
  )
}
