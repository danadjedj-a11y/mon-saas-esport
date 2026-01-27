"use client"

import { useState } from "react"
import { Search, Plus, Settings, Trash2, Gamepad2 } from "lucide-react"
import { GlassCard, GradientButton, NeonBadge, EsportsSidebar } from "@/components/esports"
import { cn } from "@/lib/utils"

type TournamentStatus = "all" | "active" | "draft" | "completed"

interface Tournament {
  id: string
  name: string
  game: string
  date: string
  format: string
  status: "active" | "draft" | "completed"
  participants: number
  maxParticipants: number
}

const tournaments: Tournament[] = [
  { id: "1", name: "Valorant Masters 2024", game: "Valorant", date: "15 Jan 2024", format: "Single Elimination", status: "active", participants: 16, maxParticipants: 32 },
  { id: "2", name: "tresfaa", game: "Valorant", date: "20 Jan 2024", format: "Double Elimination", status: "draft", participants: 0, maxParticipants: 16 },
  { id: "3", name: "Weekly Cup #12", game: "Valorant", date: "10 Jan 2024", format: "Swiss", status: "completed", participants: 24, maxParticipants: 24 },
  { id: "4", name: "Community Tournament", game: "Valorant", date: "25 Jan 2024", format: "Round Robin", status: "draft", participants: 0, maxParticipants: 8 },
  { id: "5", name: "Pro League Season 3", game: "Valorant", date: "1 Feb 2024", format: "Double Elimination", status: "draft", participants: 0, maxParticipants: 64 },
  { id: "6", name: "Ranked Showdown", game: "Valorant", date: "5 Feb 2024", format: "Single Elimination", status: "draft", participants: 0, maxParticipants: 32 },
  { id: "7", name: "Midnight Madness", game: "Valorant", date: "8 Feb 2024", format: "Swiss", status: "draft", participants: 0, maxParticipants: 16 },
  { id: "8", name: "Champion Series", game: "Valorant", date: "12 Feb 2024", format: "Double Elimination", status: "draft", participants: 0, maxParticipants: 32 },
  { id: "9", name: "Amateur League", game: "Valorant", date: "15 Feb 2024", format: "Round Robin", status: "draft", participants: 0, maxParticipants: 12 },
  { id: "10", name: "Grand Finals", game: "Valorant", date: "20 Feb 2024", format: "Single Elimination", status: "draft", participants: 0, maxParticipants: 8 },
]

const statusBadgeVariant = {
  active: "live" as const,
  draft: "draft" as const,
  completed: "completed" as const,
}

const statusLabels = {
  active: "En cours",
  draft: "Brouillon",
  completed: "Terminé",
}

const filterLabels: Record<TournamentStatus, { label: string; count: number; color: string }> = {
  all: { label: "Total", count: 10, color: "from-purple-500 to-indigo-500" },
  active: { label: "En cours", count: 1, color: "from-emerald-500 to-cyan-500" },
  draft: { label: "Brouillons", count: 8, color: "from-gray-500 to-slate-500" },
  completed: { label: "Terminés", count: 1, color: "from-blue-500 to-indigo-500" },
}

export default function MesTournoisPage() {
  const [filter, setFilter] = useState<TournamentStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTournaments = tournaments.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="flex min-h-screen bg-[#05050A] text-[#F8FAFC]">
      <EsportsSidebar activeItem="/mes-tournois" />
      
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mes Tournois</h1>
            <p className="text-[#94A3B8]">10 tournois &bull; 1 en cours</p>
          </div>
          <div className="flex gap-3">
            <GradientButton variant="secondary" size="sm">
              Demandes Gaming
            </GradientButton>
            <GradientButton variant="primary" size="sm">
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouveau tournoi
              </span>
            </GradientButton>
          </div>
        </div>

        {/* Stats Filter Bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          {(Object.keys(filterLabels) as TournamentStatus[]).map((key) => {
            const { label, count, color } = filterLabels[key]
            const isActive = filter === key
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "group relative overflow-hidden rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r text-white shadow-lg"
                    : "bg-[#0D0D14] text-[#94A3B8] hover:bg-[#1a1a24]",
                  isActive && color
                )}
                style={isActive ? { boxShadow: "0 0 20px rgba(99,102,241,0.3)" } : {}}
              >
                <span className="relative z-10">{count} {label}</span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Rechercher un tournoi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[rgba(148,163,184,0.1)] bg-[rgba(13,13,20,0.8)] py-3 pl-12 pr-4 text-[#F8FAFC] placeholder-[#94A3B8] backdrop-blur-xl transition-all focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
          />
        </div>

        {/* Tournament Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((tournament) => (
            <GlassCard key={tournament.id}>
              <div className="flex flex-col gap-4">
                {/* Game icon and status */}
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 text-red-400">
                    <Gamepad2 className="h-6 w-6" />
                  </div>
                  <NeonBadge variant={statusBadgeVariant[tournament.status]}>
                    {statusLabels[tournament.status]}
                  </NeonBadge>
                </div>

                {/* Tournament info */}
                <div>
                  <h3 className="mb-1 text-lg font-bold text-[#F8FAFC]">{tournament.name}</h3>
                  <span className="inline-block rounded-md bg-[#1a1a24] px-2 py-0.5 text-xs font-medium text-[#94A3B8]">
                    {tournament.game}
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#1a1a24] px-3 py-1 text-xs text-[#94A3B8]">
                    {tournament.date}
                  </span>
                  <span className="rounded-full bg-[#1a1a24] px-3 py-1 text-xs text-[#94A3B8]">
                    {tournament.format}
                  </span>
                </div>

                {/* Participants */}
                <div className="text-sm text-[#94A3B8]">
                  {tournament.participants}/{tournament.maxParticipants} participants
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 border-t border-[rgba(148,163,184,0.1)] pt-4">
                  <GradientButton variant="primary" size="sm" className="flex-1">
                    Gérer
                  </GradientButton>
                  <button className="rounded-lg bg-[#1a1a24] p-2 text-[#94A3B8] transition-colors hover:bg-[#2a2a34] hover:text-[#F8FAFC]">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg bg-[#1a1a24] p-2 text-[#94A3B8] transition-colors hover:bg-red-500/20 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}
