import Link from "next/link"
import { Trophy, Users, Zap, Target, Calendar, Gamepad2, ArrowRight } from "lucide-react"
import {
  GlassCard,
  GradientButton,
  NeonBadge,
  StatCard,
  GlowBorder,
  EsportsSidebar,
} from "@/components/esports"

export default function Page() {
  return (
    <div className="flex min-h-screen bg-[#05050A] text-[#F8FAFC]">
      {/* Sidebar */}
      <EsportsSidebar activeItem="/" />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-12">
        {/* Background effects */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-500/10 blur-[128px]" />
          <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-[128px]" />
          <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-pink-500/10 blur-[128px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-5xl font-bold text-transparent">
              Esports Design System
            </h1>
            <p className="text-lg text-[#94A3B8]">
              Premium gaming components with neon aesthetics
            </p>
          </div>

          {/* Pages Navigation */}
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-[#F8FAFC]">Pages Demo</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/landing" className="group">
                <GlassCard className="h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#F8FAFC]">Landing Page</h3>
                      <p className="mt-1 text-sm text-[#94A3B8]">Page hero avec stats et CTAs</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#00F5FF]" />
                  </div>
                </GlassCard>
              </Link>
              <Link href="/mes-tournois" className="group">
                <GlassCard className="h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#F8FAFC]">Mes Tournois</h3>
                      <p className="mt-1 text-sm text-[#94A3B8]">Dashboard organisateur</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#00F5FF]" />
                  </div>
                </GlassCard>
              </Link>
              <Link href="/tournoi/123" className="group">
                <GlassCard className="h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#F8FAFC]">Apercu Tournoi</h3>
                      <p className="mt-1 text-sm text-[#94A3B8]">Vue detaillee avec onglets</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#00F5FF]" />
                  </div>
                </GlassCard>
              </Link>
              <Link href="/tournament/fluky-cup-s4" className="group">
                <GlassCard className="h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#F8FAFC]">Page Publique Tournoi</h3>
                      <p className="mt-1 text-sm text-[#94A3B8]">Style Toornament avec onglets</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#00F5FF]" />
                  </div>
                </GlassCard>
              </Link>
            </div>
          </section>

          {/* Stat Cards */}
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-[#F8FAFC]">StatCard</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Trophy className="h-8 w-8 text-[#FFD700]" />}
                value={1247}
                label="Tournaments Won"
                accentColor="gold"
              />
              <StatCard
                icon={<Users className="h-8 w-8 text-[#00F5FF]" />}
                value={52489}
                label="Active Players"
                accentColor="cyan"
              />
              <StatCard
                icon={<Zap className="h-8 w-8 text-[#FF3E9D]" />}
                value={98}
                suffix="%"
                label="Win Rate"
                accentColor="pink"
              />
              <StatCard
                icon={<Target className="h-8 w-8 text-[#A855F7]" />}
                value={15420}
                prefix="$"
                label="Prize Pool"
                accentColor="purple"
              />
            </div>
          </section>

          {/* Glass Cards */}
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-[#F8FAFC]">GlassCard</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <GlassCard>
                <div className="flex items-start justify-between">
                  <div>
                    <NeonBadge variant="live">Live Now</NeonBadge>
                    <h3 className="mt-4 text-xl font-bold text-[#F8FAFC]">
                      Valorant Champions
                    </h3>
                    <p className="mt-2 text-sm text-[#94A3B8]">
                      Grand Finals - Team Liquid vs Sentinels
                    </p>
                  </div>
                  <Gamepad2 className="h-6 w-6 text-[#FF3E9D]" />
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <GradientButton size="sm">Watch</GradientButton>
                  <GradientButton size="sm" variant="secondary">
                    Details
                  </GradientButton>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-start justify-between">
                  <div>
                    <NeonBadge variant="upcoming" icon={<Calendar className="h-3 w-3" />}>
                      Tomorrow
                    </NeonBadge>
                    <h3 className="mt-4 text-xl font-bold text-[#F8FAFC]">
                      CS2 Major Qualifier
                    </h3>
                    <p className="mt-2 text-sm text-[#94A3B8]">
                      Semi-finals bracket starts at 6:00 PM EST
                    </p>
                  </div>
                  <Gamepad2 className="h-6 w-6 text-[#00F5FF]" />
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <GradientButton size="sm" variant="success">
                    Register
                  </GradientButton>
                  <GradientButton size="sm" variant="secondary">
                    Notify Me
                  </GradientButton>
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-start justify-between">
                  <div>
                    <NeonBadge variant="completed">Finished</NeonBadge>
                    <h3 className="mt-4 text-xl font-bold text-[#F8FAFC]">
                      League Championship
                    </h3>
                    <p className="mt-2 text-sm text-[#94A3B8]">
                      T1 wins 3-1 against Gen.G
                    </p>
                  </div>
                  <Gamepad2 className="h-6 w-6 text-[#22C55E]" />
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <GradientButton size="sm" variant="secondary">
                    View Results
                  </GradientButton>
                  <GradientButton size="sm" variant="secondary">
                    Highlights
                  </GradientButton>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* Buttons */}
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-[#F8FAFC]">GradientButton</h2>
            <div className="flex flex-wrap items-center gap-4">
              <GradientButton>Primary</GradientButton>
              <GradientButton variant="secondary">Secondary</GradientButton>
              <GradientButton variant="danger">Danger</GradientButton>
              <GradientButton variant="success">Success</GradientButton>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <GradientButton size="sm">Small</GradientButton>
              <GradientButton size="md">Medium</GradientButton>
              <GradientButton size="lg">Large</GradientButton>
            </div>
          </section>

          {/* Badges */}
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-[#F8FAFC]">NeonBadge</h2>
            <div className="flex flex-wrap items-center gap-4">
              <NeonBadge variant="live">Live</NeonBadge>
              <NeonBadge variant="upcoming">Upcoming</NeonBadge>
              <NeonBadge variant="draft">Draft</NeonBadge>
              <NeonBadge variant="completed">Completed</NeonBadge>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <NeonBadge variant="live" icon={<Zap className="h-3 w-3" />}>
                Live Match
              </NeonBadge>
              <NeonBadge variant="upcoming" icon={<Calendar className="h-3 w-3" />}>
                Coming Soon
              </NeonBadge>
            </div>
          </section>

          {/* Glow Border */}
          <section className="mb-16">
            <h2 className="mb-6 text-2xl font-bold text-[#F8FAFC]">GlowBorder</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <GlowBorder>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-[#F8FAFC]">
                    Animated Glow Border
                  </h3>
                  <p className="mt-2 text-sm text-[#94A3B8]">
                    Hover to see the animated gradient border effect with rotating
                    colors.
                  </p>
                </div>
              </GlowBorder>

              <GlowBorder gradient="cyan">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-[#F8FAFC]">Cyan Variant</h3>
                  <p className="mt-2 text-sm text-[#94A3B8]">
                    Custom cyan gradient variant for a different aesthetic.
                  </p>
                </div>
              </GlowBorder>

              <GlowBorder gradient="pink">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-[#F8FAFC]">Pink Variant</h3>
                  <p className="mt-2 text-sm text-[#94A3B8]">
                    Hot pink gradient border for attention-grabbing elements.
                  </p>
                </div>
              </GlowBorder>

              <GlowBorder gradient="gold">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-[#F8FAFC]">Gold Variant</h3>
                  <p className="mt-2 text-sm text-[#94A3B8]">
                    Premium gold gradient for featured or VIP content.
                  </p>
                </div>
              </GlowBorder>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
