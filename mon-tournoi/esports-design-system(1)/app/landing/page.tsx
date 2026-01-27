"use client"

import React from "react"

import { useEffect, useRef, useState } from "react"
import { Gamepad2, Trophy, Layers, Zap } from "lucide-react"
import { GlassCard, GradientButton } from "@/components/esports"

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
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration])

  return count
}

function StatItem({ icon, value, label, suffix = "" }: { icon: React.ReactNode; value: number; label: string; suffix?: string }) {
  const animatedValue = useCountUp(value)
  return (
    <GlassCard className="flex-1">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-[#00F5FF] drop-shadow-[0_0_10px_rgba(0,245,255,0.6)]">
          {icon}
        </div>
        <div className="text-3xl font-bold text-[#F8FAFC]">
          {animatedValue}{suffix}
        </div>
        <div className="text-sm text-[#94A3B8]">{label}</div>
      </div>
    </GlassCard>
  )
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05050A]">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-[#05050A] to-pink-900/20 animate-pulse" style={{ animationDuration: '8s' }} />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#00F5FF]/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
            <span className="text-lg font-bold text-white">FB</span>
          </div>
          <span className="text-xl font-bold text-[#F8FAFC]">Fluky Boys</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#" className="text-[#94A3B8] transition-colors hover:text-[#00F5FF]">Accueil</a>
          <a href="#" className="text-[#94A3B8] transition-colors hover:text-[#00F5FF]">Explorer</a>
          <a href="#" className="text-[#94A3B8] transition-colors hover:text-[#00F5FF]">Classement</a>
        </div>

        <div className="flex items-center gap-3">
          <GradientButton variant="secondary" size="sm">
            Se Connecter
          </GradientButton>
          <GradientButton variant="primary" size="sm">
            Créer un Compte
          </GradientButton>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-20 text-center lg:py-32">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#6366F1]/30 bg-[#6366F1]/10 px-4 py-2 text-sm text-[#A5B4FC]">
          <Gamepad2 className="h-4 w-4" />
          Plateforme de Tournois eSport
        </div>

        {/* Headline */}
        <h1 className="mb-4 text-4xl font-bold leading-tight text-[#F8FAFC] md:text-6xl lg:text-7xl">
          Bienvenue sur{" "}
          <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
            Fluky Boys
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mb-10 max-w-2xl text-lg text-[#94A3B8] md:text-xl">
          {"La plateforme de tournois e-sport ultime. Rejoignez des milliers de joueurs et participez à des compétitions épiques."}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <GradientButton variant="primary" size="lg" className="min-w-[180px]">
            <span className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Se Connecter
            </span>
          </GradientButton>
          <GradientButton variant="secondary" size="lg" className="min-w-[180px]">
            Créer un Compte
          </GradientButton>
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <StatItem 
            icon={<Trophy className="h-8 w-8" />}
            value={9}
            label="Tournois Actifs"
          />
          <StatItem 
            icon={<Gamepad2 className="h-8 w-8" />}
            value={1}
            label="Jeu Disponible"
          />
          <StatItem 
            icon={<Layers className="h-8 w-8" />}
            value={4}
            suffix="+"
            label="Formats"
          />
        </div>
      </main>

      {/* CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
