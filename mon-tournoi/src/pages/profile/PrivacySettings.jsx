import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { GradientButton, Card, Input, PageHeader } from '../../shared/components/ui';
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
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Convex queries - automatically reactive
  const currentUser = useQuery(api.users.getCurrent);
  const userData = currentUser;
  const loading = currentUser === undefined;

  /**
   * Export des données personnelles (Droit à la portabilité)
   * Note: In a full Convex migration, this would be a Convex action
   */
  const handleExportData = async () => {
    setExporting(true);
    try {
      // Compile available data from current user
      const exportData = {
        export_date: new Date().toISOString(),
        user_info: {
          email: session?.user?.emailAddresses?.[0]?.emailAddress || userData?.email,
          created_at: userData?.createdAt,
        },
        profile: userData || {},
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
   * Note: In a full Convex migration, this would be a Convex action/mutation
   * For now, we redirect to contact since account deletion needs server-side handling
   */
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER') {
      toast.error('Veuillez taper "SUPPRIMER" pour confirmer');
      return;
    }

    setDeleting(true);
    try {
      // Note: Account deletion should be handled via a Convex mutation
      // that cascades through all related data and then signs out the user.
      // For now, show a message to contact support
      toast.info('Pour supprimer votre compte, veuillez contacter contact@flukyboys.fr');
      
      // In the future, implement: await deleteAccountMutation();
      // Then sign out: await signOut();
      
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
      {/* Premium Header with Gradient */}
      <PageHeader
        title="Vie privée & Données personnelles"
        subtitle="Gérez vos données personnelles et exercez vos droits RGPD"
        gradient={true}
      />

      {/* Vos données */}
      <Card variant="glass" padding="lg" className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          📋 Vos données personnelles
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-400">Email</span>
            <span className="text-white">{session?.user?.emailAddresses?.[0]?.emailAddress || userData?.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-400">Nom d'utilisateur</span>
            <span className="text-white">{userData?.username || '-'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/10">
            <span className="text-gray-400">Compte créé le</span>
            <span className="text-white">
              {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('fr-FR') : '-'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">Dernière connexion</span>
            <span className="text-white">
              {userData?.updatedAt
                ? new Date(userData.updatedAt).toLocaleDateString('fr-FR')
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
        <GradientButton
          onClick={handleExportData}
          disabled={exporting}
          variant="secondary"
        >
          {exporting ? '⏳ Export en cours...' : '📥 Télécharger mes données'}
        </GradientButton>
      </Card>

      {/* Gestion des cookies */}
      <Card variant="glass" padding="lg" className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          🍪 Préférences cookies
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Gérez vos préférences de cookies et traceurs.
        </p>
        <GradientButton
          onClick={openCookieSettings}
          variant="secondary"
        >
          ⚙️ Gérer mes cookies
        </GradientButton>
      </Card>

      {/* Droit de rectification */}
      <Card variant="glass" padding="lg" className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          ✏️ Rectifier vos données
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Vous pouvez modifier vos informations personnelles à tout moment depuis votre profil.
        </p>
        <GradientButton
          onClick={() => navigate('/profile')}
          variant="secondary"
        >
          👤 Modifier mon profil
        </GradientButton>
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
        <GradientButton
          onClick={() => setShowDeleteModal(true)}
          variant="warning"
        >
          🗑️ Supprimer mon compte
        </GradientButton>
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
              <GradientButton
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm('');
                }}
                variant="secondary"
                className="flex-1"
              >
                Annuler
              </GradientButton>
              <GradientButton
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirm !== 'SUPPRIMER'}
                variant="warning"
                className="flex-1"
              >
                {deleting ? '⏳ Suppression...' : '🗑️ Supprimer définitivement'}
              </GradientButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
