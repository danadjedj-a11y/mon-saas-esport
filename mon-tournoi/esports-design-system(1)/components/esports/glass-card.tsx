"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <div className={cn("group relative", className)}>
      {/* Animated gradient border */}
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 opacity-0 blur-sm transition-all duration-500 group-hover:opacity-100 group-hover:blur-[2px]" />
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500 opacity-0 transition-all duration-500 group-hover:opacity-100" />
      
      {/* Card content */}
      <div className="relative rounded-xl bg-[rgba(13,13,20,0.8)] p-6 backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
        {children}
      </div>
    </div>
  )
}
