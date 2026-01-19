import { useNavigate } from 'react-router-dom';
import { TournamentRegistration } from '../registration';
import { getFormatLabel } from './TournamentHeader';

export default function TournamentOverview({ 
  tournoi, 
  participants, 
  matches, 
  session, 
  tournamentId, 
  onRefetch 
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-900/95 p-8 rounded-xl border-2 border-cyan-400 shadow-lg shadow-violet-500/30">
      <h2 className="mt-0 text-cyan-400 font-handwriting text-3xl mb-6">
        Informations du tournoi
      </h2>
      
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mt-5">
        {/* Jeu */}
        <InfoCard label="Jeu" value={tournoi.game} />
        
        {/* Format */}
        <InfoCard 
          label="Format" 
          value={getFormatLabel(tournoi.format)}
          extra={tournoi.best_of > 1 ? `🎮 Best-of-${tournoi.best_of}` : null}
        />
        
        {/* Équipes inscrites */}
        <InfoCard 
          label="Équipes inscrites" 
          value={`${participants.length}${tournoi.max_participants ? ` / ${tournoi.max_participants}` : ''}`}
        />
        
        {/* Date limite d'inscription */}
        {tournoi.registration_deadline && (
          <InfoCard 
            label="Date limite d'inscription"
            value={new Date(tournoi.registration_deadline).toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit',
              minute: '2-digit'
            })}
            isExpired={new Date(tournoi.registration_deadline) < new Date()}
          />
        )}
        
        {/* Date de début */}
        {tournoi.start_date && (
          <InfoCard 
            label="Date de début"
            value={new Date(tournoi.start_date).toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          />
        )}
      </div>

      {/* BOUTON D'INSCRIPTION - Nouveau système avec équipe temporaire */}
      {tournoi.status === 'draft' && (
        <div className="mt-8">
          <TournamentRegistration
            tournamentId={tournamentId}
            tournament={tournoi}
            session={session}
            onSuccess={onRefetch}
          />
        </div>
      )}

      {/* RÈGLEMENT */}
      {tournoi.rules && (
        <div className="mt-8 bg-gray-900/80 p-6 rounded-xl border-2 border-violet-500">
          <h3 className="m-0 mb-4 text-cyan-400 text-2xl font-handwriting">
            📋 Règlement du Tournoi
          </h3>
          <div className="text-white leading-7 whitespace-pre-wrap font-display text-sm">
            {tournoi.rules}
          </div>
        </div>
      )}

      {/* PROGRESSION */}
      {matches.length > 0 && (
        <div className="mt-8 bg-gray-900/80 p-5 rounded-xl border-2 border-violet-500">
          <div className="text-sm text-cyan-400 mb-2.5 font-display">
            Progression
          </div>
          <div className="text-base text-white font-display mb-2.5">
            {matches.filter(m => m.status === 'completed').length} / {matches.length} matchs joués
          </div>
          <div className="w-full h-3 bg-gray-900/50 rounded-md mt-2.5 overflow-hidden border border-cyan-400">
            <div 
              className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all duration-300"
              style={{ width: `${(matches.filter(m => m.status === 'completed').length / matches.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, extra, isExpired }) {
  return (
    <div className="bg-gray-900/80 p-5 rounded-xl border-2 border-violet-500">
      <div className="text-sm text-cyan-400 mb-2 font-display">{label}</div>
      <div className={`text-xl font-bold font-handwriting ${isExpired ? 'text-orange-400' : 'text-white'}`}>
        {value}
        {isExpired && ' (Expirée)'}
      </div>
      {extra && (
        <div className="text-sm text-cyan-400 mt-2 font-display">
          {extra}
        </div>
      )}
    </div>
  );
}
