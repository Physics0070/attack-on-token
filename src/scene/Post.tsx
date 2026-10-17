import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { POST_FRAG, POST_VERT } from './shaders'
import { scrollState, useStore } from '../state/store'
import { S } from './sceneState'

/** Bloom + custom grade/chaos pass. Chaos (RGB split, tearing, scanlines) is driven by story + events. */
export default function Post() {
  const { gl, scene, camera, size } = useThree()
  const { composer, bloom, grade } = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, { type: THREE.HalfFloatType, samples: 4 })
    const composer = new EffectComposer(gl, rt)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.5, 0.55, 0.8)
    composer.addPass(bloom)
    const grade = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, uTime: { value: 0 }, uChaos: { value: 0 }, uGlitch: { value: 0 }, uDesat: { value: 0 }, uInvert: { value: 0 },
        uVig: { value: 1 }, uGrain: { value: 0.05 }, uSplit: { value: 0 }, uPoster: { value: 0 },
      },
      vertexShader: POST_VERT, fragmentShader: POST_FRAG,
    })
    composer.addPass(grade)
    return { composer, bloom, grade }
  }, [gl, scene, camera]) // eslint-disable-line

  useEffect(() => {
    const dpr = gl.getPixelRatio()
    composer.setPixelRatio(dpr); composer.setSize(size.width, size.height)
    bloom.strength = size.width < 720 ? 0.35 : 0.5
  }, [composer, size, gl, bloom])
  useEffect(() => () => composer.dispose(), [composer])

  let slow = 0, frames = 0, tAcc = 0
  useFrame((_, dt) => {
    // adaptive quality: if we're consistently slow, drop pixel ratio once or twice
    tAcc += dt; frames++
    if (tAcc > 2) {
      const fps = frames / tAcc; frames = 0; tAcc = 0
      if (fps < 32 && gl.getPixelRatio() > 0.8) { slow++; const np = Math.max(0.75, gl.getPixelRatio() - 0.3); gl.setPixelRatio(np); composer.setPixelRatio(np); composer.setSize(size.width, size.height) }
    }
    const u = grade.uniforms
    const st = useStore.getState()
    const now = performance.now()
    u.uTime.value = S.t
    u.uChaos.value = scrollState.chaos
    u.uGlitch.value = now < st.glitchUntil ? 0.6 + Math.random() * 0.4 : 0
    const p = scrollState.pos
    u.uDesat.value = Math.max(S.dark * 0.9, p > 4.9 && p < 5.9 ? 0.55 : 0)
    u.uInvert.value = now < scrollState.invertUntil ? 1 : 0
    u.uPoster.value = st.friedMode ? 4 : 0
    u.uSplit.value = Math.min(1, scrollState.vel * 0.05) + scrollState.bossHit
    u.uGrain.value = 0.045 + scrollState.chaos * 0.06
    bloom.strength = (size.width < 720 ? 0.32 : 0.48) + S.level * 0.4 + scrollState.bossHit * 0.6 + (st.godMode ? 0.5 : 0)
    composer.render(dt)
  }, 1)
  return null
}
