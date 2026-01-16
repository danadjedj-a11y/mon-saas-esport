import { useNavigate } from 'react-router-dom';

export default function TournamentFooter() {
  const navigate = useNavigate();

  return (
    <div className="mt-10 pt-5 border-t-4 border-fluky-accent text-center text-fluky-text text-sm font-display">
      <p>Vue publique - Les résultats sont mis à jour en temps réel</p>
      <p className="mt-2.5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="bg-transparent border-2 border-fluky-primary text-fluky-accent px-5 py-2 rounded-lg cursor-pointer font-handwriting text-sm uppercase tracking-wider transition-all duration-300 hover:bg-fluky-primary hover:border-fluky-accent"
        >
          ← Retour à l'accueil
        </button>
      </p>
    </div>
  );
}
