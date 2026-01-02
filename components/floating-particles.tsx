"use client"; // Client-side only, SSR'ı atla

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function FloatingParticles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Array<{ x: number; y: number; scale: number; speed: number }>>([]);

  useEffect(() => {
    // Random değerleri sadece client'ta üret
    const newParticles = Array.from({ length: 20 }).map(() => ({
      x: Math.random() * 100, // 0-100 vw
      y: Math.random() * 100, // 0-100 vh
      scale: Math.random() * 0.5 + 0.5, // 0.5-1
      speed: Math.random() * 2 + 1, // Animasyon hızı
    }));
    setParticles(newParticles);
  }, []); // Boş dependency: Sadece mount'ta çalış

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          initial={{ opacity: 0 }}
          animate={{
            x: `${particle.x}vw`,
            y: `${particle.y}vh`,
            scale: particle.scale,
            opacity: 1,
            transition: { duration: particle.speed, repeat: Infinity, repeatType: 'reverse' },
          }}
        />
      ))}
    </div>
  );
}