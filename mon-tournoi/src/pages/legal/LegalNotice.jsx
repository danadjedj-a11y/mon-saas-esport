import { Link } from 'react-router-dom';

/**
 * Mentions Légales
 * 
 * Obligatoire pour tout site internet selon la loi pour la confiance
 * dans l'économie numérique (LCEN) du 21 juin 2004.
 */
export default function LegalNotice() {
  const lastUpdated = '22 janvier 2026';

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-cyan-600 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold text-white">Mentions Légales</h1>
          <p className="text-white/80 mt-2">Dernière mise à jour : {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-invert prose-lg max-w-none">

          {/* Éditeur */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Éditeur du site</h2>
            <div className="bg-[#161b22] p-6 rounded-xl border border-white/10 space-y-3">
              <p className="text-gray-300">
                <strong className="text-white">Nom de l'association :</strong> FLUKY BOYS
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Forme juridique :</strong> Association loi 1901
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Numéro RNA :</strong> W313 040 641
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Siège social :</strong> 1 Place des Arts, 31700 Blagnac, France
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Date de création :</strong> 16 mai 2025
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Email :</strong>{' '}
                <a href="mailto:contact@flukyboys.fr" className="text-cyan-400 hover:underline">
                  contact@flukyboys.fr
                </a>
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Président de l'association :</strong> Dan ADJEDJ
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Directeur de la publication :</strong> Dan ADJEDJ
              </p>
            </div>
          </section>

          {/* Hébergeur */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Hébergeur</h2>
            <div className="bg-[#161b22] p-6 rounded-xl border border-white/10 space-y-3">
              <p className="text-gray-300">
                <strong className="text-white">Hébergeur du site :</strong> Vercel Inc.
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Site web :</strong>{' '}
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                  https://vercel.com
                </a>
              </p>
            </div>
            <div className="bg-[#161b22] p-6 rounded-xl border border-white/10 space-y-3 mt-4">
              <p className="text-gray-300">
                <strong className="text-white">Hébergeur des données :</strong> Supabase Inc.
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Localisation des données :</strong> Union Européenne (Frankfurt, Allemagne)
              </p>
              <p className="text-gray-300">
                <strong className="text-white">Site web :</strong>{' '}
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                  https://supabase.com
                </a>
              </p>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. Propriété intellectuelle</h2>
            <p className="text-gray-300 leading-relaxed">
              L'ensemble du contenu de ce site (textes, images, graphismes, logo, icônes, sons, logiciels, etc.) 
              est la propriété exclusive de Fluky Boys ou de ses partenaires et est protégé par les lois 
              françaises et internationales relatives à la propriété intellectuelle.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
              des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, 
              sauf autorisation écrite préalable de Fluky Boys.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Les marques et logos des jeux vidéo mentionnés (VALORANT, League of Legends, etc.) 
              appartiennent à leurs éditeurs respectifs.
            </p>
          </section>

          {/* Responsabilité */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Limitation de responsabilité</h2>
            <p className="text-gray-300 leading-relaxed">
              Fluky Boys s'efforce d'assurer au mieux de ses possibilités l'exactitude et la mise à jour 
              des informations diffusées sur ce site, dont elle se réserve le droit de corriger, 
              à tout moment et sans préavis, le contenu.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              Fluky Boys décline toute responsabilité :
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2">
              <li>Pour toute interruption du site</li>
              <li>Pour toute survenance de bugs</li>
              <li>Pour toute inexactitude ou omission portant sur des informations disponibles sur le site</li>
              <li>Pour tous dommages résultant d'une intrusion frauduleuse d'un tiers</li>
            </ul>
          </section>

          {/* Liens */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Liens hypertextes</h2>
            <p className="text-gray-300 leading-relaxed">
              Les liens hypertextes mis en place dans le cadre du présent site web en direction d'autres 
              ressources présentes sur le réseau Internet ne sauraient engager la responsabilité de Fluky Boys.
            </p>
          </section>

          {/* Données personnelles */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Données personnelles</h2>
            <p className="text-gray-300 leading-relaxed">
              Pour toute information relative à la collecte et au traitement de vos données personnelles, 
              veuillez consulter notre{' '}
              <Link to="/legal/privacy" className="text-cyan-400 hover:underline">
                Politique de Confidentialité
              </Link>.
            </p>
            <div className="bg-[#161b22] p-6 rounded-xl border border-white/10 mt-4 space-y-2">
              <p className="text-gray-300">
                <strong className="text-white">Contact pour les données personnelles :</strong>
              </p>
              <p className="text-gray-300">
                Email : <a href="mailto:contact@flukyboys.fr" className="text-cyan-400 hover:underline">contact@flukyboys.fr</a>
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Cookies</h2>
            <p className="text-gray-300 leading-relaxed">
              Ce site utilise des cookies. Pour plus d'informations sur l'utilisation des cookies 
              et la gestion de vos préférences, consultez notre{' '}
              <Link to="/legal/privacy#cookies" className="text-cyan-400 hover:underline">
                section Cookies de la Politique de Confidentialité
              </Link>.
            </p>
          </section>

          {/* Droit applicable */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Droit applicable</h2>
            <p className="text-gray-300 leading-relaxed">
              Les présentes mentions légales sont régies par le droit français. En cas de litige, 
              et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
            </p>
          </section>

          {/* Crédits */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Crédits</h2>
            <p className="text-gray-300 leading-relaxed">
              Conception et développement : Fluky Boys
            </p>
            <p className="text-gray-300 mt-2">
              Technologies utilisées : React, Supabase, Tailwind CSS, Vercel
            </p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Fluky Boys • Tous droits réservés</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link to="/legal/privacy" className="text-gray-400 hover:text-violet-400">Confidentialité</Link>
              <Link to="/legal/terms" className="text-gray-400 hover:text-violet-400">CGU</Link>
              <Link to="/legal/mentions" className="text-gray-400 hover:text-violet-400">Mentions légales</Link>
              <button
                onClick={() => window.openCookieSettings && window.openCookieSettings()}
                className="text-gray-400 hover:text-violet-400"
              >
                Gérer les cookies
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
