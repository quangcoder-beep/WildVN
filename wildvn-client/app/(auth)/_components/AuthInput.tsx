"use client";

import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, icon: Icon, error, type, className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="space-y-2"
      >
        <label className="block text-[11px] text-white/50 uppercase tracking-[0.15em] font-medium pl-1">
          {label}
        </label>
        <div className="relative">
          {Icon && (
            <Icon
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-200 ${
                isFocused ? "text-[#2DD4A8]" : "text-white/30"
              }`}
            />
          )}
          <input
            ref={ref}
            type={inputType}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`
              w-full bg-white/[0.04] rounded-xl py-3.5 text-white text-sm
              border transition-all duration-300 outline-none
              placeholder:text-white/25
              ${Icon ? "pl-11 pr-4" : "pl-4 pr-4"}
              ${isPassword ? "pr-11" : ""}
              ${
                error
                  ? "border-red-500/50 focus:border-red-400/70 focus:shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                  : "border-white/[0.08] focus:border-[#2DD4A8]/40 focus:shadow-[0_0_20px_rgba(45,212,168,0.08)]"
              }
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-[18px] h-[18px]" />
              ) : (
                <Eye className="w-[18px] h-[18px]" />
              )}
            </button>
          )}
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-red-400/90 text-xs pl-1 overflow-hidden"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

AuthInput.displayName = "AuthInput";
