'use client'

/**
 * CargoPlaneModel — Procedural semi-realistic cargo plane.
 *
 * Built from primitive Three.js geometry — no external .glb needed.
 * Shapes: fuselage (cylinder), wings (boxes), tail fin, engines, cargo door.
 *
 * ASSET STRATEGY:
 * - Current: procedural primitives with metallic PBR materials
 * - Upgrade path: replace with branded .glb model, keep same animation API
 *
 * Props:
 * - doorOpen: 0→1 interpolation for rear cargo door angle
 * - engineGlow: 0→1 engine thrust intensity
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CargoPlaneProps {
  doorOpen?: number      // 0 = closed, 1 = fully open
  engineGlow?: number    // 0 = idle, 1 = full thrust
  scale?: number
}

export function CargoPlaneModel({
  doorOpen = 1,
  engineGlow = 0,
  scale = 1,
}: CargoPlaneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const doorRef = useRef<THREE.Mesh>(null)
  const engineLRef = useRef<THREE.PointLight>(null)
  const engineRRef = useRef<THREE.PointLight>(null)

  // Materials
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1e2e',
    metalness: 0.7,
    roughness: 0.3,
  }), [])

  const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#D97706',
    metalness: 0.5,
    roughness: 0.4,
    emissive: '#D97706',
    emissiveIntensity: 0.15,
  }), [])

  const wingMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#151929',
    metalness: 0.8,
    roughness: 0.2,
  }), [])

  const engineMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#2a2e3e',
    metalness: 0.9,
    roughness: 0.15,
  }), [])

  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4a90d9',
    metalness: 0.3,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6,
  }), [])

  // Animate door and engines
  useFrame(() => {
    if (doorRef.current) {
      doorRef.current.rotation.x = THREE.MathUtils.lerp(
        doorRef.current.rotation.x,
        doorOpen * -Math.PI * 0.45,
        0.05,
      )
    }
    if (engineLRef.current) {
      engineLRef.current.intensity = THREE.MathUtils.lerp(
        engineLRef.current.intensity,
        engineGlow * 8,
        0.05,
      )
    }
    if (engineRRef.current) {
      engineRRef.current.intensity = THREE.MathUtils.lerp(
        engineRRef.current.intensity,
        engineGlow * 8,
        0.05,
      )
    }
  })

  return (
    <group ref={groupRef} scale={scale}>
      {/* ── Fuselage ──────────────────────────────────────────── */}
      <mesh material={bodyMat} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 5.5, 16]} />
      </mesh>

      {/* Nose cone */}
      <mesh material={bodyMat} position={[3.1, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.55, 1.2, 16]} />
      </mesh>

      {/* Tail taper */}
      <mesh material={bodyMat} position={[-3.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.55, 1.0, 16]} />
      </mesh>

      {/* ── Accent stripe ─────────────────────────────────────── */}
      <mesh material={accentMat} position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.56, 0.56, 5.5, 16, 1, false, -0.15, 0.3]} />
      </mesh>

      {/* ── Cockpit windows ───────────────────────────────────── */}
      <mesh material={glassMat} position={[2.7, 0.3, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.6, 0.25, 0.8]} />
      </mesh>

      {/* ── Wings ─────────────────────────────────────────────── */}
      {/* Left wing */}
      <mesh material={wingMat} position={[0.3, -0.1, -2.2]}>
        <boxGeometry args={[1.8, 0.08, 2.5]} />
      </mesh>
      {/* Right wing */}
      <mesh material={wingMat} position={[0.3, -0.1, 2.2]}>
        <boxGeometry args={[1.8, 0.08, 2.5]} />
      </mesh>

      {/* Wing tips (angled) */}
      <mesh material={accentMat} position={[0.3, 0.1, -3.45]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.6, 0.06, 0.4]} />
      </mesh>
      <mesh material={accentMat} position={[0.3, 0.1, 3.45]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.6, 0.06, 0.4]} />
      </mesh>

      {/* ── Engines ───────────────────────────────────────────── */}
      {/* Left engine */}
      <group position={[0.5, -0.35, -1.6]}>
        <mesh material={engineMat} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.25, 0.9, 12]} />
        </mesh>
        <pointLight ref={engineLRef} position={[-0.5, 0, 0]} color="#D97706" intensity={0} distance={3} />
      </group>
      {/* Right engine */}
      <group position={[0.5, -0.35, 1.6]}>
        <mesh material={engineMat} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.25, 0.9, 12]} />
        </mesh>
        <pointLight ref={engineRRef} position={[-0.5, 0, 0]} color="#D97706" intensity={0} distance={3} />
      </group>

      {/* ── Tail fin ──────────────────────────────────────────── */}
      <mesh material={wingMat} position={[-2.8, 0.8, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[1.2, 1.2, 0.06]} />
      </mesh>
      {/* Tail fin accent */}
      <mesh material={accentMat} position={[-2.8, 1.3, 0]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.8, 0.15, 0.07]} />
      </mesh>
      {/* Horizontal stabilizers */}
      <mesh material={wingMat} position={[-2.9, 0.15, -0.8]}>
        <boxGeometry args={[0.8, 0.05, 1.0]} />
      </mesh>
      <mesh material={wingMat} position={[-2.9, 0.15, 0.8]}>
        <boxGeometry args={[0.8, 0.05, 1.0]} />
      </mesh>

      {/* ── Cargo door (rear, animated) ───────────────────────── */}
      <group position={[-3.5, -0.25, 0]}>
        <mesh ref={doorRef} material={bodyMat} position={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.04, 0.9]} />
        </mesh>
      </group>

      {/* ── Landing gear ──────────────────────────────────────── */}
      {[[-0.5, -0.7, -0.6], [-0.5, -0.7, 0.6], [2.0, -0.7, 0]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh material={engineMat}>
            <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
          </mesh>
          <mesh material={engineMat} position={[0, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.06, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
