"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Trophy,
  Users,
  Calendar,
  MapPin,
  Clock,
  Gamepad2,
  ChevronRight,
  Share2,
  Bell,
  CheckCircle2,
  Circle,
  Crown,
  Medal,
  Swords,
  Shield,
  ExternalLink,
  Play,
  FileText,
  Gift,
} from "lucide-react"
import { GlassCard, GradientButton, NeonBadge } from "@/components/esports"

const tabs = [
  { id: "overview", label: "Apercu", icon: Trophy },
  { id: "participants", label: "Participants", icon: Users },
  { id: "bracket", label: "Bracket", icon: Swords },
  { id: "rules", label: "Reglement", icon: FileText },
  { id: "prizes", label: "Prizes", icon: Gift },
]

const participants = [
  { rank: 1, name: "Team Vitality", logo: "/placeholder.svg", country: "FR", seed: 1, status: "checked" },
  { rank: 2, name: "G2 Esports", logo: "/placeholder.svg", country: "DE", seed: 2, status: "checked" },
  { rank: 3, name: "Fnatic", logo: "/placeholder.svg", country: "UK", seed: 3, status: "checked" },
  { rank: 4, name: "Cloud9", logo: "/placeholder.svg", country: "US", seed: 4, status: "checked" },
  { rank: 5, name: "T1", logo: "/placeholder.svg", country: "KR", seed: 5, status: "pending" },
  { rank: 6, name: "DRX", logo: "/placeholder.svg", country: "KR", seed: 6, status: "pending" },
  { rank: 7, name: "LOUD", logo: "/placeholder.svg", country: "BR", seed: 7, status: "checked" },
  { rank: 8, name: "NRG", logo: "/placeholder.svg", country: "US", seed: 8, status: "checked" },
]

const bracketMatches = [
  {
    round: "Demi-finales",
    matches: [
      { id: 1, team1: "Team Vitality", score1: 2, team2: "Cloud9", score2: 1, status: "completed" },
      { id: 2, team1: "G2 Esports", score1: 2, team2: "Fnatic", score2: 0, status: "completed" },
    ],
  },
  {
    round: "Finale",
    matches: [
      { id: 3, team1: "Team Vitality", score1: 0, team2: "G2 Esports", score2: 0, status: "upcoming" },
    ],
  },
]

const rules = [
  { title: "Format", content: "Single Elimination, Best of 3" },
  { title: "Maps", content: "Ascent, Bind, Haven, Split, Icebox, Breeze, Fracture" },
  { title: "Serveurs", content: "Paris, Frankfurt" },
  { title: "Anti-cheat", content: "Vanguard obligatoire" },
  { title: "Check-in", content: "15 minutes avant le debut du match" },
  { title: "Retard", content: "10 minutes de tolerance, puis forfait" },
]

const prizes = [
  { place: 1, reward: "5,000 EUR", icon: Crown, color: "text-yellow-400" },
  { place: 2, reward: "2,500 EUR", icon: Medal, color: "text-gray-300" },
  { place: 3, reward: "1,000 EUR", icon: Medal, color: "text-amber-600" },
]

export default function PublicTournamentPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="min-h-screen bg-[#05050A] text-[#F8FAFC]">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#05050A]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-sm font-bold">FB</span>
            </div>
            <span className="text-lg font-bold">FLUKY BOYS</span>
          </Link>
          <div className="flex items-center gap-3">
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
              <Share2 className="h-5 w-5" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
              <Bell className="h-5 w-5" />
            </button>
            <GradientButton variant="primary" size="sm">
              {"S'inscrire"}
            </GradientButton>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="relative h-72 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-pink-900/50" />
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center opacity-20" />
        
        {/* Decorative elements */}
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-purple-500/20 blur-[100px]" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-[100px]" />
        
        {/* Content */}
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <NeonBadge variant="live">EN COURS</NeonBadge>
                <span className="flex items-center gap-1 text-sm text-[#94A3B8]">
                  <Gamepad2 className="h-4 w-4" />
                  VALORANT
                </span>
              </div>
              <h1 className="mb-2 text-4xl font-bold md:text-5xl">
                <span className="bg-gradient-to-r from-[#F8FAFC] via-[#00F5FF] to-[#A855F7] bg-clip-text text-transparent">
                  Fluky Cup Season 4
                </span>
              </h1>
              <p className="max-w-xl text-[#94A3B8]">
                Le tournoi communautaire de reference pour les joueurs francophones. 
                Rejoignez la competition et affrontez les meilleures equipes.
              </p>
            </div>
            
            {/* Prize pool card */}
            <div className="hidden md:block">
              <GlassCard className="px-6 py-4 text-center">
                <p className="mb-1 text-xs uppercase tracking-wider text-[#94A3B8]">Prize Pool</p>
                <p className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-3xl font-bold text-transparent">
                  8,500 EUR
                </p>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="border-b border-white/10 bg-[#0D0D14]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Calendar className="h-4 w-4 text-[#00F5FF]" />
              <span>15 - 22 Fevrier 2026</span>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <MapPin className="h-4 w-4 text-[#00F5FF]" />
              <span>En ligne - EU West</span>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Users className="h-4 w-4 text-[#00F5FF]" />
              <span>32 / 32 equipes</span>
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Clock className="h-4 w-4 text-[#00F5FF]" />
              <span>Check-in: 14h45</span>
            </div>
            <div className="ml-auto md:hidden">
              <GlassCard className="px-4 py-2">
                <p className="text-xs text-[#94A3B8]">Prize Pool</p>
                <p className="font-bold text-yellow-400">8,500 EUR</p>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-16 z-40 border-b border-white/10 bg-[#05050A]/95 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1 overflow-x-auto py-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-[#00F5FF]"
                    : "text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00F5FF] to-[#A855F7]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Column */}
            <div className="space-y-8 lg:col-span-2">
              {/* Live/Next Match */}
              <GlassCard>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Play className="h-5 w-5 text-[#FF3E9D]" />
                    Prochain Match
                  </h3>
                  <NeonBadge variant="upcoming">FINALE</NeonBadge>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#05050A] p-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                      <Shield className="h-8 w-8 text-indigo-400" />
                    </div>
                    <span className="font-bold">Team Vitality</span>
                    <span className="text-xs text-[#94A3B8]">Seed #1</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-[#94A3B8]">Dimanche 22 Fev</span>
                    <span className="text-2xl font-bold text-[#94A3B8]">VS</span>
                    <span className="text-sm text-[#00F5FF]">18:00 CET</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-red-500/20">
                      <Shield className="h-8 w-8 text-pink-400" />
                    </div>
                    <span className="font-bold">G2 Esports</span>
                    <span className="text-xs text-[#94A3B8]">Seed #2</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <GradientButton variant="primary" size="sm" className="flex-1">
                    <Play className="mr-2 h-4 w-4" />
                    Regarder le Stream
                  </GradientButton>
                  <button className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
                    <Bell className="h-4 w-4" />
                    Rappel
                  </button>
                </div>
              </GlassCard>

              {/* Recent Results */}
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Swords className="h-5 w-5 text-[#A855F7]" />
                  Resultats Recents
                </h3>
                <div className="space-y-3">
                  {bracketMatches[0].matches.map((match) => (
                    <div
                      key={match.id}
                      className="flex items-center justify-between rounded-lg bg-[#05050A] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-medium ${match.score1 > match.score2 ? "text-[#F8FAFC]" : "text-[#94A3B8]"}`}>
                          {match.team1}
                        </span>
                        {match.score1 > match.score2 && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-[#1a1a24] px-3 py-1">
                        <span className={match.score1 > match.score2 ? "font-bold text-[#00F5FF]" : "text-[#94A3B8]"}>
                          {match.score1}
                        </span>
                        <span className="text-[#94A3B8]">-</span>
                        <span className={match.score2 > match.score1 ? "font-bold text-[#00F5FF]" : "text-[#94A3B8]"}>
                          {match.score2}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {match.score2 > match.score1 && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                        <span className={`font-medium ${match.score2 > match.score1 ? "text-[#F8FAFC]" : "text-[#94A3B8]"}`}>
                          {match.team2}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-[#00F5FF]">
                  Voir tous les matchs
                  <ChevronRight className="h-4 w-4" />
                </button>
              </GlassCard>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Prizes Summary */}
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Gift className="h-5 w-5 text-yellow-400" />
                  Recompenses
                </h3>
                <div className="space-y-3">
                  {prizes.map((prize) => (
                    <div
                      key={prize.place}
                      className="flex items-center gap-3 rounded-lg bg-[#05050A] p-3"
                    >
                      <prize.icon className={`h-5 w-5 ${prize.color}`} />
                      <span className="text-[#94A3B8]">#{prize.place}</span>
                      <span className="ml-auto font-bold">{prize.reward}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Top Participants */}
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Users className="h-5 w-5 text-[#00F5FF]" />
                  Top Participants
                </h3>
                <div className="space-y-2">
                  {participants.slice(0, 5).map((team, index) => (
                    <div
                      key={team.name}
                      className="flex items-center gap-3 rounded-lg bg-[#05050A] p-3"
                    >
                      <span className="w-6 text-center text-sm font-bold text-[#94A3B8]">
                        {index + 1}
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                        <Shield className="h-4 w-4 text-indigo-400" />
                      </div>
                      <span className="flex-1 font-medium">{team.name}</span>
                      <span className="text-xs text-[#94A3B8]">{team.country}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-[#00F5FF]">
                  Voir tous les participants
                  <ChevronRight className="h-4 w-4" />
                </button>
              </GlassCard>

              {/* Organizer */}
              <GlassCard>
                <h3 className="mb-4 text-lg font-bold">Organisateur</h3>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                    <span className="text-lg font-bold">FB</span>
                  </div>
                  <div>
                    <p className="font-bold">Fluky Boys</p>
                    <p className="text-sm text-[#94A3B8]">Organisateur verifie</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
                    Discord
                  </button>
                  <button className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-[#00F5FF]/50 hover:text-[#00F5FF]">
                    Twitter
                  </button>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* Participants Tab */}
        {activeTab === "participants" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Participants (32/32)</h2>
              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  Check-in: 28/32
                </span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {participants.map((team) => (
                <GlassCard key={team.name} className="group cursor-pointer transition-transform hover:scale-[1.02]">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                        <Shield className="h-7 w-7 text-indigo-400" />
                      </div>
                      {team.status === "checked" && (
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{team.name}</p>
                      <p className="text-sm text-[#94A3B8]">Seed #{team.seed}</p>
                    </div>
                    <span className="text-lg">{team.country === "FR" ? "FR" : team.country}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* Bracket Tab */}
        {activeTab === "bracket" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold">Bracket</h2>
            <div className="flex gap-12 overflow-x-auto pb-4">
              {bracketMatches.map((round) => (
                <div key={round.round} className="min-w-[320px]">
                  <h3 className="mb-4 text-center text-sm font-medium text-[#94A3B8]">
                    {round.round}
                  </h3>
                  <div className="flex flex-col justify-center gap-4">
                    {round.matches.map((match) => (
                      <GlassCard key={match.id}>
                        <div className="space-y-2">
                          <div className={`flex items-center justify-between rounded-lg p-3 ${
                            match.score1 > match.score2 ? "bg-green-500/10" : "bg-[#05050A]"
                          }`}>
                            <span className={match.score1 > match.score2 ? "font-bold" : "text-[#94A3B8]"}>
                              {match.team1}
                            </span>
                            <span className={match.score1 > match.score2 ? "font-bold text-[#00F5FF]" : "text-[#94A3B8]"}>
                              {match.score1}
                            </span>
                          </div>
                          <div className={`flex items-center justify-between rounded-lg p-3 ${
                            match.score2 > match.score1 ? "bg-green-500/10" : "bg-[#05050A]"
                          }`}>
                            <span className={match.score2 > match.score1 ? "font-bold" : "text-[#94A3B8]"}>
                              {match.team2}
                            </span>
                            <span className={match.score2 > match.score1 ? "font-bold text-[#00F5FF]" : "text-[#94A3B8]"}>
                              {match.score2}
                            </span>
                          </div>
                        </div>
                        {match.status === "upcoming" && (
                          <div className="mt-3 text-center">
                            <NeonBadge variant="upcoming">A VENIR</NeonBadge>
                          </div>
                        )}
                      </GlassCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <h2 className="text-2xl font-bold">Reglement du Tournoi</h2>
            <GlassCard>
              <div className="divide-y divide-white/10">
                {rules.map((rule) => (
                  <div key={rule.title} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="mb-2 font-bold text-[#00F5FF]">{rule.title}</h3>
                    <p className="text-[#94A3B8]">{rule.content}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
            <GlassCard>
              <h3 className="mb-4 font-bold">Regles Generales</h3>
              <ul className="space-y-2 text-[#94A3B8]">
                <li className="flex items-start gap-2">
                  <Circle className="mt-1.5 h-2 w-2 flex-shrink-0 text-[#00F5FF]" />
                  Tout comportement toxique ou tricherie entrainera une disqualification immediate.
                </li>
                <li className="flex items-start gap-2">
                  <Circle className="mt-1.5 h-2 w-2 flex-shrink-0 text-[#00F5FF]" />
                  Les joueurs doivent etre presents sur le serveur Discord officiel.
                </li>
                <li className="flex items-start gap-2">
                  <Circle className="mt-1.5 h-2 w-2 flex-shrink-0 text-[#00F5FF]" />
                  Les decisions des arbitres sont definitives.
                </li>
                <li className="flex items-start gap-2">
                  <Circle className="mt-1.5 h-2 w-2 flex-shrink-0 text-[#00F5FF]" />
                  En cas de probleme technique, contactez un admin immediatement.
                </li>
              </ul>
            </GlassCard>
          </div>
        )}

        {/* Prizes Tab */}
        {activeTab === "prizes" && (
          <div className="mx-auto max-w-3xl space-y-6">
            <h2 className="text-2xl font-bold">Recompenses</h2>
            <div className="grid gap-6">
              {prizes.map((prize) => (
                <GlassCard key={prize.place}>
                  <div className="flex items-center gap-6">
                    <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${
                      prize.place === 1
                        ? "bg-gradient-to-br from-yellow-500/20 to-amber-500/20"
                        : prize.place === 2
                        ? "bg-gradient-to-br from-gray-400/20 to-gray-500/20"
                        : "bg-gradient-to-br from-amber-600/20 to-orange-600/20"
                    }`}>
                      <prize.icon className={`h-10 w-10 ${prize.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-[#94A3B8]">
                        {prize.place === 1 ? "1ere Place" : prize.place === 2 ? "2eme Place" : "3eme Place"}
                      </p>
                      <p className="text-3xl font-bold">{prize.reward}</p>
                    </div>
                    {prize.place === 1 && (
                      <div className="text-right">
                        <p className="text-sm text-[#94A3B8]">+ Bonus</p>
                        <p className="font-bold text-[#00F5FF]">Slot LAN Finals</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
            <GlassCard>
              <h3 className="mb-4 font-bold">Conditions de versement</h3>
              <ul className="space-y-2 text-[#94A3B8]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                  Les gains seront verses dans les 30 jours suivant la fin du tournoi.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                  Un capitaine doit fournir les informations de paiement (IBAN/PayPal).
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400" />
                  La repartition des gains au sein de lequipe est a la discretion du capitaine.
                </li>
              </ul>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-white/10 bg-[#0D0D14]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6">
          <div>
            <p className="font-bold">Pret a participer ?</p>
            <p className="text-sm text-[#94A3B8]">Inscriptions ouvertes jusqu'au 14 Fevrier</p>
          </div>
          <GradientButton variant="primary">
            {"S'inscrire au tournoi"}
          </GradientButton>
        </div>
      </div>
    </div>
  )
}
