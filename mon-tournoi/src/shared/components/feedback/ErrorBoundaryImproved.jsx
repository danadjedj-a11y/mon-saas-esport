import React from 'react';
import { Button, Card } from '../ui';
import monitoring from '../../../utils/monitoring';

/**
 * ErrorBoundary amélioré avec les nouveaux composants UI
 */
class ErrorBoundaryImproved extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Envoyer à Sentry
    monitoring.captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-fluky-bg p-4">
          <Card variant="outlined" padding="xl" className="max-w-2xl border-red-500/30">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="font-display text-3xl text-red-500 mb-3">
                Oups ! Quelque chose s'est mal passé
              </h1>
              <p className="font-body text-fluky-text/70 text-base leading-relaxed">
                Une erreur inattendue s'est produite. Nous nous excusons pour la gêne occasionnée.
                Vous pouvez réessayer en rechargeant la page ou retourner à l'accueil.
              </p>
            </div>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="bg-black/30 border border-white/10 rounded-lg p-4 mb-6 text-left">
                <summary className="cursor-pointer font-semibold text-fluky-text mb-3">
                  🔍 Détails techniques (mode développement)
                </summary>
                <div className="mt-3 space-y-4">
                  <div>
                    <strong className="text-red-400 block mb-2">Erreur:</strong>
                    <pre className="bg-black/50 p-3 rounded text-xs text-fluky-text/80 overflow-auto max-h-40">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong className="text-red-400 block mb-2">Stack Trace:</strong>
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
                onClick={this.handleGoHome}
              >
                🏠 Retour à l'accueil
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryImproved;
