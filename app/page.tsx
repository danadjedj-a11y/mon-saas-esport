import { Trophy, Users, Calendar, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              <span className="text-primary">Mon Tournoi</span>
              <br />
              <span className="text-foreground">Plateforme eSport</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Créez, gérez et participez à des tournois eSport professionnels.
              Une plateforme complète pour les organisateurs et les joueurs.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <button className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Créer un tournoi
              </button>
              <button className="rounded-lg border border-border bg-card px-6 py-3 font-semibold text-foreground transition-colors hover:bg-accent">
                Explorer les tournois
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Fonctionnalités</h2>
          <p className="mt-4 text-muted-foreground">
            Tout ce dont vous avez besoin pour organiser des tournois professionnels
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Trophy className="h-8 w-8" />}
            title="Gestion des tournois"
            description="Créez et gérez des tournois avec différents formats : élimination simple, double, poules, suisse."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Équipes et joueurs"
            description="Gérez les inscriptions, les équipes et les profils des joueurs facilement."
          />
          <FeatureCard
            icon={<Calendar className="h-8 w-8" />}
            title="Planification"
            description="Planifiez les matchs, gérez les créneaux horaires et les disponibilités."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="Temps réel"
            description="Suivez les scores et les résultats en temps réel avec des mises à jour instantanées."
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 text-center sm:grid-cols-3">
            <StatCard value="0" label="Tournois créés" />
            <StatCard value="0" label="Joueurs inscrits" />
            <StatCard value="0" label="Matchs joués" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-12 text-center">
          <h2 className="text-3xl font-bold">Prêt à commencer ?</h2>
          <p className="mt-4 text-muted-foreground">
            Rejoignez la communauté et créez votre premier tournoi dès maintenant.
          </p>
          <button className="mt-8 rounded-lg bg-primary px-8 py-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            Commencer gratuitement
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2026 Mon Tournoi. Tous droits réservés.
          </p>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-colors hover:bg-accent/50">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-4xl font-bold text-primary">{value}</p>
      <p className="mt-2 text-muted-foreground">{label}</p>
    </div>
  )
}
