import { useNavigate } from 'react-router-dom';
import TeamJoinButton from '../../TeamJoinButton';
import { supabase } from '../../supabaseClient';
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
    <div className="bg-fluky-bg/95 p-8 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/30">
      <h2 className="mt-0 text-fluky-accent font-handwriting text-3xl mb-6">
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

      {/* BOUTON D'INSCRIPTION */}
      {tournoi.status === 'draft' && (
        <div className="mt-8 bg-gradient-to-br from-fluky-primary to-fluky-accent p-6 rounded-xl border-2 border-fluky-accent shadow-lg shadow-fluky-primary/40">
          <h3 className="m-0 mb-4 text-fluky-text text-2xl font-handwriting">
            🎯 Inscription au Tournoi
          </h3>
          {session ? (
            <TeamJoinButton 
              tournamentId={tournamentId} 
              supabase={supabase} 
              session={session} 
              onJoinSuccess={onRefetch} 
              tournament={tournoi} 
            />
          ) : (
            <div>
              <p className="m-0 mb-4 text-fluky-text text-sm font-display">
                Connectez-vous pour vous inscrire à ce tournoi avec votre équipe
              </p>
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="px-8 py-3 bg-fluky-bg text-fluky-text border-2 border-fluky-accent rounded-lg cursor-pointer font-handwriting text-base uppercase tracking-wider transition-all duration-300 hover:bg-fluky-accent hover:border-fluky-primary hover:-translate-y-0.5"
              >
                🔐 Se Connecter
              </button>
            </div>
          )}
        </div>
      )}

      {/* RÈGLEMENT */}
      {tournoi.rules && (
        <div className="mt-8 bg-fluky-bg/80 p-6 rounded-xl border-2 border-fluky-primary">
          <h3 className="m-0 mb-4 text-fluky-accent text-2xl font-handwriting">
            📋 Règlement du Tournoi
          </h3>
          <div className="text-fluky-text leading-7 whitespace-pre-wrap font-display text-sm">
            {tournoi.rules}
          </div>
        </div>
      )}

      {/* PROGRESSION */}
      {matches.length > 0 && (
        <div className="mt-8 bg-fluky-bg/80 p-5 rounded-xl border-2 border-fluky-primary">
          <div className="text-sm text-fluky-accent mb-2.5 font-display">
            Progression
          </div>
          <div className="text-base text-fluky-text font-display mb-2.5">
            {matches.filter(m => m.status === 'completed').length} / {matches.length} matchs joués
          </div>
          <div className="w-full h-3 bg-fluky-bg/50 rounded-md mt-2.5 overflow-hidden border border-fluky-accent">
            <div 
              className="h-full bg-gradient-to-r from-fluky-primary to-fluky-accent transition-all duration-300"
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
    <div className="bg-fluky-bg/80 p-5 rounded-xl border-2 border-fluky-primary">
      <div className="text-sm text-fluky-accent mb-2 font-display">{label}</div>
      <div className={`text-xl font-bold font-handwriting ${isExpired ? 'text-fluky-orange' : 'text-fluky-text'}`}>
        {value}
        {isExpired && ' (Expirée)'}
      </div>
      {extra && (
        <div className="text-sm text-fluky-accent mt-2 font-display">
          {extra}
        </div>
      )}
    </div>
  );
}
