import { useNavigate } from 'react-router-dom';
import { GradientButton } from '../../shared/components/ui';
import { Home } from 'lucide-react';

export default function TournamentFooter() {
  const navigate = useNavigate();

  return (
    <div className="mt-16 pt-8 border-t border-white/5 text-center pb-8">
      <p className="text-gray-500 text-sm mb-6">Vue publique - Les résultats sont mis à jour en temps réel</p>

      <div className="flex justify-center">
        <GradientButton
          variant="ghost"
          onClick={() => navigate('/')}
          className="group"
        >
          <span className="flex items-center gap-2">
            <Home className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour à l'accueil
          </span>
        </GradientButton>
      </div>
    </div>
  );
}
