import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlowBorderProps {
  children: ReactNode
  className?: string
  gradient?: "default" | "cyan" | "pink" | "gold"
}

const gradientStyles = {
  default: "from-indigo-500 via-purple-500 to-pink-500",
  cyan: "from-cyan-400 via-teal-500 to-emerald-500",
  pink: "from-pink-500 via-rose-500 to-red-500",
  gold: "from-yellow-400 via-amber-500 to-orange-500",
}

export function GlowBorder({
  children,
  className,
  gradient = "default",
}: GlowBorderProps) {
  return (
    <div className={cn("group relative", className)}>
      {/* Outer glow */}
      <div
        className={cn(
          "absolute -inset-[2px] rounded-xl bg-gradient-to-r opacity-50 blur-md transition-all duration-500 group-hover:opacity-100 group-hover:blur-lg",
          gradientStyles[gradient]
        )}
      />
      
      {/* Border gradient */}
      <div
        className={cn(
          "absolute -inset-[1px] rounded-xl bg-gradient-to-r",
          gradientStyles[gradient]
        )}
      />
      
      {/* Inner content wrapper */}
      <div className="relative rounded-xl bg-[#0D0D14]">
        {children}
      </div>
    </div>
  )
}
