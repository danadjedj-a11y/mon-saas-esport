"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef, useState, type ReactNode } from "react"

interface StatCardProps {
  icon: ReactNode
  value: number
  label: string
  prefix?: string
  suffix?: string
  accentColor?: "cyan" | "pink" | "purple" | "gold"
  className?: string
}

const accentStyles = {
  cyan: {
    gradient: "from-[#00F5FF] to-[#06B6D4]",
    glow: "shadow-[0_0_20px_rgba(0,245,255,0.5)]",
    iconGlow: "drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]",
  },
  pink: {
    gradient: "from-[#FF3E9D] to-[#EC4899]",
    glow: "shadow-[0_0_20px_rgba(255,62,157,0.5)]",
    iconGlow: "drop-shadow-[0_0_8px_rgba(255,62,157,0.8)]",
  },
  purple: {
    gradient: "from-[#A855F7] to-[#6366F1]",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.5)]",
    iconGlow: "drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]",
  },
  gold: {
    gradient: "from-[#FFD700] to-[#F59E0B]",
    glow: "shadow-[0_0_20px_rgba(255,215,0,0.5)]",
    iconGlow: "drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]",
  },
}

function useCountUp(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const frameRef = useRef<number>()

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      
      setCount(Math.floor(easeOutQuart * target))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [target, duration])

  return count
}

export function StatCard({
  icon,
  value,
  label,
  prefix = "",
  suffix = "",
  accentColor = "cyan",
  className,
}: StatCardProps) {
  const animatedValue = useCountUp(value)
  const styles = accentStyles[accentColor]

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl bg-[rgba(13,13,20,0.8)] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1",
        className
      )}
    >
      {/* Gradient accent line at top */}
      <div className={cn("absolute left-0 right-0 top-0 h-1 bg-gradient-to-r", styles.gradient)} />
      
      {/* Background glow on hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-5",
        styles.gradient
      )} />

      <div className="relative">
        {/* Icon with glow */}
        <div className={cn("mb-4 text-3xl", styles.iconGlow)}>
          {icon}
        </div>

        {/* Animated number */}
        <div className="mb-1 text-4xl font-bold tabular-nums text-[#F8FAFC]">
          {prefix}
          {animatedValue.toLocaleString()}
          {suffix}
        </div>

        {/* Label */}
        <div className="text-sm font-medium uppercase tracking-wider text-[#94A3B8]">
          {label}
        </div>
      </div>
    </div>
  )
}
