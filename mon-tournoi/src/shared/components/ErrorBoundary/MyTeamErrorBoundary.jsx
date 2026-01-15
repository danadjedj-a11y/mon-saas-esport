import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../ui';
import monitoring from '../../../utils/monitoring';

/**
 * ErrorBoundary dédié à la page MyTeam
 * Gère spécifiquement les erreurs de chargement d'équipe et d'initialisation
 */
class MyTeamErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorType: 'unknown'
    };
  }

  static getDerivedStateFromError(error) {
    // Détecter le type d'erreur
    let errorType = 'unknown';
    const errorMessage = error?.message || error?.toString() || '';
    
    if (errorMessage.includes('lexical declaration') || errorMessage.includes('before initialization')) {
      errorType = 'initialization';
    } else if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
      errorType = 'data';
    } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('failed')) {
      errorType = 'network';
    }
    
    return { hasError: true, errorType };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MyTeamErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Envoyer à Sentry avec contexte MyTeam
    monitoring.captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'MyTeamErrorBoundary',
      errorType: this.state.errorType,
      component: 'MyTeam'
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoToCreateTeam = () => {
    window.location.href = '/create-team';
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  getErrorMessage() {
    const { errorType } = this.state;
    
    switch (errorType) {
      case 'initialization':
        return "Une erreur d'initialisation s'est produite lors du chargement de votre équipe. Cela peut être dû à un problème temporaire.";
      case 'data':
        return "Les données de votre équipe n'ont pas pu être chargées correctement. Veuillez réessayer.";
      case 'network':
        return "Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.";
      default:
        return "Une erreur inattendue s'est produite lors du chargement de votre équipe.";
    }
  }

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === 'development';
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-fluky-bg p-4">
          <Card variant="outlined" padding="xl" className="max-w-2xl border-fluky-primary/30">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="font-display text-3xl text-fluky-secondary mb-3">
                Erreur de chargement de l'équipe
              </h1>
              <p className="font-body text-fluky-text/70 text-base leading-relaxed mb-4">
                {this.getErrorMessage()}
              </p>
              <p className="font-body text-fluky-text/50 text-sm">
                Si le problème persiste, essayez de rafraîchir la page ou de retourner à l'accueil.
              </p>
            </div>
            
            {isDev && this.state.error && (
              <details className="bg-black/30 border border-white/10 rounded-lg p-4 mb-6 text-left">
                <summary className="cursor-pointer font-semibold text-fluky-text mb-3">
                  🔍 Détails techniques (mode développement)
                </summary>
                <div className="mt-3 space-y-4">
                  <div>
                    <strong className="text-fluky-secondary block mb-2">Type d'erreur:</strong>
                    <div className="text-fluky-text/80 text-sm">
                      {this.state.errorType}
                    </div>
                  </div>
                  <div>
                    <strong className="text-fluky-secondary block mb-2">Message:</strong>
                    <pre className="bg-black/50 p-3 rounded text-xs text-fluky-text/80 overflow-auto max-h-40">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong className="text-fluky-secondary block mb-2">Stack Trace:</strong>
                      <pre className="bg-black/50 p-3 rounded text-xs text-fluky-text/80 overflow-auto max-h-60">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={this.handleReload}
              >
                🔄 Recharger la page
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={this.handleGoToCreateTeam}
              >
                ➕ Créer une équipe
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={this.handleGoHome}
              >
                🏠 Accueil
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MyTeamErrorBoundary;
