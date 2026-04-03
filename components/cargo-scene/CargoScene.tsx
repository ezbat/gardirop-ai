'use client'

/**
 * CargoScene — The main grounded cargo plane scene.
 *
 * PHASES:
 * 1. LOADING — Plane grounded, door open, boxes stream into hold
 * 2. CLOSING — Door animates shut, engines warm up
 * 3. TAXI    — Plane starts rolling forward
 * 4. TAKEOFF — Plane lifts off and flies away
 * 5. RESET   — Scene fades, new plane appears, cycle restarts
 *
 * Used in: profile page (full scene), order-success (short branded moment)
 */

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import { CargoPlaneModel } from './CargoPlaneModel'
import { CargoBoxes } from './CargoBoxes'
import { usePlatformOrders, useCargoMotionPreference, TAKEOFF_THRESHOLD } from './usePlatformOrders'

type Phase = 'loading' | 'closing' | 'taxi' | 'takeoff' | 'reset'

interface CargoSceneProps {
  variant: 'profile' | 'orderSuccess' | 'homepage'
  /** For order-success: highlight the user's new order */
  highlightNewOrder?: boolean
  className?: string
}

function SceneContent({
  variant,
  highlightNewOrder,
}: Pick<CargoSceneProps, 'variant' | 'highlightNewOrder'>) {
  const { isMobile } = useCargoMotionPreference()
  const orderData = usePlatformOrders()
  const [phase, setPhase] = useState<Phase>('loading')
  const planeRef = useRef<THREE.Group>(null)
  const phaseTimerRef = useRef(0)
  const planePos = useRef(new THREE.Vector3(0, 0, 0))
  const planeRot = useRef(new THREE.Euler(0, 0, 0))

  // Derive scene parameters from phase + data
  const doorOpen = phase === 'loading' ? 1 : phase === 'closing' ? 0 : 0
  const engineGlow = phase === 'taxi' ? 0.4 : phase === 'takeoff' ? 1 : 0
  const boxesActive = phase === 'loading'

  // Phase transitions
  useFrame((_, delta) => {
    phaseTimerRef.current += delta

    if (phase === 'loading') {
      // Check threshold or time-based trigger
      const shouldTakeoff = orderData.isTakingOff ||
        orderData.cycleProgress > 0.9 ||
        phaseTimerRef.current > (variant === 'orderSuccess' ? 4 : 25)

      if (shouldTakeoff) {
        setPhase('closing')
        phaseTimerRef.current = 0
      }
    }

    if (phase === 'closing' && phaseTimerRef.current > 2.5) {
      setPhase('taxi')
      phaseTimerRef.current = 0
    }

    if (phase === 'taxi') {
      // Roll forward
      planePos.current.x += delta * 1.5
      if (phaseTimerRef.current > 3) {
        setPhase('takeoff')
        phaseTimerRef.current = 0
      }
    }

    if (phase === 'takeoff') {
      // Accelerate and lift
      planePos.current.x += delta * (4 + phaseTimerRef.current * 2)
      planePos.current.y += delta * (0.5 + phaseTimerRef.current * 0.8)
      planeRot.current.z = THREE.MathUtils.lerp(planeRot.current.z, -0.12, 0.02)

      if (phaseTimerRef.current > 4) {
        setPhase('reset')
        phaseTimerRef.current = 0
      }
    }

    if (phase === 'reset' && phaseTimerRef.current > 2) {
      planePos.current.set(0, 0, 0)
      planeRot.current.set(0, 0, 0)
      setPhase('loading')
      phaseTimerRef.current = 0
    }

    // Apply to plane group
    if (planeRef.current) {
      planeRef.current.position.lerp(planePos.current, 0.08)
      planeRef.current.rotation.z = THREE.MathUtils.lerp(
        planeRef.current.rotation.z,
        planeRot.current.z,
        0.04,
      )
    }
  })

  const planeScale = isMobile ? 0.7 : 1

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[8, 6, 4]}
        intensity={1.2}
      />
      <pointLight position={[-4, 3, -2]} color="#D97706" intensity={0.4} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <planeGeometry args={[40, 20]} />
        <meshStandardMaterial color="#0a0c12" metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Runway markings */}
      {[-8, -4, 0, 4, 8].map(x => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.89, 0]}>
          <planeGeometry args={[1.5, 0.08]} />
          <meshStandardMaterial color="#1a1e2e" emissive="#1a1e2e" emissiveIntensity={0.3} />
        </mesh>
      ))}

      {/* Runway edge lights */}
      {[-10, -6, -2, 2, 6, 10].map(x => (
        <group key={`light-${x}`}>
          <pointLight position={[x, -0.8, -1.5]} color="#D97706" intensity={0.15} distance={2} />
          <pointLight position={[x, -0.8, 1.5]} color="#D97706" intensity={0.15} distance={2} />
          <mesh position={[x, -0.85, -1.5]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={2} />
          </mesh>
          <mesh position={[x, -0.85, 1.5]}>
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshStandardMaterial color="#D97706" emissive="#D97706" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}

      {/* Plane group */}
      <group ref={planeRef}>
        <CargoPlaneModel
          doorOpen={doorOpen}
          engineGlow={engineGlow}
          scale={planeScale}
        />

        {/* Cargo boxes */}
        {boxesActive && (
          <CargoBoxes
            boxRate={orderData.boxRate}
            isLoading={true}
            maxBoxes={isMobile ? 4 : 8}
          />
        )}
      </group>

      {/* Order success: glowing user box */}
      {highlightNewOrder && phase === 'loading' && (
        <mesh position={[-7, -0.6, 0]}>
          <boxGeometry args={[0.2, 0.16, 0.2]} />
          <meshStandardMaterial
            color="#F59E0B"
            emissive="#F59E0B"
            emissiveIntensity={1.5}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {/* Atmosphere */}
      <fog attach="fog" args={['#0a0c12', 8, 25]} />
    </>
  )
}

/** Camera controller — positions camera based on variant */
function CameraRig({ variant }: { variant: CargoSceneProps['variant'] }) {
  const { camera } = useThree()
  const { isMobile } = useCargoMotionPreference()
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta

    if (variant === 'profile') {
      // Gentle orbit around the grounded plane
      const angle = Math.sin(timeRef.current * 0.08) * 0.3 - 0.5
      const radius = isMobile ? 9 : 7
      const targetX = Math.cos(angle) * radius
      const targetZ = Math.sin(angle) * radius
      const targetY = isMobile ? 3.5 : 2.8

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.01)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.01)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.01)
      camera.lookAt(0, -0.2, 0)
    }

    if (variant === 'orderSuccess') {
      // Close-up on the cargo loading, then pull back for takeoff
      const targetX = 2 + timeRef.current * 0.2
      const targetY = 1.5
      const targetZ = 3
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.02)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.01)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.01)
      camera.lookAt(0, -0.2, 0)
    }

    if (variant === 'homepage') {
      // Wide flyover angle
      const angle = timeRef.current * 0.15
      camera.position.x = Math.cos(angle) * 12
      camera.position.z = Math.sin(angle) * 8
      camera.position.y = 4
      camera.lookAt(0, 0, 0)
    }
  })

  return null
}

/** Loading fallback */
function SceneFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #0B0D14 0%, #12151E 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-xs text-amber-500/60 font-medium tracking-wider uppercase">
          Szene wird geladen...
        </span>
      </div>
    </div>
  )
}

export default function CargoScene({
  variant = 'profile',
  highlightNewOrder = false,
  className = '',
}: CargoSceneProps) {
  const { reducedMotion } = useCargoMotionPreference()

  // Reduced motion: show static branded panel instead
  if (reducedMotion) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl ${className}`}
        style={{
          background: 'linear-gradient(135deg, #0B0D14 0%, #1A1E2E 50%, #0B0D14 100%)',
          minHeight: variant === 'homepage' ? 120 : 200,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <svg width="120" height="60" viewBox="0 0 120 60" fill="none">
            <path d="M10 40 L50 40 L55 30 L100 30 L110 35 L110 42 L10 42 Z" fill="#D97706" />
            <path d="M55 30 L55 20 L80 20 L100 30 Z" fill="#D97706" opacity="0.6" />
            <path d="M20 42 L20 48 L30 48 L30 42" stroke="#D97706" strokeWidth="2" />
            <path d="M80 42 L80 48 L90 48 L90 42" stroke="#D97706" strokeWidth="2" />
          </svg>
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <p className="text-[11px] text-amber-500/40 font-medium tracking-wider uppercase">
            WEARO Cargo
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${variant === 'orderSuccess' ? '' : 'rounded-2xl'} ${className}`}
      style={{
        minHeight: variant === 'homepage' ? 120 : 280,
        height: variant === 'orderSuccess' ? '100%' : undefined,
        background: '#0a0c12',
      }}
    >
      <Suspense fallback={<SceneFallback />}>
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [5, 3, 5], fov: 45, near: 0.1, far: 50 }}
          gl={{ antialias: true, alpha: false }}
        >
          <CameraRig variant={variant} />
          <SceneContent variant={variant} highlightNewOrder={highlightNewOrder} />
        </Canvas>
      </Suspense>

      {/* Gradient overlay for integration */}
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0B0D14, transparent)' }}
      />

      {/* Branded label */}
      {variant === 'profile' && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1
          rounded-full bg-black/40 backdrop-blur-sm border border-amber-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] text-amber-500/80 font-medium tracking-wider uppercase">
            Live Cargo
          </span>
        </div>
      )}
    </div>
  )
}
