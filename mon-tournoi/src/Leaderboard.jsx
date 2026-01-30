/**
 * LEADERBOARD.JSX - Classement Global
 * 
 * Affiche le classement des joueurs par ELO
 */

import React, { useState } from 'react';
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import DashboardLayout from './layouts/DashboardLayout';
import { GlassCard, GradientButton } from './shared/components/ui';
import { Trophy, Medal, TrendingUp, Target, Gamepad2, Crown, Award, Zap, Users } from 'lucide-react';

export default function Leaderboard() {
  const { isSignedIn, user } = useUser();
  const [filter, setFilter] = useState('all');

  // Récupérer le leaderboard
  const leaderboard = useQuery(api.users.getLeaderboard, { limit: 50 });
  const myRank = useQuery(api.users.getUserRank);

  // Session pour DashboardLayout
  const session = isSignedIn ? { user: { email: user?.primaryEmailAddress?.emailAddress } } : null;

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-[#94A3B8] font-bold">#{rank}</span>;
    }
  };

  const getRankBackground = (rank) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 2: return 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/30';
      case 3: return 'bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/30';
      default: return 'bg-[rgba(5,5,10,0.4)] border-white/5';
    }
  };

  const getEloColor = (elo) => {
    if (elo >= 2000) return 'text-yellow-400';
    if (elo >= 1800) return 'text-violet-400';
    if (elo >= 1600) return 'text-cyan-400';
    if (elo >= 1400) return 'text-emerald-400';
    return 'text-[#94A3B8]';
  };

  const getEloRank = (elo) => {
    if (elo >= 2000) return { name: 'Grand Master', color: 'text-yellow-400', icon: '👑' };
    if (elo >= 1800) return { name: 'Master', color: 'text-violet-400', icon: '💎' };
    if (elo >= 1600) return { name: 'Diamond', color: 'text-cyan-400', icon: '💠' };
    if (elo >= 1400) return { name: 'Platinum', color: 'text-emerald-400', icon: '🔷' };
    if (elo >= 1200) return { name: 'Gold', color: 'text-yellow-500', icon: '🥇' };
    return { name: 'Silver', color: 'text-gray-400', icon: '🥈' };
  };

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Classement Global
            </h1>
            <p className="text-[#94A3B8] mt-1">Les meilleurs joueurs de la plateforme</p>
          </div>
          
          {/* Filtres */}
          <div className="flex gap-2">
            {['all', 'valorant', 'lol', 'cs2'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f 
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' 
                    : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 border border-white/5'
                }`}
              >
                {f === 'all' ? 'Tous' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Ma position */}
        {myRank && myRank.rank && (
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm text-[#94A3B8]">Votre position</p>
                  <p className="text-2xl font-bold text-white">#{myRank.rank}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#94A3B8]">Votre ELO</p>
                <p className={`text-2xl font-bold ${getEloColor(myRank.eloRating)}`}>
                  {myRank.eloRating}
                </p>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-sm text-[#94A3B8]">Rang</p>
                <p className={`text-lg font-medium ${getEloRank(myRank.eloRating).color}`}>
                  {getEloRank(myRank.eloRating).icon} {getEloRank(myRank.eloRating).name}
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Statistiques globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-4 text-center">
            <Users className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{leaderboard?.length || 0}</p>
            <p className="text-sm text-[#94A3B8]">Joueurs classés</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {leaderboard?.[0]?.tournamentsWon || 0}
            </p>
            <p className="text-sm text-[#94A3B8]">Record tournois gagnés</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {leaderboard?.[0]?.eloRating || 1000}
            </p>
            <p className="text-sm text-[#94A3B8]">ELO le plus haut</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Target className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {Math.round(leaderboard?.[0]?.winRate || 0)}%
            </p>
            <p className="text-sm text-[#94A3B8]">Meilleur winrate</p>
          </GlassCard>
        </div>

        {/* Tableau du classement */}
        <GlassCard className="overflow-hidden">
          {/* En-tête */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-white/5 border-b border-white/10 text-sm font-medium text-[#94A3B8]">
            <div className="col-span-1">Rang</div>
            <div className="col-span-4">Joueur</div>
            <div className="col-span-2 text-center hidden md:block">ELO</div>
            <div className="col-span-2 text-center hidden md:block">Victoires</div>
            <div className="col-span-2 text-center hidden md:block">Winrate</div>
            <div className="col-span-1 text-center md:col-span-1">Rang</div>
          </div>

          {/* Corps */}
          <div className="divide-y divide-white/5">
            {leaderboard === undefined ? (
              // Loading
              [...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 animate-pulse">
                  <div className="col-span-1 h-6 bg-white/10 rounded" />
                  <div className="col-span-4 h-6 bg-white/10 rounded" />
                  <div className="col-span-2 h-6 bg-white/10 rounded hidden md:block" />
                  <div className="col-span-2 h-6 bg-white/10 rounded hidden md:block" />
                  <div className="col-span-2 h-6 bg-white/10 rounded hidden md:block" />
                  <div className="col-span-1 h-6 bg-white/10 rounded" />
                </div>
              ))
            ) : leaderboard.length === 0 ? (
              // Empty state
              <div className="py-16 text-center">
                <Gamepad2 className="w-16 h-16 text-[#64748B] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Pas encore de classement</h3>
                <p className="text-[#94A3B8] max-w-md mx-auto">
                  Le classement se remplira automatiquement lorsque les joueurs participeront à des tournois.
                </p>
              </div>
            ) : (
              // Liste des joueurs
              leaderboard.map((player) => (
                <div 
                  key={player.userId}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-white/5 border-l-2 ${getRankBackground(player.rank)}`}
                >
                  {/* Rang */}
                  <div className="col-span-1">
                    {getRankIcon(player.rank)}
                  </div>

                  {/* Joueur */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30 flex items-center justify-center text-lg font-bold text-white">
                      {player.avatar ? (
                        <img src={player.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        player.username?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">{player.username}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {player.tournamentsPlayed} tournois • {player.matchesPlayed} matchs
                      </p>
                    </div>
                  </div>

                  {/* ELO */}
                  <div className={`col-span-2 text-center font-bold text-lg hidden md:block ${getEloColor(player.eloRating)}`}>
                    {player.eloRating}
                  </div>

                  {/* Victoires */}
                  <div className="col-span-2 text-center hidden md:block">
                    <span className="text-emerald-400 font-medium">{player.matchesWon}</span>
                    <span className="text-[#64748B]"> / {player.matchesPlayed}</span>
                  </div>

                  {/* Winrate */}
                  <div className="col-span-2 text-center hidden md:block">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                          style={{ width: `${player.winRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-white">{Math.round(player.winRate)}%</span>
                    </div>
                  </div>

                  {/* Badge rang */}
                  <div className="col-span-1 text-center md:col-span-1">
                    <span className={`text-lg ${getEloRank(player.eloRating).color}`}>
                      {getEloRank(player.eloRating).icon}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Légende des rangs */}
        <GlassCard className="p-4">
          <h3 className="text-sm font-medium text-[#94A3B8] mb-3">Rangs ELO</h3>
          <div className="flex flex-wrap gap-4">
            {[
              { min: 2000, name: 'Grand Master', icon: '👑', color: 'text-yellow-400' },
              { min: 1800, name: 'Master', icon: '💎', color: 'text-violet-400' },
              { min: 1600, name: 'Diamond', icon: '💠', color: 'text-cyan-400' },
              { min: 1400, name: 'Platinum', icon: '🔷', color: 'text-emerald-400' },
              { min: 1200, name: 'Gold', icon: '🥇', color: 'text-yellow-500' },
              { min: 0, name: 'Silver', icon: '🥈', color: 'text-gray-400' },
            ].map((rank) => (
              <div key={rank.name} className="flex items-center gap-2 text-sm">
                <span>{rank.icon}</span>
                <span className={rank.color}>{rank.name}</span>
                <span className="text-[#64748B]">({rank.min}+)</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
