"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface AuthButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: "primary" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export function AuthButton({
  children,
  isLoading = false,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  onClick,
}: AuthButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={!disabled && !isLoading ? { scale: 1.015 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.985 } : {}}
      disabled={disabled || isLoading}
      className={`
        relative w-full flex items-center justify-center gap-2.5
        rounded-full py-3.5 text-sm font-semibold
        transition-all duration-300 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${
          isPrimary
            ? "bg-[#2DD4A8] text-black hover:shadow-[0_0_35px_rgba(45,212,168,0.25)] active:shadow-[0_0_15px_rgba(45,212,168,0.15)]"
            : "bg-white/[0.06] text-white/80 border border-white/[0.1] hover:bg-white/[0.1] hover:text-white hover:border-white/[0.15]"
        }
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang xử lý...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
