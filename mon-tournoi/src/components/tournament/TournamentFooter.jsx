import { useNavigate } from 'react-router-dom';

export default function TournamentFooter() {
  const navigate = useNavigate();

  return (
    <div className="mt-10 pt-5 border-t-4 border-cyan-400 text-center text-white text-sm font-display">
      <p>Vue publique - Les résultats sont mis à jour en temps réel</p>
      <p className="mt-2.5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="bg-transparent border-2 border-violet-500 text-cyan-400 px-5 py-2 rounded-lg cursor-pointer font-handwriting text-sm uppercase tracking-wider transition-all duration-300 hover:bg-violet-600 hover:border-cyan-400"
        >
          ← Retour à l'accueil
        </button>
      </p>
    </div>
  );
}
