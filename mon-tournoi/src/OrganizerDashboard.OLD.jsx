import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import NotificationCenter from './NotificationCenter';
import { toast } from './utils/toast';
import DashboardLayout from './layouts/DashboardLayout';

export default function OrganizerDashboard({ session }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'draft', 'ongoing', 'completed'
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyTournaments();
  }, [session]);

  const fetchMyTournaments = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement:', error);
        setTournaments([]);
      } else {
        setTournaments(data || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Erreur lors de la déconnexion");
      } else {
        navigate('/');
        window.location.reload();
      }
    } catch (err) {
      console.error('Erreur déconnexion:', err);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const deleteTournament = async (e, id) => {
    e.stopPropagation();
    if (!confirm("⚠️ Supprimer ce tournoi et tous ses matchs ? C'est irréversible.")) return;

    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Impossible de supprimer: " + error.message);
      console.error(error);
    } else {
      toast.success("Tournoi supprimé avec succès");
      setTournaments(tournaments.filter(t => t.id !== id));
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'draft': return { bg: '#E7632C', text: 'Brouillon', icon: '📝' };
      case 'completed': return { bg: '#FF36A3', text: 'Terminé', icon: '🏁' };
      default: return { bg: '#C10468', text: 'En cours', icon: '⚔️' };
    }
  };

  if (loading) return (
    <DashboardLayout session={session}>
      <div className="text-fluky-text font-body text-center py-20">Chargement...</div>
    </DashboardLayout>
  );

  // Statistiques
  const draftCount = tournaments.filter(t => t.status === 'draft').length;
  const ongoingCount = tournaments.filter(t => t.status === 'ongoing').length;
  const completedCount = tournaments.filter(t => t.status === 'completed').length;

  // Filtrer les tournois selon le filtre actif
  const filteredTournaments = activeFilter === 'all' 
    ? tournaments 
    : tournaments.filter(t => {
        if (activeFilter === 'draft') return t.status === 'draft';
        if (activeFilter === 'ongoing') return t.status === 'ongoing';
        if (activeFilter === 'completed') return t.status === 'completed';
        return true;
      });

  return (
    <DashboardLayout session={session}>
      <div className="w-full max-w-7xl mx-auto">
        {/* STATISTIQUES RAPIDES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-6 text-center">
            <div className="font-display text-4xl font-bold text-fluky-secondary mb-2">{tournaments.length}</div>
            <div className="text-sm text-fluky-text font-body">Total Tournois</div>
          </div>
          <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-6 text-center">
            <div className="font-display text-4xl font-bold text-fluky-primary mb-2">{ongoingCount}</div>
            <div className="text-sm text-fluky-text font-body">En cours</div>
          </div>
          <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-6 text-center">
            <div className="font-display text-4xl font-bold text-fluky-accent-orange mb-2">{draftCount}</div>
            <div className="text-sm text-fluky-text font-body">Brouillons</div>
          </div>
          <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-6 text-center">
            <div className="font-display text-4xl font-bold text-fluky-secondary mb-2">{completedCount}</div>
            <div className="text-sm text-fluky-text font-body">Terminés</div>
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="bg-gradient-to-r from-fluky-primary/30 to-fluky-secondary/20 p-6 rounded-xl mb-10 border border-fluky-secondary">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-display text-2xl text-fluky-secondary mb-2" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>🚀 Prêt à créer un nouveau tournoi ?</h3>
              <p className="text-fluky-text font-body text-sm">
                Organisez votre événement en quelques clics
              </p>
            </div>
            <button 
              type="button"
              onClick={() => navigate('/create-tournament')} 
              className="px-8 py-3 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-base uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
            >
              Créer un Tournoi
            </button>
          </div>
        </div>

        {/* LISTE DES TOURNOIS */}
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <h2 className="font-display text-3xl text-fluky-secondary" style={{ textShadow: '0 0 15px rgba(193, 4, 104, 0.5)' }}>Mes Tournois</h2>
            <div className="flex gap-2 flex-wrap">
              <button 
                type="button"
                onClick={() => setActiveFilter('draft')}
                className={`px-4 py-2 rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 ${
                  activeFilter === 'draft'
                    ? 'bg-fluky-accent-orange border-2 border-fluky-accent-orange text-white'
                    : 'bg-transparent border-2 border-fluky-secondary text-fluky-text hover:bg-fluky-primary hover:border-fluky-secondary'
                }`}
              >
                Brouillons ({draftCount})
              </button>
              <button 
                type="button"
                onClick={() => setActiveFilter('ongoing')}
                className={`px-4 py-2 rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 ${
                  activeFilter === 'ongoing'
                    ? 'bg-fluky-primary border-2 border-fluky-primary text-white'
                    : 'bg-transparent border-2 border-fluky-secondary text-fluky-text hover:bg-fluky-primary hover:border-fluky-secondary'
                }`}
              >
                En cours ({ongoingCount})
              </button>
              <button 
                type="button"
                onClick={() => setActiveFilter('completed')}
                className={`px-4 py-2 rounded-lg font-display text-sm uppercase tracking-wide transition-all duration-300 ${
                  activeFilter === 'completed'
                    ? 'bg-fluky-secondary border-2 border-fluky-secondary text-white'
                    : 'bg-transparent border-2 border-fluky-secondary text-fluky-text hover:bg-fluky-primary hover:border-fluky-secondary'
                }`}
              >
                Terminés ({completedCount})
              </button>
            </div>
          </div>

          {filteredTournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTournaments.map((t) => {
                const statusStyle = getStatusStyle(t.status);
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => navigate(`/organizer/tournament/${t.id}`)}
                    className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-fluky-primary hover:-translate-y-1 hover:shadow-2xl hover:shadow-fluky-primary/40 relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-display text-xl text-fluky-text mb-2">{t.name}</h3>
                        <div className="text-sm text-fluky-text flex gap-4 mt-2 font-body">
                          <span>🎮 {t.game}</span>
                          <span>📊 {t.format}</span>
                        </div>
                        <div className="text-xs text-fluky-text/70 mt-2 font-body">
                          Créé le {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-lg text-sm font-bold whitespace-nowrap text-white font-body" style={{ background: statusStyle.bg }}>
                        {statusStyle.icon} {statusStyle.text}
                      </span>
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-white/5">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTournament(e, t.id);
                        }}
                        className="px-3 py-1 bg-transparent border-2 border-fluky-primary text-fluky-text rounded-lg font-display text-xs uppercase tracking-wide transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-secondary"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-16 text-center">
              <div className="text-6xl mb-5">🎯</div>
              <h3 className="font-display text-2xl text-fluky-text mb-4">
                {tournaments.length === 0 
                  ? 'Aucun tournoi créé' 
                  : `Aucun tournoi ${activeFilter === 'draft' ? 'brouillon' : activeFilter === 'ongoing' ? 'en cours' : activeFilter === 'completed' ? 'terminé' : ''}`}
              </h3>
              <p className="text-fluky-text mb-8 font-body">
                {tournaments.length === 0 
                  ? 'Créez votre premier tournoi pour commencer à organiser'
                  : 'Essayez un autre filtre ou créez un nouveau tournoi'}
              </p>
              <button 
                type="button"
                onClick={() => navigate('/create-tournament')} 
                className="px-8 py-3 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-base uppercase tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50"
              >
                + Créer un Tournoi
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
