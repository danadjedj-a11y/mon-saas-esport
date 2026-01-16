import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../shared/components/ui';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../shared/hooks';

/**
 * Page 404 - Page non trouvée
 */
export default function NotFound() {
  const navigate = useNavigate();
  const { session } = useAuth();

  return (
    <DashboardLayout session={session}>
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card variant="glass" padding="xl" className="max-w-2xl text-center shadow-xl">
          <div className="mb-8">
            <div className="text-8xl mb-6 font-display" style={{ 
              fontSize: '8rem',
              lineHeight: '1',
              textShadow: '0 0 30px rgba(139, 92, 246, 0.5)'
            }}>
              404
            </div>
            <h1 className="font-display text-4xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400 mb-4" style={{ 
              textShadow: '0 0 15px rgba(139, 92, 246, 0.5)' 
            }}>
              Page introuvable
            </h1>
            <p className="font-body text-gray-300 text-lg leading-relaxed mb-2">
              Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
            </p>
            <p className="font-body text-gray-500 text-sm">
              Vérifiez l'URL ou utilisez les boutons ci-dessous pour naviguer.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/')}
              className="uppercase tracking-wide"
            >
              🏠 Retour à l'accueil
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(-1)}
              className="uppercase tracking-wide"
            >
              ← Retour en arrière
            </Button>
            {session && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/player/dashboard')}
                className="uppercase tracking-wide"
              >
                📊 Mon Dashboard
              </Button>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
