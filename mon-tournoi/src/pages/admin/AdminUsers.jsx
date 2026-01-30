import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button, Input } from '../../shared/components/ui';
import { GlassCard } from '../../shared/components/ui';
import { toast } from '../../utils/toast';
import { Shield, UserCheck, Search, Users } from 'lucide-react';

/**
 * Page d'administration des utilisateurs
 * Permet de changer le rôle des utilisateurs (player <-> organizer)
 */
export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'player', 'organizer'
  
  const currentUser = useQuery(api.users.getCurrent);
  const users = useQuery(api.users.listAll, 
    roleFilter !== 'all' ? { role: roleFilter, limit: 100 } : { limit: 100 }
  );
  const updateRole = useMutation(api.usersMutations.updateRole);

  // Vérifier si l'utilisateur actuel est organisateur
  const isOrganizer = currentUser?.role === 'organizer';

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateRole({ userId, role: newRole });
      toast.success(`Rôle changé en ${newRole === 'organizer' ? 'Organisateur' : 'Joueur'}`);
    } catch (error) {
      toast.error('Erreur lors du changement de rôle');
      console.error(error);
    }
  };

  // Filtrer par recherche
  const filteredUsers = users?.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-violet" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-text-secondary mt-1">
            {isOrganizer 
              ? "Gérer les rôles et permissions des utilisateurs"
              : "Vous devez être organisateur pour accéder à cette page"
            }
          </p>
        </div>
      </div>

      {!isOrganizer ? (
        <GlassCard className="p-6 text-center">
          <Shield className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Accès Restreint</h2>
          <p className="text-text-secondary">
            Seuls les organisateurs peuvent gérer les utilisateurs.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Filtres */}
          <GlassCard className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtre par rôle */}
              <div className="flex gap-2">
                <Button
                  variant={roleFilter === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                >
                  Tous
                </Button>
                <Button
                  variant={roleFilter === 'player' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setRoleFilter('player')}
                >
                  Joueurs
                </Button>
                <Button
                  variant={roleFilter === 'organizer' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setRoleFilter('organizer')}
                >
                  Organisateurs
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassCard className="p-4 text-center">
              <Users className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{users?.length || 0}</p>
              <p className="text-xs text-text-secondary">Total utilisateurs</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <UserCheck className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {users?.filter(u => u.role === 'player').length || 0}
              </p>
              <p className="text-xs text-text-secondary">Joueurs</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <Shield className="w-6 h-6 text-violet mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {users?.filter(u => u.role === 'organizer').length || 0}
              </p>
              <p className="text-xs text-text-secondary">Organisateurs</p>
            </GlassCard>
          </div>

          {/* Liste des utilisateurs */}
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/20 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Rôle</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Inscrit le</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-violet/20 rounded-full flex items-center justify-center">
                              <span className="text-violet font-bold text-sm">
                                {user.username?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-white">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-sm">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'organizer' 
                            ? 'bg-violet/20 text-violet' 
                            : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {user.role === 'organizer' ? 'Organisateur' : 'Joueur'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-sm">
                        {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user._id !== currentUser._id && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleRoleChange(
                              user._id, 
                              user.role === 'organizer' ? 'player' : 'organizer'
                            )}
                          >
                            {user.role === 'organizer' ? 'Rétrograder' : 'Promouvoir'}
                          </Button>
                        )}
                        {user._id === currentUser._id && (
                          <span className="text-xs text-text-muted">C'est vous</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-text-secondary">
                  Aucun utilisateur trouvé
                </div>
              )}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
