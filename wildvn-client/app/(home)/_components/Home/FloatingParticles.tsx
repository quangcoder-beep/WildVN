"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * FloatingParticles — 20 chấm sáng đom đóm trôi nổi
 * Fix Hydration: Khởi tạo hạt trên client sau khi mount để tránh lệch Math.random() giữa Server và Client.
 */
export function FloatingParticles() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Chỉ tạo hạt sau khi đã mount trên trình duyệt
    const data = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 2.5,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
      opacity: 0.15 + Math.random() * 0.45,
      // Tạo sẵn các mốc di chuyển để tránh gọi Math.random() trong lúc render animate prop
      moveX: [0, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 80, 0],
      moveY: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 60, 0],
    }));
    setParticles(data);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `radial-gradient(circle, rgba(255,255,220,${p.opacity}) 0%, transparent 70%)`,
            boxShadow: `0 0 ${p.size * 3}px rgba(255,255,200,${p.opacity * 0.5})`,
          }}
          animate={{
            x: p.moveX,
            y: p.moveY,
            opacity: [p.opacity, p.opacity * 0.3, p.opacity, p.opacity * 0.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
