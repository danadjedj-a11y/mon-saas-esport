import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { Button, Input } from '../../../shared/components/ui';
import { toast } from '../../../utils/toast';

/**
 * SharingPublic - Gestion de la page publique du tournoi
 * Affiche le lien public et les options de partage
 */
export default function SharingPublic() {
  const { id: tournamentId } = useParams();
  const context = useOutletContext();
  const tournament = context?.tournament;

  const [stats, setStats] = useState({
    participants: 0,
    matches: 0,
    views: 0,
  });
  const [loading, setLoading] = useState(true);

  const publicUrl = `${window.location.origin}/tournament/${tournamentId}`;

  useEffect(() => {
    fetchStats();
  }, [tournamentId]);

  const fetchStats = async () => {
    try {
      const [participantsRes, matchesRes] = await Promise.all([
        supabase
          .from('participants')
          .select('id', { count: 'exact' })
          .eq('tournament_id', tournamentId),
        supabase
          .from('matches')
          .select('id', { count: 'exact' })
          .eq('tournament_id', tournamentId),
      ]);

      setStats({
        participants: participantsRes.count || 0,
        matches: matchesRes.count || 0,
        views: tournament?.views_count || Math.floor(Math.random() * 500), // Placeholder
      });
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, message = 'Copié !') => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const handleShare = (platform) => {
    const text = `Rejoins le tournoi "${tournament?.name}" !`;
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
      discord: publicUrl, // Discord copie le lien
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + publicUrl)}`,
    };

    if (platform === 'discord') {
      copyToClipboard(publicUrl, 'Lien copié pour Discord !');
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Page publique</h1>
        <p className="text-text-secondary mt-1">
          Partagez votre tournoi avec le monde
        </p>
      </div>

      {/* Preview Card */}
      <div className="bg-gradient-to-br from-violet/20 to-cyan/20 rounded-2xl p-6 border border-white/10">
        <div className="flex items-start gap-6">
          {/* Tournament Preview */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              {tournament?.logo_url ? (
                <img 
                  src={tournament.logo_url} 
                  alt="" 
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-violet/30 flex items-center justify-center text-3xl">
                  🏆
                </div>
              )}
              <div>
                <h2 className="text-xl font-display font-bold text-white">
                  {tournament?.name || 'Mon Tournoi'}
                </h2>
                <p className="text-text-secondary">{tournament?.game}</p>
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <span>👥</span>
                <span>{stats.participants} participants</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <span>⚔️</span>
                <span>{stats.matches} matchs</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <span>👁️</span>
                <span>{stats.views} vues</span>
              </div>
            </div>
          </div>

          {/* QR Code placeholder */}
          <div className="hidden lg:block">
            <div className="w-24 h-24 bg-white rounded-xl p-2 flex items-center justify-center">
              <div className="text-4xl">📱</div>
            </div>
            <p className="text-xs text-text-muted text-center mt-2">QR Code</p>
          </div>
        </div>
      </div>

      {/* URL Section */}
      <div className="bg-[#1e2235] rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-display font-semibold text-white mb-4">
          Lien public
        </h3>
        
        <div className="flex gap-3">
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white font-mono text-sm"
          />
          <Button onClick={() => copyToClipboard(publicUrl, 'Lien copié !')}>
            📋 Copier
          </Button>
          <Button 
            variant="secondary"
            onClick={() => window.open(publicUrl, '_blank')}
          >
            🔗 Ouvrir
          </Button>
        </div>

        {/* Short URL */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-text-secondary mb-2">Lien court</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={`${window.location.origin}/t/${tournamentId?.slice(0, 8)}`}
              readOnly
              className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-cyan-400 font-mono text-sm"
            />
            <Button 
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(`${window.location.origin}/t/${tournamentId?.slice(0, 8)}`)}
            >
              Copier
            </Button>
          </div>
        </div>
      </div>

      {/* Social Sharing */}
      <div className="bg-[#1e2235] rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-display font-semibold text-white mb-4">
          Partager sur les réseaux
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleShare('twitter')}
            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              𝕏
            </div>
            <span className="text-sm text-white">Twitter / X</span>
          </button>

          <button
            onClick={() => handleShare('facebook')}
            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#4267B2]/10 hover:bg-[#4267B2]/20 border border-[#4267B2]/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#4267B2]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📘
            </div>
            <span className="text-sm text-white">Facebook</span>
          </button>

          <button
            onClick={() => handleShare('discord')}
            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#5865F2]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🎮
            </div>
            <span className="text-sm text-white">Discord</span>
          </button>

          <button
            onClick={() => handleShare('whatsapp')}
            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-[#25D366]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              💬
            </div>
            <span className="text-sm text-white">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Embed Options */}
      <div className="bg-[#1e2235] rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-display font-semibold text-white mb-4">
          Intégrer sur votre site
        </h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-text-secondary mb-2">Code iframe</p>
            <div className="relative">
              <pre className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-xs text-cyan-400 overflow-x-auto">
{`<iframe 
  src="${publicUrl}/embed/bracket" 
  width="100%" 
  height="600" 
  frameborder="0"
></iframe>`}
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(`<iframe src="${publicUrl}/embed/bracket" width="100%" height="600" frameborder="0"></iframe>`, 'Code copié !')}
              >
                📋
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-center">
              <div className="text-2xl mb-2">🏆</div>
              <div className="text-sm text-white">Bracket</div>
            </button>
            <button className="flex-1 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-center">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-sm text-white">Participants</div>
            </button>
            <button className="flex-1 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm text-white">Classement</div>
            </button>
            <button className="flex-1 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-center">
              <div className="text-2xl mb-2">⚔️</div>
              <div className="text-sm text-white">Matchs</div>
            </button>
          </div>
        </div>
      </div>

      {/* SEO & Meta */}
      <div className="bg-[#1e2235] rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-display font-semibold text-white mb-4">
          Aperçu sur les réseaux sociaux
        </h3>
        
        <div className="bg-black/30 rounded-xl p-4 max-w-md">
          <div className="aspect-video bg-gradient-to-br from-violet/30 to-cyan/30 rounded-lg mb-3 flex items-center justify-center">
            {tournament?.banner_url ? (
              <img src={tournament.banner_url} alt="" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <span className="text-4xl">🏆</span>
            )}
          </div>
          <p className="text-xs text-text-muted uppercase">mon-tournoi.com</p>
          <p className="text-white font-medium">{tournament?.name}</p>
          <p className="text-sm text-text-secondary line-clamp-2">
            {tournament?.description || `Tournoi ${tournament?.game} - ${stats.participants} participants`}
          </p>
        </div>
      </div>
    </div>
  );
}
