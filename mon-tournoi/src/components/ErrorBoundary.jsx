import React from 'react';
import monitoring from '../utils/monitoring';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Mettre à jour l'état pour que le prochain rendu affiche l'UI de repli
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Logger l'erreur vers un service de logging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Enregistrer les détails de l'erreur dans l'état pour l'affichage
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
      // UI de repli personnalisée
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f0f0f',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #e74c3c',
            borderRadius: '15px',
            padding: '40px',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ color: '#e74c3c', margin: '0 0 15px 0', fontSize: '1.8rem' }}>
              Oups ! Quelque chose s'est mal passé
            </h1>
            <p style={{ color: '#aaa', marginBottom: '30px', lineHeight: '1.6' }}>
              Une erreur inattendue s'est produite. Nous nous excusons pour la gêne occasionnée.
              Vous pouvez réessayer en rechargeant la page ou retourner à l'accueil.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                background: '#2a2a2a',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '0.85rem',
                color: '#ccc'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '10px', color: '#fff' }}>
                  Détails techniques (mode développement)
                </summary>
                <div style={{ marginTop: '10px' }}>
                  <strong style={{ color: '#e74c3c' }}>Erreur:</strong>
                  <pre style={{ 
                    background: '#1a1a1a', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    overflow: 'auto',
                    fontSize: '0.75rem',
                    marginTop: '5px'
                  }}>
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <>
                      <strong style={{ color: '#e74c3c', display: 'block', marginTop: '15px' }}>Stack Trace:</strong>
                      <pre style={{ 
                        background: '#1a1a1a', 
                        padding: '10px', 
                        borderRadius: '4px', 
                        overflow: 'auto',
                        fontSize: '0.75rem',
                        marginTop: '5px',
                        maxHeight: '200px'
                      }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2980b9'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3498db'}
              >
                🔄 Recharger la page
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: '#3498db',
                  border: '2px solid #3498db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#3498db';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#3498db';
                }}
              >
                🏠 Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

