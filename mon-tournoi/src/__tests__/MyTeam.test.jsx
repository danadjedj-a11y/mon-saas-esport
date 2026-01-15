import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyTeam from '../MyTeam';
import { useAuth } from '../shared/hooks';
import { useTeam } from '../features/teams/hooks/useTeam';
import { supabase } from '../supabaseClient';

// Mock des hooks
jest.mock('../shared/hooks', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../features/teams/hooks/useTeam', () => ({
  useTeam: jest.fn(),
}));

// Mock du supabaseClient
jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'http://example.com/logo.png' } }))
      }))
    }
  }
}));

// Mock des services API
jest.mock('../shared/services/api/teams', () => ({
  sendTeamInvitation: jest.fn(),
  getPendingInvitations: jest.fn(() => Promise.resolve([])),
}));

// Mock du toast
jest.mock('../utils/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock de notificationUtils
jest.mock('../notificationUtils', () => ({
  notifyTeamInvitation: jest.fn()
}));

// Mock du DashboardLayout
jest.mock('../layouts/DashboardLayout', () => {
  return function MockDashboardLayout({ children }) {
    return <div data-testid="dashboard-layout">{children}</div>;
  };
});

// Mock de InvitePlayerModal
jest.mock('../components/InvitePlayerModal', () => {
  return function MockInvitePlayerModal() {
    return <div data-testid="invite-modal">Invite Modal</div>;
  };
});

// Mock des composants UI
jest.mock('../shared/components/ui', () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  Badge: ({ children }) => <span data-testid="badge">{children}</span>,
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

// Mock de l'ErrorBoundary
jest.mock('../shared/components/ErrorBoundary/MyTeamErrorBoundary', () => {
  return function MockMyTeamErrorBoundary({ children }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

describe('MyTeam', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com'
    }
  };

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    tag: 'TST',
    logo_url: 'http://example.com/logo.png',
    captain_id: 'user-123'
  };

  const mockMembers = [
    {
      id: 'member-1',
      user_id: 'user-123',
      role: 'player',
      profiles: {
        username: 'Captain',
        avatar_url: 'http://example.com/avatar1.png'
      }
    },
    {
      id: 'member-2',
      user_id: 'user-456',
      role: 'player',
      profiles: {
        username: 'Player2',
        avatar_url: 'http://example.com/avatar2.png'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth par défaut
    useAuth.mockReturnValue({
      session: mockSession
    });

    // Mock de Supabase.from() pour retourner des équipes
    supabase.from.mockImplementation((table) => {
      if (table === 'teams') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [mockTeam],
            error: null
          }),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockTeam,
            error: null
          })
        };
      }
      if (table === 'team_members') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ team_id: 'team-123' }],
            error: null
          })
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };
    });
  });

  test('affiche le chargement initial', () => {
    useTeam.mockReturnValue({
      team: null,
      members: [],
      loading: true,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false,
      canManageMembers: jest.fn()
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  test('affiche le message quand pas d\'équipe', async () => {
    useTeam.mockReturnValue({
      team: null,
      members: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false,
      canManageMembers: jest.fn()
    });

    // Mock Supabase pour retourner aucune équipe
    supabase.from.mockImplementation((table) => {
      if (table === 'teams') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          }),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        };
      }
      if (table === 'team_members') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tu n'as pas encore d'équipe/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Créer une Team')).toBeInTheDocument();
  });

  test('affiche l\'équipe et ses membres pour un capitaine', async () => {
    useTeam.mockReturnValue({
      team: mockTeam,
      members: mockMembers,
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: true,
      canManageMembers: jest.fn(() => true)
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    expect(screen.getByText('[TST]')).toBeInTheDocument();
    expect(screen.getByText('Captain')).toBeInTheDocument();
    expect(screen.getByText('Player2')).toBeInTheDocument();
    expect(screen.getByText(/Roster \(2\)/i)).toBeInTheDocument();
  });

  test('affiche l\'équipe pour un joueur simple', async () => {
    useTeam.mockReturnValue({
      team: mockTeam,
      members: mockMembers,
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false,
      canManageMembers: jest.fn(() => false)
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    // Le bouton pour inviter ne devrait pas être visible pour un joueur simple
    expect(screen.queryByText(/Inviter Joueur/i)).not.toBeInTheDocument();
  });

  test('gère les erreurs de chargement d\'équipe', async () => {
    const mockError = new Error('Erreur de chargement');
    
    useTeam.mockReturnValue({
      team: null,
      members: [],
      loading: false,
      error: mockError,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false,
      canManageMembers: jest.fn()
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    // Devrait afficher le message de pas d'équipe même en cas d'erreur
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });

  test('gère les données null de Supabase sans crash', async () => {
    // Mock Supabase pour retourner null
    supabase.from.mockImplementation((table) => {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: null
        }),
        in: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
    });

    useTeam.mockReturnValue({
      team: null,
      members: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false,
      canManageMembers: jest.fn()
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tu n'as pas encore d'équipe/i)).toBeInTheDocument();
    });
  });

  test('est enveloppé dans ErrorBoundary', () => {
    useTeam.mockReturnValue({
      team: mockTeam,
      members: mockMembers,
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: true,
      canManageMembers: jest.fn(() => true)
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
  });

  // Tests pour les cas limites mentionnés dans le problème

  test('gère correctement un rôle undefined pour l\'utilisateur', async () => {
    const teamWithDifferentCaptain = {
      ...mockTeam,
      captain_id: 'user-999' // Different captain
    };

    useTeam.mockReturnValue({
      team: teamWithDifferentCaptain,
      members: [
        {
          id: 'member-1',
          user_id: 'user-123',
          role: undefined, // Rôle undefined
          profiles: {
            username: 'TestUser',
            avatar_url: 'http://example.com/avatar.png'
          }
        }
      ],
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false,
      canManageMembers: jest.fn(() => false)
    });

    // Mock de Supabase pour retourner l'équipe
    supabase.from.mockImplementation((table) => {
      if (table === 'teams') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [teamWithDifferentCaptain],
            error: null
          }),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: teamWithDifferentCaptain,
            error: null
          })
        };
      }
      if (table === 'team_members') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ team_id: teamWithDifferentCaptain.id }],
            error: null
          })
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    // Le composant devrait afficher "JOUEUR" par défaut quand le rôle est undefined
    expect(screen.getByText('JOUEUR')).toBeInTheDocument();
  });

  test('gère correctement des membres avec des profils null', async () => {
    useTeam.mockReturnValue({
      team: mockTeam,
      members: [
        {
          id: 'member-1',
          user_id: 'user-123',
          role: 'player',
          profiles: null // Profil null
        }
      ],
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: true,
      canManageMembers: jest.fn(() => true)
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    // Le composant devrait afficher un texte par défaut pour les profils null
    expect(screen.getByText('Joueur sans pseudo')).toBeInTheDocument();
  });

  test('gère un tableau de membres vide', async () => {
    useTeam.mockReturnValue({
      team: mockTeam,
      members: [], // Aucun membre
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: true,
      canManageMembers: jest.fn(() => true)
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    // Devrait afficher Roster (0)
    expect(screen.getByText('Roster (0)')).toBeInTheDocument();
  });

  test('gère correctement une session null', async () => {
    useAuth.mockReturnValue({
      session: null // Session null
    });

    useTeam.mockReturnValue({
      team: null,
      members: [],
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false,
      canManageMembers: jest.fn(() => false)
    });

    // Mock Supabase pour retourner aucune équipe quand pas de session
    supabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    }));

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tu n'as pas encore d'équipe/i)).toBeInTheDocument();
    });
  });

  test('gère une erreur de type lexical declaration', async () => {
    const lexicalError = new Error("ReferenceError: can't access lexical declaration 'A' before initialization");
    
    useTeam.mockReturnValue({
      team: null,
      members: [],
      loading: false,
      error: lexicalError,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false,
      canManageMembers: jest.fn()
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    // L'ErrorBoundary devrait gérer cette erreur si elle est lancée
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    });
  });

  test('ne crash pas avec des invitations pendantes null', async () => {
    const { getPendingInvitations } = require('../shared/services/api/teams');
    getPendingInvitations.mockResolvedValue(null);

    useTeam.mockReturnValue({
      team: mockTeam,
      members: mockMembers,
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: true,
      canManageMembers: jest.fn(() => true)
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    // Ne devrait pas afficher de section d'invitations si null
    expect(screen.queryByText(/Invitations envoyées/i)).not.toBeInTheDocument();
  });

  test('gère correctement les rôles manager et coach', async () => {
    const teamWithDifferentCaptain = {
      ...mockTeam,
      captain_id: 'user-999' // Different captain so members can have manager/coach roles
    };

    useTeam.mockReturnValue({
      team: teamWithDifferentCaptain,
      members: [
        {
          id: 'member-1',
          user_id: 'user-123',
          role: 'manager',
          profiles: { username: 'Manager', avatar_url: 'http://example.com/avatar.png' }
        },
        {
          id: 'member-2',
          user_id: 'user-456',
          role: 'coach',
          profiles: { username: 'Coach', avatar_url: 'http://example.com/avatar.png' }
        }
      ],
      loading: false,
      error: null,
      refetch: jest.fn(),
      removeMember: jest.fn(),
      updateTeam: jest.fn(),
      updateMemberRole: jest.fn(),
      isCaptain: false, // Not captain in this test
      canManageMembers: jest.fn((role) => ['captain', 'manager', 'coach'].includes(role))
    });

    // Mock de Supabase pour retourner l'équipe
    supabase.from.mockImplementation((table) => {
      if (table === 'teams') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [teamWithDifferentCaptain],
            error: null
          }),
          in: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: teamWithDifferentCaptain,
            error: null
          })
        };
      }
      if (table === 'team_members') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ team_id: teamWithDifferentCaptain.id }],
            error: null
          })
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      };
    });

    render(
      <BrowserRouter>
        <MyTeam />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument();
    });

    // Devrait afficher les badges de rôle corrects
    expect(screen.getByText('MANAGER')).toBeInTheDocument();
    expect(screen.getByText('COACH')).toBeInTheDocument();
  });
});
