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
        className={`w-20 h-20 rounded-xl object-cover ${isMyTeam ? 'border-[3px] border-fluky-secondary' : 'border-2 border-fluky-primary'}`}
        alt={team.name}
      />
      <h3 className="mt-2.5 font-handwriting text-fluky-text">{team.name}</h3>
      
      {/* Compte gaming */}
      {gamingAccount && tournamentGame && (
        <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-gray-400 italic font-body">
          <img 
            src={PLATFORM_LOGOS[gamingAccount.platform]} 
            alt=""
            className="w-4 h-4"
          />
          <span>
            {formatGamertag(gamingAccount.game_username, gamingAccount.game_tag, gamingAccount.platform)}
          </span>
        </div>
      )}
      
      {isMyTeam && (
        <span className="text-xs text-fluky-secondary font-body">👤 Mon équipe</span>
      )}
      
      {hasReported && isMyTeam && (
        <div className="mt-1 text-xs text-fluky-primary font-body">✅ Score déclaré</div>
      )}
    </div>
  );
}
