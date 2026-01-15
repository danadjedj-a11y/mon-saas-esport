import { render, screen } from '@testing-library/react';
import MyTeamErrorBoundary from '../MyTeamErrorBoundary';
import monitoring from '../../../../utils/monitoring';

// Mock du module monitoring
jest.mock('../../../../utils/monitoring', () => ({
  __esModule: true,
  default: {
    captureError: jest.fn()
  }
}));

// Mock des composants UI
jest.mock('../../ui', () => ({
  Card: ({ children, ...props }) => <div data-testid="card" {...props}>{children}</div>,
  Button: ({ children, onClick, ...props }) => (
    <button onClick={onClick} data-testid={`button-${props.variant || 'default'}`} {...props}>
      {children}
    </button>
  ),
}));

// Composant qui génère une erreur
const ThrowError = ({ error }) => {
  throw error;
};

// Composant normal qui ne génère pas d'erreur
const NormalComponent = () => {
  return <div>Composant normal</div>;
};

describe('MyTeamErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Supprimer les logs d'erreur de la console pendant les tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('rend les enfants quand il n\'y a pas d\'erreur', () => {
    render(
      <MyTeamErrorBoundary>
        <NormalComponent />
      </MyTeamErrorBoundary>
    );

    expect(screen.getByText('Composant normal')).toBeInTheDocument();
  });

  test('affiche l\'interface d\'erreur quand une erreur est lancée', () => {
    const error = new Error('Test error');
    
    render(
      <MyTeamErrorBoundary>
        <ThrowError error={error} />
      </MyTeamErrorBoundary>
    );

    // Vérifier que le message d'erreur est affiché
    expect(screen.getByText('Erreur de chargement de l\'équipe')).toBeInTheDocument();
    
    // Vérifier que les boutons sont présents
    expect(screen.getByText(/Recharger la page/i)).toBeInTheDocument();
    expect(screen.getByText(/Créer une équipe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accueil/i })).toBeInTheDocument();
  });

  test('détecte une erreur d\'initialisation (lexical declaration)', () => {
    const error = new Error("ReferenceError: can't access lexical declaration 'A' before initialization");
    
    render(
      <MyTeamErrorBoundary>
        <ThrowError error={error} />
      </MyTeamErrorBoundary>
    );

    expect(screen.getByText(/Une erreur d'initialisation s'est produite/i)).toBeInTheDocument();
  });

  test('détecte une erreur de données (undefined/null)', () => {
    const error = new Error('Cannot read property of undefined');
    
    render(
      <MyTeamErrorBoundary>
        <ThrowError error={error} />
      </MyTeamErrorBoundary>
    );

    expect(screen.getByText(/Les données de votre équipe n'ont pas pu être chargées/i)).toBeInTheDocument();
  });

  test('détecte une erreur réseau', () => {
    const error = new Error('Network request failed');
    
    render(
      <MyTeamErrorBoundary>
        <ThrowError error={error} />
      </MyTeamErrorBoundary>
    );

    // L'erreur devrait être détectée comme réseau au lieu d'inconnue
    expect(screen.getByText(/Impossible de se connecter au serveur/i)).toBeInTheDocument();
  });

  test('appelle monitoring.captureError quand une erreur est capturée', () => {
    const error = new Error('Test error');
    
    render(
      <MyTeamErrorBoundary>
        <ThrowError error={error} />
      </MyTeamErrorBoundary>
    );

    expect(monitoring.captureError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        errorBoundary: 'MyTeamErrorBoundary',
        component: 'MyTeam'
      })
    );
  });

  test('gère les erreurs sans message', () => {
    const error = new Error();
    
    render(
      <MyTeamErrorBoundary>
        <ThrowError error={error} />
      </MyTeamErrorBoundary>
    );

    // Devrait afficher le message par défaut
    expect(screen.getByText(/Une erreur inattendue s'est produite/i)).toBeInTheDocument();
  });

  test('affiche les boutons d\'action', () => {
    const error = new Error('Test error');
    
    render(
      <MyTeamErrorBoundary>
        <ThrowError error={error} />
      </MyTeamErrorBoundary>
    );

    // Vérifier que les 3 boutons sont présents
    expect(screen.getByText(/Recharger la page/i)).toBeInTheDocument();
    expect(screen.getByText(/Créer une équipe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accueil/i })).toBeInTheDocument();
  });
});
