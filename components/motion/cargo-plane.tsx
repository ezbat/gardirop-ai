'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * WEARO Cargo Plane — brand identity SVG.
 * Used in loading states, order success, homepage flyover.
 */
export function CargoPlane({
  className = '',
  size = 64,
  color = '#D97706',
}: {
  className?: string
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fuselage */}
      <path
        d="M8 32 L22 24 L52 24 L58 32 L52 40 L22 40 Z"
        fill={color}
        opacity={0.9}
      />
      {/* Cockpit window */}
      <path
        d="M52 28 L56 32 L52 36 L50 36 L50 28 Z"
        fill="white"
        opacity={0.6}
      />
      {/* Wing top */}
      <path
        d="M28 24 L38 24 L44 10 L32 10 Z"
        fill={color}
        opacity={0.75}
      />
      {/* Wing bottom */}
      <path
        d="M28 40 L38 40 L44 54 L32 54 Z"
        fill={color}
        opacity={0.75}
      />
      {/* Tail fin */}
      <path
        d="M8 32 L14 24 L18 24 L12 32 Z"
        fill={color}
        opacity={0.6}
      />
      <path
        d="M8 32 L14 40 L18 40 L12 32 Z"
        fill={color}
        opacity={0.6}
      />
      {/* Engine nacelles */}
      <ellipse cx="34" cy="22" rx="3" ry="1.5" fill={color} opacity={0.5} />
      <ellipse cx="34" cy="42" rx="3" ry="1.5" fill={color} opacity={0.5} />
      {/* Cargo door lines */}
      <line x1="24" y1="28" x2="24" y2="36" stroke="white" strokeWidth="0.5" opacity={0.3} />
      <line x1="30" y1="28" x2="30" y2="36" stroke="white" strokeWidth="0.5" opacity={0.3} />
      <line x1="36" y1="28" x2="36" y2="36" stroke="white" strokeWidth="0.5" opacity={0.3} />
      {/* Package icon on fuselage */}
      <rect x="40" y="29" width="6" height="6" rx="1" fill="white" opacity={0.25} />
    </svg>
  )
}

/**
 * Animated cargo plane with exhaust trail — loading state.
 * Shows plane taxiing → takeoff sequence.
 */
export function CargoPlaneLoading({
  text = 'Wird geladen…',
}: {
  text?: string
}) {
  const reduced = useReducedMotion()

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh]">
      {/* Airport-style scene */}
      <div className="relative w-80 h-44 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #1a1c2e 0%, #2d2040 35%, #d97706 85%, #4a3520 85%, #3a2a18 100%)',
        }}
      >
        {/* Stars */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              width: 1.5,
              height: 1.5,
              top: `${8 + Math.random() * 25}%`,
              left: `${5 + Math.random() * 90}%`,
            }}
            animate={reduced ? {} : { opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}

        {/* Horizon glow */}
        <div className="absolute bottom-[15%] left-0 right-0 h-8"
          style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(217,119,6,0.3) 0%, transparent 70%)' }}
        />

        {/* Runway surface */}
        <div className="absolute bottom-0 left-0 right-0 h-[15%]"
          style={{ background: 'linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%)' }}
        />

        {/* Runway center line (dashed) */}
        <motion.div
          className="absolute bottom-[7%] left-0 flex gap-4"
          style={{ width: '200%' }}
          animate={reduced ? {} : { x: [0, -160] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-10 h-[2px] flex-shrink-0 rounded-full"
              style={{ background: 'rgba(255,255,255,0.4)' }}
            />
          ))}
        </motion.div>

        {/* Runway edge lights */}
        {[10, 30, 50, 70, 90].map(pct => (
          <motion.div
            key={`light-${pct}`}
            className="absolute rounded-full"
            style={{ width: 4, height: 4, bottom: '14%', left: `${pct}%`, background: '#22c55e' }}
            animate={reduced ? {} : { opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: pct / 100 }}
          />
        ))}

        {/* Exhaust particles */}
        {!reduced && [0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + i * 2,
              height: 4 + i * 2,
              background: `rgba(255, 200, 100, ${0.25 - i * 0.05})`,
              bottom: '22%',
              left: '35%',
            }}
            animate={{ x: [0, -(30 + i * 18)], opacity: [0.3, 0], scale: [1, 1.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeOut' }}
          />
        ))}

        {/* The plane */}
        <motion.div
          className="absolute"
          style={{ bottom: '18%', left: '50%', marginLeft: -32 }}
          animate={reduced ? {} : { y: [0, -3, 0, -2, 0], rotate: [0, -2, 0, -1, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
        >
          <CargoPlane size={64} />
        </motion.div>

        {/* Control tower silhouette */}
        <div className="absolute bottom-[15%] right-4 flex flex-col items-center">
          <div style={{ width: 12, height: 8, background: 'rgba(100,180,255,0.3)', borderRadius: '2px 2px 0 0' }} />
          <div style={{ width: 4, height: 20, background: 'rgba(60,60,60,0.8)' }} />
        </div>
      </div>

      {/* Loading text */}
      <motion.p
        className="text-sm font-medium text-muted-foreground"
        animate={reduced ? {} : { opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {text}
      </motion.p>
    </div>
  )
}

/**
 * Full-screen cargo plane takeoff — used for page transitions & checkout loading.
 */
export function CargoTakeoff({
  onComplete,
}: {
  onComplete?: () => void
}) {
  const reduced = useReducedMotion()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        animate={
          reduced
            ? { opacity: [1, 0] }
            : {
                x: [0, 0, 200],
                y: [0, -20, -120],
                rotate: [0, -8, -15],
                scale: [1, 1.1, 0.6],
                opacity: [1, 1, 0],
              }
        }
        transition={{
          duration: reduced ? 0.5 : 1.8,
          ease: [0.16, 1, 0.3, 1],
          times: [0, 0.4, 1],
        }}
        onAnimationComplete={onComplete}
      >
        <CargoPlane size={96} />
      </motion.div>

      {/* Cloud puffs on takeoff */}
      {!reduced &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 20 + i * 12,
              height: 20 + i * 12,
              background: 'rgba(217, 119, 6, 0.08)',
            }}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 0.3, 0],
              scale: [0, 1.5, 2.5],
              x: [0, -(30 + i * 20)],
              y: [0, 10 + i * 5],
            }}
            transition={{
              duration: 1.5,
              delay: 0.6 + i * 0.15,
              ease: 'easeOut',
            }}
          />
        ))}
    </div>
  )
}
