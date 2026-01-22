import React from 'react';
import { formatGamertag, PLATFORM_LOGOS } from '../../utils/gamePlatforms';

/**
 * Affiche une équipe avec son logo, nom et compte gaming
 */
export default function TeamDisplay({ 
  team, 
  isMyTeam, 
  hasReported, 
  gamingAccount, 
  tournamentGame 
}) {
  if (!team) return null;

  return (
    <div className="text-center flex-1">
      <img 
        src={team.logo_url || `https://ui-avatars.com/api/?name=${team.tag}&background=random&size=128`} 
        className={`w-20 h-20 rounded-xl object-cover ${isMyTeam ? 'border-[3px] border-cyan-500' : 'border-2 border-violet-500'}`}
        alt={team.name}
      />
      <h3 className="mt-2.5 font-handwriting text-white">{team.name}</h3>
      
      {/* Compte gaming - Affiché en gris sombre, italique sous le pseudo du site */}
      {gamingAccount && tournamentGame && (
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <img 
            src={PLATFORM_LOGOS[gamingAccount.platform]} 
            alt={gamingAccount.platform}
            className="w-4 h-4 opacity-70"
          />
          <span className="text-xs text-gray-500 italic font-body">
            {formatGamertag(gamingAccount.game_username, gamingAccount.game_tag, gamingAccount.platform)}
          </span>
        </div>
      )}
      
      {/* Avertissement si pas de compte gaming configuré */}
      {!gamingAccount && tournamentGame && (
        <div className="mt-1.5 text-xs text-yellow-500/70 italic font-body">
          ⚠️ Compte gaming non configuré
        </div>
      )}
      
      {isMyTeam && (
        <span className="text-xs text-cyan-400 font-body">👤 Mon équipe</span>
      )}
      
      {hasReported && isMyTeam && (
        <div className="mt-1 text-xs text-violet-400 font-body">✅ Score déclaré</div>
      )}
    </div>
  );
}
