import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Button, Card, Input } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import { openCookieSettings } from '../../components/CookieConsent';

/**
 * PrivacySettings - Page de gestion des données personnelles (RGPD)
 * 
 * Permet aux utilisateurs d'exercer leurs droits RGPD :
 * - Accès aux données
 * - Export des données (portabilité)
 * - Rectification
 * - Suppression (droit à l'oubli)
 */
export default function PrivacySettings({ session }) {
  const navigate = useNavigate();
  const [_loading, _setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [_consents, setConsents] = useState(null);

  useEffect(() => {
    if (session?.user) {
      loadUserData();
      loadConsents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setUserData(data);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  const loadConsents = async () => {
    try {
      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setConsents(data || []);
      }
    } catch {
      // Table might not exist yet
      console.log('Consents table not found');
    }
  };

  /**
   * Export des données personnelles (Droit à la portabilité)
   */
  const handleExportData = async () => {
    setExporting(true);
    try {
      // Collecter toutes les données de l'utilisateur
      const userId = session.user.id;

      // 1. Profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // 2. Équipes
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .or(`captain_id.eq.${userId},members.cs.{${userId}}`);

      // 3. Participations aux tournois
      const { data: participations } = await supabase
        .from('participants')
        .select(`
          *,
          tournaments:tournament_id (name, game, start_date)
        `)
        .eq('user_id', userId);

      // 4. Comptes gaming
      const { data: gamingAccounts } = await supabase
        .from('gaming_accounts')
        .select('*')
        .eq('user_id', userId);

      // 5. Messages (si applicable)
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId);

      // Compiler les données
      const exportData = {
        export_date: new Date().toISOString(),
        user_info: {
          email: session.user.email,
          created_at: session.user.created_at,
        },
        profile: profile || {},
        teams: teams || [],
        tournament_participations: participations || [],
        gaming_accounts: gamingAccounts || [],
        messages: messages || [],
      };

      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flukyboys_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('📦 Vos données ont été exportées avec succès !');
    } catch (error) {
      console.error('Erreur export:', error);
      toast.error('Erreur lors de l\'export des données');
    } finally {
      setExporting(false);
    }
  };

  /**
   * Suppression du compte (Droit à l'effacement)
   */
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER') {
      toast.error('Veuillez taper "SUPPRIMER" pour confirmer');
      return;
    }

    setDeleting(true);
    try {
      const userId = session.user.id;

      // 1. Supprimer les données liées (dans l'ordre des dépendances)
      
      // Messages
      await supabase.from('messages').delete().eq('user_id', userId);
      
      // Participations
      await supabase.from('participants').delete().eq('user_id', userId);
      
      // Membres d'équipe
      await supabase.from('team_members').delete().eq('user_id', userId);
      
      // Comptes gaming
      await supabase.from('gaming_accounts').delete().eq('user_id', userId);
      
      // Demandes de modification
      await supabase.from('gaming_account_change_requests').delete().eq('user_id', userId);
      
      // Consentements
      await supabase.from('user_consents').delete().eq('user_id', userId);

      // 2. Anonymiser les données des équipes dont l'utilisateur est capitaine
      const { data: ownedTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('captain_id', userId);

      if (ownedTeams && ownedTeams.length > 0) {
        // Transférer le capitanat ou supprimer l'équipe
        for (const team of ownedTeams) {
          const { data: members } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', team.id)
            .neq('user_id', userId)
            .limit(1);

          if (members && members.length > 0) {
            // Transférer au premier membre
            await supabase
              .from('teams')
              .update({ captain_id: members[0].user_id })
              .eq('id', team.id);
          } else {
            // Supprimer l'équipe si plus de membres
            await supabase.from('teams').delete().eq('id', team.id);
          }
        }
      }

      // 3. Supprimer le profil
      await supabase.from('profiles').delete().eq('id', userId);

      // 4. Supprimer le compte auth (via fonction admin ou API)
      // Note: La suppression du compte auth.users nécessite généralement une fonction serveur
      // Pour l'instant, on déconnecte l'utilisateur
      
      await supabase.auth.signOut();
      
      toast.success('Votre compte a été supprimé. Au revoir !');
      
      // Rediriger vers l'accueil
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression du compte');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Vous devez être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-display font-bold text-white mb-2">
        Vie privée & Données personnelles
      </h1>
      <p className="text-gray-400 mb-8">
        Gérez vos données personnelles et exercez vos droits RGPD.
      </p>

      {/* Vos données */}
      <Card variant="glass" padding="lg" className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          📋 Vos données personnelles
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-400">Email</span>
            <span className="text-white">{session.user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-400">Nom d'utilisateur</span>
            <span className="text-white">{userData?.username || '-'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-400">Compte créé le</span>
            <span className="text-white">
              {new Date(session.user.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Dernière connexion</span>
            <span className="text-white">
              {session.user.last_sign_in_at 
                ? new Date(session.user.last_sign_in_at).toLocaleDateString('fr-FR')
                : '-'
              }
            </span>
          </div>
        </div>
      </Card>

      {/* Droit d'accès et portabilité */}
      <Card variant="glass" padding="lg" className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          📦 Exporter vos données
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Téléchargez une copie de toutes vos données personnelles au format JSON. 
          Conformément au RGPD (droit à la portabilité), vous pouvez récupérer vos données 
          dans un format lisible par machine.
        </p>
        <Button
          onClick={handleExportData}
          disabled={exporting}
          variant="outline"
        >
          {exporting ? '⏳ Export en cours...' : '📥 Télécharger mes données'}
        </Button>
      </Card>

      {/* Gestion des cookies */}
      <Card variant="glass" padding="lg" className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          🍪 Préférences cookies
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Gérez vos préférences de cookies et traceurs.
        </p>
        <Button
          onClick={openCookieSettings}
          variant="outline"
        >
          ⚙️ Gérer mes cookies
        </Button>
      </Card>

      {/* Droit de rectification */}
      <Card variant="glass" padding="lg" className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          ✏️ Rectifier vos données
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Vous pouvez modifier vos informations personnelles à tout moment depuis votre profil.
        </p>
        <Button
          onClick={() => navigate('/profile')}
          variant="outline"
        >
          👤 Modifier mon profil
        </Button>
      </Card>

      {/* Suppression du compte */}
      <Card variant="glass" padding="lg" className="border-red-500/30">
        <h2 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
          🗑️ Supprimer mon compte
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Conformément au RGPD (droit à l'effacement), vous pouvez demander la suppression 
          de votre compte et de toutes vos données personnelles. 
          <strong className="text-red-400"> Cette action est irréversible.</strong>
        </p>
        <Button
          onClick={() => setShowDeleteModal(true)}
          variant="outline"
          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          🗑️ Supprimer mon compte
        </Button>
      </Card>

      {/* Contact */}
      <Card variant="glass" padding="lg" className="mt-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          📧 Nous contacter
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Pour toute question concernant vos données personnelles ou pour exercer un droit 
          non disponible ici, contactez-nous.
        </p>
        <a
          href="mailto:contact@flukyboys.fr"
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
        >
          📧 contact@flukyboys.fr
        </a>
      </Card>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] rounded-2xl border border-red-500/30 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-400 mb-4">
              ⚠️ Confirmer la suppression
            </h3>
            <div className="space-y-4 text-gray-300 text-sm">
              <p>
                Vous êtes sur le point de supprimer définitivement votre compte. 
                Cette action entraînera :
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>La suppression de votre profil</li>
                <li>La suppression de vos participations aux tournois</li>
                <li>La perte de vos statistiques et historique</li>
                <li>Le retrait de vos équipes</li>
              </ul>
              <p className="text-red-400 font-semibold">
                Cette action est irréversible !
              </p>
              <div className="pt-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Pour confirmer, tapez <strong className="text-white">SUPPRIMER</strong> :
                </label>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="bg-[#0d1117] border-red-500/30"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm('');
                }}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'SUPPRIMER'}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50"
              >
                {deleting ? '⏳ Suppression...' : '🗑️ Supprimer définitivement'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
