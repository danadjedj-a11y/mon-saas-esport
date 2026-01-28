import { useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { GradientButton, Modal, GlassCard, PageHeader } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

export default function SettingsOperations() {
  const { id: tournamentId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast.success('Tournoi publié avec succès');
      setShowPublishModal(false);

      if (context?.refreshTournament) {
        context.refreshTournament();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: 'draft' })
        .eq('id', tournamentId);

      if (error) throw error;

      toast.success('Tournoi dépublié');
      setShowPublishModal(false);

      if (context?.refreshTournament) {
        context.refreshTournament();
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la dépublication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      // Récupérer les données complètes du tournoi
      const { data: originalTournament, error: fetchError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (fetchError) throw fetchError;

      // Créer une copie sans certains champs
      const { id, created_at, updated_at, ...tournamentData } = originalTournament;

      const { data: newTournament, error: createError } = await supabase
        .from('tournaments')
        .insert({
          ...tournamentData,
          name: `${tournamentData.name} (copie)`,
          status: 'draft',
          published_at: null,
        })
        .select()
        .single();

      if (createError) throw createError;

      toast.success('Tournoi dupliqué avec succès');
      setShowDuplicateModal(false);

      // Rediriger vers le nouveau tournoi
      navigate(`/organizer/tournament/${newTournament.id}`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la duplication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', tournamentId);

      if (error) throw error;

      toast.success('Tournoi archivé');
      setShowArchiveModal(false);
      navigate('/organizer');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'archivage");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== tournament?.name) {
      toast.error('Le nom ne correspond pas');
      return;
    }

    setIsLoading(true);
    try {
      // Supprimer les données associées
      await supabase.from('participants').delete().eq('tournament_id', tournamentId);
      await supabase.from('matches').delete().eq('tournament_id', tournamentId);

      // Supprimer le tournoi
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (error) throw error;

      toast.success('Tournoi supprimé définitivement');
      navigate('/organizer');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  const isPublished = tournament?.status === 'published';
  const isArchived = tournament?.status === 'archived';

  return (
    <div className="max-w-3xl mx-auto">      {/* Premium Header with Gradient */}
      <PageHeader
        title="Opérations"
        subtitle="Gérez les opérations et actions du tournoi"
        gradient={true}
      />

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Publier */}
        <div
          onClick={() => !isArchived && setShowPublishModal(true)}
          className={`bg-[#2a2d3e] rounded-xl border border-white/10 p-6 cursor-pointer transition-all ${isArchived ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan/30 hover:bg-[#2a2d3e]/80'
            }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">
                {isPublished ? 'Dépublier' : 'Publier'}
              </h3>
              <p className="text-sm text-gray-400">
                {isPublished
                  ? 'Repasser le tournoi en brouillon'
                  : 'Rendre le tournoi visible au public'
                }
              </p>
              {isPublished && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                  Publié
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dupliquer */}
        <div
          onClick={() => setShowDuplicateModal(true)}
          className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 cursor-pointer hover:border-violet/30 hover:bg-[#2a2d3e]/80 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Dupliquer</h3>
              <p className="text-sm text-gray-400">
                Créer une copie de ce tournoi
              </p>
            </div>
          </div>
        </div>

        {/* Archiver */}
        <div
          onClick={() => !isArchived && setShowArchiveModal(true)}
          className={`bg-[#2a2d3e] rounded-xl border border-white/10 p-6 cursor-pointer transition-all ${isArchived ? 'opacity-50 cursor-not-allowed' : 'hover:border-amber-500/30 hover:bg-[#2a2d3e]/80'
            }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Archiver</h3>
              <p className="text-sm text-gray-400">
                Déplacer le tournoi dans les archives
              </p>
              {isArchived && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                  Archivé
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Supprimer */}
        <div
          onClick={() => setShowDeleteModal(true)}
          className="bg-[#2a2d3e] rounded-xl border border-white/10 p-6 cursor-pointer hover:border-red-500/30 hover:bg-[#2a2d3e]/80 transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Supprimer</h3>
              <p className="text-sm text-gray-400">
                Supprimer définitivement le tournoi
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Modal */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title={isPublished ? 'Dépublier le tournoi' : 'Publier le tournoi'}
      >
        <div className="p-4 space-y-4">
          <p className="text-gray-400">
            {isPublished
              ? 'Êtes-vous sûr de vouloir dépublier ce tournoi ? Il ne sera plus visible publiquement.'
              : 'Êtes-vous sûr de vouloir publier ce tournoi ? Il sera visible par tous les utilisateurs.'
            }
          </p>

          <div className="flex justify-end gap-3">
            <GradientButton variant="ghost" onClick={() => setShowPublishModal(false)}>
              Annuler
            </GradientButton>
            <GradientButton
              onClick={isPublished ? handleUnpublish : handlePublish}
              disabled={isLoading}
              className={isPublished ? 'bg-gray-600 hover:bg-gray-700' : 'bg-cyan hover:bg-cyan/90'}
            >
              {isLoading ? 'En cours...' : (isPublished ? 'Dépublier' : 'Publier')}
            </GradientButton>
          </div>
        </div>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="Dupliquer le tournoi"
      >
        <div className="p-4 space-y-4">
          <p className="text-gray-400">
            Une copie du tournoi sera créée avec les mêmes paramètres, mais sans les participants ni les matchs.
          </p>

          <div className="flex justify-end gap-3">
            <GradientButton variant="ghost" onClick={() => setShowDuplicateModal(false)}>
              Annuler
            </GradientButton>
            <GradientButton
              onClick={handleDuplicate}
              disabled={isLoading}
              className="bg-violet hover:bg-violet/90"
            >
              {isLoading ? 'Duplication...' : 'Dupliquer'}
            </GradientButton>
          </div>
        </div>
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archiver le tournoi"
      >
        <div className="p-4 space-y-4">
          <p className="text-gray-400">
            Le tournoi sera déplacé dans vos archives. Vous pourrez toujours le consulter mais il ne sera plus modifiable.
          </p>

          <div className="flex justify-end gap-3">
            <GradientButton variant="ghost" onClick={() => setShowArchiveModal(false)}>
              Annuler
            </GradientButton>
            <GradientButton
              onClick={handleArchive}
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isLoading ? 'Archivage...' : 'Archiver'}
            </GradientButton>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirm('');
        }}
        title="Supprimer le tournoi"
      >
        <div className="p-4 space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 font-medium mb-2">
              ⚠️ Cette action est irréversible
            </p>
            <p className="text-sm text-gray-400">
              Toutes les données du tournoi seront définitivement supprimées : participants, matchs, résultats, etc.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pour confirmer, tapez le nom du tournoi : <span className="text-white">{tournament?.name}</span>
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full bg-[#1a1d2e] border border-white/10 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder={tournament?.name}
            />
          </div>

          <div className="flex justify-end gap-3">
            <GradientButton
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirm('');
              }}
            >
              Annuler
            </GradientButton>
            <GradientButton
              onClick={handleDelete}
              disabled={isLoading || deleteConfirm !== tournament?.name}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Suppression...' : 'Supprimer définitivement'}
            </GradientButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
