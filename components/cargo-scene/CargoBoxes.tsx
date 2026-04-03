'use client'

/**
 * CargoBoxes — Animated shipping boxes that load into the plane.
 *
 * Each box spawns at a start position, slides along a conveyor path,
 * and enters the cargo hold through the rear door.
 *
 * VISUAL ABSTRACTION:
 * - Box spawn rate is influenced by platform order activity (boxRate)
 * - Individual boxes do NOT represent specific orders
 * - The rhythm and density create an impression of platform activity
 */

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CargoBox {
  id: number
  progress: number    // 0→1 along the path
  size: number        // random slight variation
  colorIdx: number
}

interface CargoBoxesProps {
  boxRate: number      // 0→1 spawn frequency
  isLoading: boolean   // false during takeoff
  maxBoxes?: number    // limit for mobile
}

const BOX_COLORS = ['#D97706', '#B45309', '#92400E', '#78350F', '#F59E0B']

// Conveyor path: start behind plane, curve up into cargo hold
function getPathPosition(t: number): [number, number, number] {
  // Start: behind and below the plane
  // End: inside the cargo hold
  const x = THREE.MathUtils.lerp(-6, -2.5, t)
  const y = THREE.MathUtils.lerp(-0.8, -0.15, Math.min(1, t * 1.3))
  const z = THREE.MathUtils.lerp(0, 0, t) + Math.sin(t * Math.PI) * 0.1
  return [x, y, z]
}

export function CargoBoxes({
  boxRate = 0.3,
  isLoading = true,
  maxBoxes = 8,
}: CargoBoxesProps) {
  const [boxes, setBoxes] = useState<CargoBox[]>([])
  const nextIdRef = useRef(0)
  const spawnTimerRef = useRef(0)

  // Spawn new boxes at intervals based on boxRate
  useFrame((_, delta) => {
    if (!isLoading) return

    spawnTimerRef.current += delta
    const spawnInterval = THREE.MathUtils.lerp(3.0, 0.8, boxRate)

    if (spawnTimerRef.current >= spawnInterval && boxes.length < maxBoxes) {
      spawnTimerRef.current = 0
      const id = nextIdRef.current++
      setBoxes(prev => [
        ...prev,
        {
          id,
          progress: 0,
          size: 0.12 + Math.random() * 0.06,
          colorIdx: Math.floor(Math.random() * BOX_COLORS.length),
        },
      ])
    }

    // Advance all boxes
    setBoxes(prev =>
      prev
        .map(b => ({ ...b, progress: b.progress + delta * 0.15 }))
        .filter(b => b.progress < 1.1), // Remove after entering hold
    )
  })

  return (
    <group>
      {boxes.map(box => (
        <AnimatedBox key={box.id} box={box} />
      ))}

      {/* Conveyor track visual (subtle) */}
      <mesh position={[-4.2, -0.85, 0]} rotation={[0, 0, 0.04]}>
        <boxGeometry args={[3.5, 0.03, 0.4]} />
        <meshStandardMaterial color="#1a1e2e" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

function AnimatedBox({ box }: { box: CargoBox }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = BOX_COLORS[box.colorIdx]

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.6,
    emissive: color,
    emissiveIntensity: 0.05,
  }), [color])

  useFrame(() => {
    if (!meshRef.current) return
    const [x, y, z] = getPathPosition(box.progress)
    meshRef.current.position.set(x, y, z)
    // Slight rotation as they move
    meshRef.current.rotation.y = box.progress * 0.5
    // Fade in at start, fade out at end
    const opacity = box.progress < 0.1
      ? box.progress / 0.1
      : box.progress > 0.9
      ? (1 - box.progress) / 0.1
      : 1
    mat.opacity = opacity
    mat.transparent = opacity < 1
  })

  return (
    <mesh ref={meshRef} material={mat}>
      <boxGeometry args={[box.size, box.size * 0.8, box.size]} />
    </mesh>
  )
}
