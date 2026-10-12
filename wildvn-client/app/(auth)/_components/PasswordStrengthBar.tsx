"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface PasswordStrengthBarProps {
  password: string;
}

function getStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "transparent" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Yếu", color: "#EF4444" };
  if (score <= 2)
    return { score: 2, label: "Trung bình", color: "#F59E0B" };
  if (score <= 3) return { score: 3, label: "Khá", color: "#3B82F6" };
  return { score: 4, label: "Mạnh", color: "#2DD4A8" };
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      className="space-y-1.5 overflow-hidden"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <motion.div
            key={level}
            className="h-1 flex-1 rounded-full"
            initial={{ scaleX: 0 }}
            animate={{
              scaleX: 1,
              backgroundColor:
                level <= strength.score
                  ? strength.color
                  : "rgba(255,255,255,0.08)",
            }}
            transition={{ duration: 0.3, delay: level * 0.05 }}
            style={{ transformOrigin: "left" }}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium pl-0.5" style={{ color: strength.color }}>
        {strength.label}
      </p>
    </motion.div>
  );
}
