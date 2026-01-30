/**
 * LEADERBOARD.JSX - Version Convex (Temporaire)
 * 
 * Version simplifiée pendant la migration.
 * TODO: Migrer complètement vers Convex avec les vraies données
 */

import React from 'react';
import { useUser } from "@clerk/clerk-react";
import DashboardLayout from './layouts/DashboardLayout';
import { GlassCard, GradientButton } from './shared/components/ui';

export default function Leaderboard() {
  const { isSignedIn, user } = useUser();

  // Session compatible pour DashboardLayout
  const session = isSignedIn ? { user: { email: user?.primaryEmailAddress?.emailAddress } } : null;

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display text-4xl text-cyan-400 m-0" style={{ textShadow: '0 0 15px rgba(139, 92, 246, 0.5)' }}>
            🏆 Classement Global
          </h1>
        </div>

        <GlassCard className="text-center py-16">
          <div className="text-6xl mb-6">🚧</div>
          <h2 className="font-display text-2xl text-text mb-4">
            Classement en cours de migration
          </h2>
          <p className="font-body text-text-secondary mb-8 max-w-md mx-auto">
            Le classement sera bientôt disponible avec les données en temps réel de Convex.
            Revenez plus tard !
          </p>
          <GradientButton onClick={() => window.history.back()}>
            ← Retour
          </GradientButton>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
