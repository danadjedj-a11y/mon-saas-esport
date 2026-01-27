"use client"

import { useState } from "react"
import { 
  ArrowLeft, Settings, Eye, Users, CheckCircle2, Layers, 
  Swords, Check, Circle, Zap, UserPlus, Shuffle, Share2, 
  ExternalLink, Gamepad2, Calendar
} from "lucide-react"
import { GlassCard, GradientButton, NeonBadge, EsportsSidebar } from "@/components/esports"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "overview", label: "Aperçu" },
  { id: "config", label: "Configuration" },
  { id: "structure", label: "Structure" },
  { id: "participants", label: "Participants" },
  { id: "matches", label: "Matchs" },
  { id: "share", label: "Partage" },
]

const configChecklist = [
  { id: "1", label: "Informations de base", completed: true },
  { id: "2", label: "Structure définie", completed: true },
  { id: "3", label: "Participants inscrits", completed: false },
  { id: "4", label: "Tournoi lancé", completed: false },
]

export default function TournamentOverviewPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const completedSteps = configChecklist.filter((c) => c.completed).length
  const totalSteps = configChecklist.length
  const progress = (completedSteps / totalSteps) * 100

  return (
    <div className="flex min-h-screen bg-[#05050A] text-[#F8FAFC]">
      <EsportsSidebar activeItem="/mes-tournois" />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-[rgba(148,163,184,0.1)] bg-[#0D0D14]/80 px-6 py-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2 text-sm text-[#94A3B8]">
            <ArrowLeft className="h-4 w-4" />
            <span>Mes tournois</span>
            <span>/</span>
            <span className="text-[#F8FAFC]">tresfaa</span>
          </div>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">tresfaa</h1>
              <NeonBadge variant="draft">Brouillon</NeonBadge>
            </div>
            <div className="flex items-center gap-3">
              <GradientButton variant="secondary" size="sm">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Voir public
                </span>
              </GradientButton>
              <button className="rounded-lg bg-[#1a1a24] p-2 text-[#94A3B8] transition-colors hover:bg-[#2a2a34] hover:text-[#F8FAFC]">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-[#F8FAFC]"
                    : "text-[#94A3B8] hover:text-[#F8FAFC]"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          {/* Tournament Info Card */}
          <GlassCard className="mb-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                <Gamepad2 className="h-10 w-10 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-xl font-bold">tresfaa</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[#94A3B8]">
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="h-4 w-4" />
                    Valorant
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    20 Jan 2024
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    0/16 participants
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    Double Elimination
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <GradientButton variant="secondary" size="sm">
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Voir page publique
                  </span>
                </GradientButton>
                <GradientButton variant="secondary" size="sm">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Paramètres
                  </span>
                </GradientButton>
              </div>
            </div>
          </GlassCard>

          {/* Stats Grid */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#6366F1]/20 text-[#6366F1]">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-[#94A3B8]">Participants</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <svg className="h-12 w-12 -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#1a1a24" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#22C55E" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset="125.6" />
                  </svg>
                  <CheckCircle2 className="absolute h-5 w-5 text-[#22C55E]" />
                </div>
                <div>
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-[#94A3B8]">Checked in</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#A855F7]/20 text-[#A855F7]">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">1</div>
                  <div className="text-sm text-[#94A3B8]">Phases</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00F5FF]/20 text-[#00F5FF]">
                  <Swords className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold">0/45</div>
                  <div className="text-sm text-[#94A3B8]">Matchs joués</div>
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[#1a1a24]">
                    <div className="h-full w-0 bg-gradient-to-r from-[#00F5FF] to-[#6366F1]" />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Two Columns Layout */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Configuration Checklist */}
            <GlassCard>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold">Configuration du tournoi</h3>
                <span className="text-sm text-[#94A3B8]">{completedSteps}/{totalSteps}</span>
              </div>
              
              {/* Progress bar */}
              <div className="mb-6 h-2 overflow-hidden rounded-full bg-[#1a1a24]">
                <div 
                  className="h-full bg-gradient-to-r from-[#22C55E] to-[#00F5FF] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="space-y-4">
                {configChecklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.completed ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22C55E]/20">
                        <Check className="h-4 w-4 text-[#22C55E]" />
                      </div>
                    ) : (
                      <Circle className="h-6 w-6 text-[#94A3B8]/50" />
                    )}
                    <span className={cn(
                      "text-sm",
                      item.completed ? "text-[#F8FAFC]" : "text-[#94A3B8]"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard>
              <h3 className="mb-6 text-lg font-bold">Actions rapides</h3>
              <div className="space-y-3">
                <GradientButton variant="primary" className="w-full justify-start gap-3">
                  <Layers className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Configurer la structure</div>
                    <div className="text-xs opacity-70">Définir les phases et le format</div>
                  </div>
                </GradientButton>
                <GradientButton variant="secondary" className="w-full justify-start gap-3">
                  <Users className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Gérer les participants</div>
                    <div className="text-xs opacity-70">Ajouter ou supprimer des joueurs</div>
                  </div>
                </GradientButton>
                <GradientButton variant="secondary" className="w-full justify-start gap-3">
                  <Shuffle className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Placement des équipes</div>
                    <div className="text-xs opacity-70">Organiser le seeding</div>
                  </div>
                </GradientButton>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 border-t border-[rgba(148,163,184,0.1)] bg-[#0D0D14]/95 px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <GradientButton variant="success" size="sm">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Démarrer
              </span>
            </GradientButton>
            <GradientButton variant="secondary" size="sm">
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Ajouter participant
              </span>
            </GradientButton>
            <GradientButton variant="secondary" size="sm">
              <span className="flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Générer matchs
              </span>
            </GradientButton>
            <GradientButton variant="primary" size="sm">
              <span className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Partager
              </span>
            </GradientButton>
          </div>
        </div>
      </div>
    </div>
  )
}
