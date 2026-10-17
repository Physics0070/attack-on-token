import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOOR_FRAG, FLOOR_VERT, DUST_FRAG, DUST_VERT } from './shaders'
import { FLOOR_Y, S } from './sceneState'
import { scrollState } from '../state/store'

/** Infinite warped grid floor that follows the camera, pulses with the soundtrack. */
export function Floor() {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    extensions: { derivatives: true } as any,
    uniforms: { uColor: { value: new THREE.Color() }, uCenter: { value: new THREE.Vector3() }, uTime: { value: 0 }, uGrid: { value: 2 }, uLevel: { value: 0 }, uChaos: { value: 0 }, uFade: { value: 70 } },
  }), [])
  useFrame(() => {
    const m = ref.current!
    m.position.set(S.camPos.x, FLOOR_Y, S.camPos.z)
    const u = mat.uniforms
    u.uColor.value.copy(S.floor); u.uCenter.value.copy(S.corePos)
    u.uTime.value = S.t; u.uLevel.value = S.level; u.uChaos.value = scrollState.chaos
    u.uGrid.value = scrollState.pos > 2.7 && scrollState.pos < 3.6 ? 1.4 : 2
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} material={mat} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[400, 400, 1, 1]} />
    </mesh>
  )
}

/** Drifting motes through the whole tunnel. */
export function Dust({ count = 6500 }: { count?: number }) {
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3), seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 56
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18
      pos[i * 3 + 2] = 16 - Math.random() * 190
      seed[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: 36 }, uChaos: { value: 0 }, uColor: { value: new THREE.Color() } },
    })
    return { geo, mat }
  }, [count])
  useFrame(() => {
    mat.uniforms.uTime.value = S.t; mat.uniforms.uChaos.value = scrollState.chaos
    mat.uniforms.uColor.value.copy(S.C).lerp(S.A, 0.25)
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

/** Lights that travel with the camera so every zone is lit by the current palette. */
export function Lights() {
  const key = useRef<THREE.PointLight>(null)
  const rim = useRef<THREE.PointLight>(null)
  const dir = useRef<THREE.DirectionalLight>(null)
  useFrame(() => {
    const k = key.current!, r = rim.current!, d = dir.current!
    k.position.copy(S.camPos).add(new THREE.Vector3(-3, 3, 2)); k.color.copy(S.A); k.intensity = 120 * S.tone + S.level * 60
    r.position.copy(S.corePos).add(new THREE.Vector3(4, 1, -3)); r.color.copy(S.B); r.intensity = 90 * S.tone
    d.position.copy(S.camPos).add(new THREE.Vector3(4, 8, 6)); d.target.position.copy(S.corePos); d.target.updateMatrixWorld(); d.color.copy(S.C); d.intensity = 0.9 * S.tone
  })
  return (
    <>
      <ambientLight intensity={0.06} />
      <pointLight ref={key} distance={60} decay={1.6} />
      <pointLight ref={rim} distance={50} decay={1.6} />
      <directionalLight ref={dir} />
    </>
  )
}
