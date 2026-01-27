"use client"

import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes, ReactNode } from "react"

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "primary" | "secondary" | "danger" | "success"
  size?: "sm" | "md" | "lg"
}

const variantStyles = {
  primary: {
    base: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.5)]",
    hoverGlow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]",
  },
  secondary: {
    base: "bg-transparent border border-[rgba(148,163,184,0.2)]",
    glow: "",
    hoverGlow: "hover:border-[#00F5FF] hover:shadow-[0_0_20px_rgba(0,245,255,0.3)]",
  },
  danger: {
    base: "bg-gradient-to-r from-red-500 to-pink-500",
    glow: "shadow-[0_0_20px_rgba(255,62,157,0.4)]",
    hoverGlow: "hover:shadow-[0_0_30px_rgba(255,62,157,0.6)]",
  },
  success: {
    base: "bg-gradient-to-r from-emerald-500 to-cyan-500",
    glow: "shadow-[0_0_20px_rgba(34,197,94,0.4)]",
    hoverGlow: "hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]",
  },
}

const sizeStyles = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
}

export function GradientButton({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: GradientButtonProps) {
  const styles = variantStyles[variant]

  return (
    <button
      className={cn(
        "group relative overflow-hidden rounded-lg font-semibold text-[#F8FAFC] transition-all duration-300",
        "active:scale-95",
        styles.base,
        styles.glow,
        styles.hoverGlow,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </button>
  )
}
