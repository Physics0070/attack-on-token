import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { useThree } from '@react-three/fiber'
import Rig from './Rig'
import Core from './Core'
import { Floor, Dust, Lights } from './World'
import Zones from './Zones'
import Post from './Post'

function Env() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl)
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = tex; scene.environmentIntensity = 0.28
    scene.background = new THREE.Color('#0b0907')
    scene.fog = new THREE.FogExp2('#0b0907', 0.021)
    return () => { tex.dispose(); pm.dispose() }
  }, [gl, scene])
  return null
}

export default function Experience({ low }: { low: boolean }) {
  return (
    <Canvas
      dpr={low ? [1, 1.25] : [1, 1.75]}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
      camera={{ fov: 40, near: 0.1, far: 260, position: [0, 0.3, 18] }}
      onCreated={({ gl }) => { gl.setClearColor('#0b0907') }}
    >
      <Env />
      <Rig />
      <Lights />
      <Floor />
      <Dust count={low ? 3500 : 6500} />
      <Core />
      <Zones />
      <Post />
    </Canvas>
  )
}
