import { Link } from 'react-router-dom';

/**
 * Conditions Générales d'Utilisation (CGU)
 * 
 * Document juridique définissant les règles d'utilisation de la plateforme.
 */
export default function TermsOfService() {
  const lastUpdated = '22 janvier 2026';
  const companyName = 'Fluky Boys';
  const websiteUrl = 'play.flukyboys.fr';
  const contactEmail = 'contact@flukyboys.fr';

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-cyan-600 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <Link to="/" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold text-white">Conditions Générales d'Utilisation</h1>
          <p className="text-white/80 mt-2">Dernière mise à jour : {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-invert prose-lg max-w-none">

          {/* Préambule */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Préambule</h2>
            <p className="text-gray-300 leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation 
              de la plateforme {websiteUrl} (« la Plateforme »), éditée par {companyName}.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              En accédant à la Plateforme ou en l'utilisant, vous acceptez d'être lié par ces CGU. 
              Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la Plateforme.
            </p>
          </section>

          {/* Définitions */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Définitions</h2>
            <ul className="text-gray-300 space-y-3">
              <li><strong className="text-white">« Utilisateur »</strong> : Toute personne accédant à la Plateforme</li>
              <li><strong className="text-white">« Membre »</strong> : Utilisateur ayant créé un compte</li>
              <li><strong className="text-white">« Organisateur »</strong> : Membre créant et gérant des tournois</li>
              <li><strong className="text-white">« Participant »</strong> : Membre inscrit à un tournoi</li>
              <li><strong className="text-white">« Équipe »</strong> : Groupe de Membres participant ensemble</li>
              <li><strong className="text-white">« Tournoi »</strong> : Compétition esport organisée via la Plateforme</li>
              <li><strong className="text-white">« Contenu »</strong> : Textes, images, vidéos, et autres médias publiés sur la Plateforme</li>
            </ul>
          </section>

          {/* Inscription */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. Inscription et compte</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.1 Conditions d'inscription</h3>
            <p className="text-gray-300">Pour créer un compte, vous devez :</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2">
              <li>Être âgé d'au moins 16 ans (ou avoir le consentement parental)</li>
              <li>Fournir des informations exactes et à jour</li>
              <li>Utiliser une adresse email valide</li>
              <li>Accepter les présentes CGU et la Politique de confidentialité</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.2 Sécurité du compte</h3>
            <p className="text-gray-300">Vous êtes responsable de :</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2">
              <li>Maintenir la confidentialité de vos identifiants</li>
              <li>Toute activité réalisée depuis votre compte</li>
              <li>Nous informer immédiatement de toute utilisation non autorisée</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.3 Un compte par personne</h3>
            <p className="text-gray-300">
              Chaque personne ne peut détenir qu'un seul compte. La création de comptes multiples 
              (« multi-comptes ») est strictement interdite et peut entraîner la suspension de tous les comptes.
            </p>
          </section>

          {/* Utilisation */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Utilisation de la Plateforme</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.1 Usages autorisés</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Créer et gérer votre profil de joueur</li>
              <li>Participer à des tournois esport</li>
              <li>Organiser des tournois (si autorisé)</li>
              <li>Communiquer avec d'autres Membres</li>
              <li>Créer et rejoindre des équipes</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.2 Usages interdits</h3>
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg mt-4">
              <p className="text-red-400 font-semibold mb-2">Il est strictement interdit de :</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Utiliser des logiciels de triche ou d'exploitation</li>
                <li>Usurper l'identité d'un autre utilisateur</li>
                <li>Publier du contenu illégal, diffamatoire, ou haineux</li>
                <li>Harceler, menacer, ou intimider d'autres Membres</li>
                <li>Tenter de pirater ou compromettre la sécurité</li>
                <li>Vendre ou partager son compte</li>
                <li>Truquer des matchs ou des résultats</li>
                <li>Utiliser des bots ou scripts automatisés</li>
                <li>Collecter des données d'autres utilisateurs</li>
              </ul>
            </div>
          </section>

          {/* Tournois */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Règles des tournois</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">5.1 Participation</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>L'inscription à un tournoi vaut acceptation de son règlement spécifique</li>
              <li>Les pseudonymes gaming doivent correspondre à votre profil</li>
              <li>Le check-in est obligatoire dans les délais impartis</li>
              <li>Le non-respect du planning peut entraîner une disqualification</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">5.2 Fair-play</h3>
            <p className="text-gray-300">Tout Participant s'engage à :</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2">
              <li>Jouer de manière loyale et respectueuse</li>
              <li>Respecter les décisions des arbitres et organisateurs</li>
              <li>Signaler tout comportement suspect ou triche</li>
              <li>Accepter les résultats avec sportivité</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">5.3 Sanctions</h3>
            <p className="text-gray-300">
              En cas de non-respect des règles, les sanctions suivantes peuvent s'appliquer :
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mt-2">
              <li>Avertissement</li>
              <li>Disqualification du tournoi en cours</li>
              <li>Bannissement temporaire de la Plateforme</li>
              <li>Bannissement permanent</li>
            </ul>
          </section>

          {/* Propriété intellectuelle */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Propriété intellectuelle</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.1 Contenu de la Plateforme</h3>
            <p className="text-gray-300">
              La Plateforme et son contenu (textes, graphismes, logos, icônes, code source) sont protégés 
              par les droits de propriété intellectuelle. Toute reproduction sans autorisation est interdite.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.2 Contenu des utilisateurs</h3>
            <p className="text-gray-300">
              Vous conservez vos droits sur le contenu que vous publiez. En le publiant, vous nous accordez 
              une licence non exclusive, mondiale, pour afficher et promouvoir ce contenu sur la Plateforme.
            </p>
          </section>

          {/* Responsabilité */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Responsabilité</h2>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">7.1 Notre responsabilité</h3>
            <p className="text-gray-300">
              Nous nous efforçons d'assurer la disponibilité et la sécurité de la Plateforme, mais ne pouvons 
              garantir un fonctionnement sans interruption. Notre responsabilité est limitée aux dommages 
              directs résultant d'une faute prouvée de notre part.
            </p>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">7.2 Votre responsabilité</h3>
            <p className="text-gray-300">
              Vous êtes responsable de votre utilisation de la Plateforme et vous nous indemnisez contre 
              toute réclamation résultant de vos actes ou contenus.
            </p>
          </section>

          {/* Suspension */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Suspension et résiliation</h2>
            
            <p className="text-gray-300">Nous pouvons suspendre ou supprimer votre compte en cas de :</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
              <li>Violation des présentes CGU</li>
              <li>Comportement nuisible envers d'autres Membres</li>
              <li>Utilisation frauduleuse de la Plateforme</li>
              <li>Inactivité prolongée (plus de 2 ans)</li>
            </ul>

            <p className="text-gray-300 mt-4">
              Vous pouvez également supprimer votre compte à tout moment depuis vos paramètres de profil.
            </p>
          </section>

          {/* Modifications */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Modifications des CGU</h2>
            <p className="text-gray-300">
              Nous nous réservons le droit de modifier ces CGU à tout moment. Les modifications entrent 
              en vigueur dès leur publication. En cas de modification substantielle, nous vous en 
              informerons par email ou notification. La poursuite de l'utilisation après modification 
              vaut acceptation des nouvelles CGU.
            </p>
          </section>

          {/* Droit applicable */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">10. Droit applicable et litiges</h2>
            <p className="text-gray-300">
              Les présentes CGU sont régies par le droit français. En cas de litige, nous privilégierons 
              une résolution amiable. À défaut, les tribunaux français seront compétents.
            </p>
            <p className="text-gray-300 mt-4">
              Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir à une 
              médiation de la consommation.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">11. Contact</h2>
            <p className="text-gray-300">
              Pour toute question concernant ces CGU, contactez-nous :
            </p>
            <div className="bg-[#161b22] p-6 rounded-xl border border-white/10 mt-4">
              <p className="text-gray-300">📧 Email : <a href={`mailto:${contactEmail}`} className="text-cyan-400 hover:underline">{contactEmail}</a></p>
              <p className="text-gray-300 mt-2">🌐 Site : {websiteUrl}</p>
            </div>
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
