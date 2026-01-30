import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { GradientButton, Input, Modal, GlassCard, PageHeader } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

const PERMISSION_OPTIONS = [
  { id: 'admin_tournament', label: 'Administrer tournoi', description: 'Accès complet au tournoi' },
  { id: 'settings', label: 'Paramètres du tournoi', description: 'Modifier les paramètres généraux' },
  { id: 'structure', label: 'Gestion de la structure', description: 'Gérer les phases et le bracket' },
  { id: 'report_results', label: 'Rapporter résultats', description: 'Entrer les scores des matchs' },
  { id: 'manage_participants', label: 'Gérer participants', description: 'Ajouter/supprimer des participants' },
  { id: 'place_participants', label: 'Placer participants', description: 'Placer dans le bracket' },
  { id: 'manage_registrations', label: 'Gérer inscriptions', description: 'Accepter/refuser les inscriptions' },
  { id: 'manage_standings', label: 'Gestion du classement final', description: 'Modifier le classement' },
];

export default function SettingsPermissions() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPermissions, setNewUserPermissions] = useState([]);

  useEffect(() => {
    // TODO: Implement Convex query for tournament_roles when table is added
    // For now, just set loading to false
    setLoading(false);
  }, [tournamentId]);

  // Note: tournament_roles table needs to be added to Convex schema
  // For now, this is a placeholder implementation

  const handleTogglePermission = (permissionId) => {
    setNewUserPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      toast.error("L'email est requis");
      return;
    }

    try {
      // TODO: Implement Convex mutation for adding tournament roles
      // This requires adding tournament_roles table to Convex schema
      toast.info('Fonctionnalité en cours de migration vers Convex');
      setShowAddUserModal(false);
      setNewUserEmail('');
      setNewUserPermissions([]);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Retirer cet utilisateur des permissions ?')) return;

    try {
      // TODO: Implement Convex mutation for removing tournament roles
      toast.info('Fonctionnalité en cours de migration vers Convex');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setNewUserPermissions(user.permissions || []);
    setShowAddUserModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      // TODO: Implement Convex mutation for updating tournament roles
      toast.info('Fonctionnalité en cours de migration vers Convex');
      setShowAddUserModal(false);
      setEditingUser(null);
      setNewUserPermissions([]);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">      {/* Premium Header with Gradient */}
      <PageHeader 
        title="Permissions"
        subtitle="Gérez les droits d'accès et les rôles des utilisateurs"
        gradient={true}
      />

      {/* Users Section */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Permissions utilisateur
          </h2>
          <button
            onClick={() => {
              setEditingUser(null);
              setNewUserEmail('');
              setNewUserPermissions([]);
              setShowAddUserModal(true);
            }}
            className="text-cyan hover:text-cyan/80 text-sm font-medium"
          >
            Ajouter un utilisateur
          </button>
        </div>

        {/* Owner (toujours affiché) */}
        {context?.tournament?.owner_id && (
          <div className="bg-[#1a1d2e] rounded-lg p-4 border border-white/5 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">
                  {context.tournament.owner_email || 'Propriétaire'}
                  <span className="ml-2 px-2 py-0.5 bg-violet/20 text-violet text-xs rounded">
                    Owner
                  </span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Tous les droits
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Liste des utilisateurs avec permissions */}
        {users.length > 0 ? (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-[#1a1d2e] rounded-lg p-4 border border-white/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">
                      {user.profiles?.email || user.profiles?.username || 'Utilisateur'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(user.permissions || []).map(p => 
                        PERMISSION_OPTIONS.find(o => o.id === p)?.label
                      ).filter(Boolean).join(', ') || 'Aucune permission'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleRemoveUser(user.user_id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Aucun utilisateur avec des permissions spécifiques.
          </p>
        )}
      </GlassCard>

      {/* Groups Section */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Permissions du groupe
          </h2>
          <button
            onClick={() => setShowAddGroupModal(true)}
            className="text-cyan hover:text-cyan/80 text-sm font-medium"
          >
            Ajouter un groupe
          </button>
        </div>

        <p className="text-gray-500 text-sm">
          Aucun groupe
        </p>
      </GlassCard>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => {
          setShowAddUserModal(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Modifier les permissions' : 'Ajouter un utilisateur'}
        size="lg"
      >
        <div className="p-4 space-y-6">
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email de l'utilisateur
              </label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="utilisateur@example.com"
                className="bg-[#1a1d2e] border-white/10"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Permissions
            </label>
            <div className="space-y-2">
              {PERMISSION_OPTIONS.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-3 p-3 bg-[#1a1d2e] rounded-lg cursor-pointer hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={newUserPermissions.includes(permission.id)}
                    onChange={() => handleTogglePermission(permission.id)}
                    className="w-4 h-4 mt-0.5 accent-cyan rounded"
                  />
                  <div>
                    <p className="font-medium text-white">{permission.label}</p>
                    <p className="text-sm text-gray-500">{permission.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <GradientButton
              variant="ghost"
              onClick={() => {
                setShowAddUserModal(false);
                setEditingUser(null);
              }}
            >
              Annuler
            </GradientButton>
            <GradientButton
              onClick={editingUser ? handleUpdateUser : handleAddUser}
              variant="primary"
            >
              {editingUser ? 'Mettre à jour' : 'Ajouter'}
            </GradientButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
