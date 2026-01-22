import { Link } from 'react-router-dom';

/**
 * Politique de Confidentialité - RGPD Compliant
 * 
 * Ce document est essentiel pour la conformité RGPD.
 * Il doit être facilement accessible depuis toutes les pages du site.
 */
export default function PrivacyPolicy() {
  const lastUpdated = '22 janvier 2026';
  const companyName = 'FLUKY BOYS';
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
          <h1 className="text-3xl font-bold text-white">Politique de Confidentialité</h1>
          <p className="text-white/80 mt-2">Dernière mise à jour : {lastUpdated}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-invert prose-lg max-w-none">
          
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              {companyName} (« nous », « notre », « nos ») s'engage à protéger votre vie privée. 
              Cette politique de confidentialité explique comment nous collectons, utilisons, stockons 
              et protégeons vos données personnelles lorsque vous utilisez notre plateforme {websiteUrl}.
            </p>
            <p className="text-gray-300 leading-relaxed mt-4">
              En utilisant notre service, vous acceptez les pratiques décrites dans cette politique. 
              Si vous n'acceptez pas cette politique, veuillez ne pas utiliser notre plateforme.
            </p>
          </section>

          {/* Responsable du traitement */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">2. Responsable du traitement</h2>
            <div className="bg-[#161b22] p-6 rounded-xl border border-white/10">
              <p className="text-gray-300"><strong className="text-white">Association :</strong> {companyName}</p>
              <p className="text-gray-300 mt-2"><strong className="text-white">Statut juridique :</strong> Association loi 1901</p>
              <p className="text-gray-300 mt-2"><strong className="text-white">Site web :</strong> {websiteUrl}</p>
              <p className="text-gray-300 mt-2"><strong className="text-white">Email de contact :</strong> {contactEmail}</p>
              <p className="text-gray-300 mt-2"><strong className="text-white">Responsable :</strong> Dan ADJEDJ (Président)</p>
            </div>
          </section>

          {/* Données collectées */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">3. Données personnelles collectées</h2>
            <p className="text-gray-300 mb-4">Nous collectons les données suivantes :</p>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.1 Données d'identification</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Nom d'utilisateur (pseudonyme)</li>
              <li>Adresse email</li>
              <li>Photo de profil (optionnelle)</li>
              <li>Date de naissance (pour vérifier l'âge minimum)</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.2 Données de jeu</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Pseudonymes de plateformes gaming (Riot Games, Steam, Epic Games, etc.)</li>
              <li>Historique de participation aux tournois</li>
              <li>Statistiques de jeu et classements</li>
              <li>Appartenance à des équipes</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.3 Données techniques</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Adresse IP</li>
              <li>Type de navigateur et appareil</li>
              <li>Données de connexion (dates, heures)</li>
              <li>Cookies et traceurs (voir section 8)</li>
            </ul>
          </section>

          {/* Finalités */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">4. Finalités du traitement</h2>
            <p className="text-gray-300 mb-4">Vos données sont utilisées pour :</p>
            <div className="space-y-4">
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">🎮 Gestion des tournois</h4>
                <p className="text-gray-400 text-sm mt-1">Organisation, inscription, et suivi des compétitions esport</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">👤 Gestion de votre compte</h4>
                <p className="text-gray-400 text-sm mt-1">Création, authentification, et personnalisation de votre profil</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">📧 Communications</h4>
                <p className="text-gray-400 text-sm mt-1">Notifications de tournois, résultats, et informations importantes</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">📊 Statistiques</h4>
                <p className="text-gray-400 text-sm mt-1">Classements, performances, et historique de participation</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">🔒 Sécurité</h4>
                <p className="text-gray-400 text-sm mt-1">Prévention des fraudes et protection de la plateforme</p>
              </div>
            </div>
          </section>

          {/* Base légale */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">5. Base légale du traitement</h2>
            <p className="text-gray-300 mb-4">Conformément au RGPD, nous traitons vos données sur les bases suivantes :</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong className="text-white">Consentement</strong> : Pour les communications marketing et cookies non essentiels</li>
              <li><strong className="text-white">Exécution du contrat</strong> : Pour fournir nos services de tournois</li>
              <li><strong className="text-white">Intérêt légitime</strong> : Pour améliorer nos services et assurer la sécurité</li>
              <li><strong className="text-white">Obligation légale</strong> : Pour respecter nos obligations réglementaires</li>
            </ul>
          </section>

          {/* Durée de conservation */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">6. Durée de conservation</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-gray-300 border-collapse">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-cyan-400">Type de données</th>
                    <th className="text-left py-3 px-4 text-cyan-400">Durée de conservation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-4">Données de compte</td>
                    <td className="py-3 px-4">Jusqu'à suppression du compte + 3 ans</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-4">Historique des tournois</td>
                    <td className="py-3 px-4">5 ans après le dernier tournoi</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-4">Données de connexion</td>
                    <td className="py-3 px-4">1 an</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 px-4">Cookies</td>
                    <td className="py-3 px-4">13 mois maximum</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Vos droits */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">7. Vos droits (RGPD)</h2>
            <p className="text-gray-300 mb-4">Conformément au RGPD, vous disposez des droits suivants :</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">📋 Droit d'accès</h4>
                <p className="text-gray-400 text-sm mt-1">Obtenir une copie de vos données personnelles</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">✏️ Droit de rectification</h4>
                <p className="text-gray-400 text-sm mt-1">Corriger vos données inexactes ou incomplètes</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">🗑️ Droit à l'effacement</h4>
                <p className="text-gray-400 text-sm mt-1">Demander la suppression de vos données</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">⏸️ Droit à la limitation</h4>
                <p className="text-gray-400 text-sm mt-1">Limiter le traitement de vos données</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">📦 Droit à la portabilité</h4>
                <p className="text-gray-400 text-sm mt-1">Récupérer vos données dans un format lisible</p>
              </div>
              <div className="bg-[#161b22] p-4 rounded-lg border border-white/10">
                <h4 className="text-white font-semibold">🚫 Droit d'opposition</h4>
                <p className="text-gray-400 text-sm mt-1">Vous opposer au traitement de vos données</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-cyan-400">
                <strong>Pour exercer vos droits :</strong> Rendez-vous dans{' '}
                <Link to="/profile/privacy" className="underline hover:text-cyan-300">
                  Paramètres → Vie privée & Données
                </Link>
                {' '}ou contactez-nous à {contactEmail}
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">8. Cookies et traceurs</h2>
            <p className="text-gray-300 mb-4">Nous utilisons les cookies suivants :</p>
            
            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Cookies essentiels (obligatoires)</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Authentification et session utilisateur</li>
              <li>Préférences de langue</li>
              <li>Sécurité (protection CSRF)</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mt-6 mb-3">Cookies analytiques (optionnels)</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Mesure d'audience (anonymisée)</li>
              <li>Amélioration de l'expérience utilisateur</li>
            </ul>

            <p className="text-gray-300 mt-4">
              Vous pouvez gérer vos préférences cookies à tout moment via le{' '}
              <button className="text-cyan-400 underline hover:text-cyan-300">
                panneau de gestion des cookies
              </button>.
            </p>
          </section>

          {/* Sécurité */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">9. Sécurité des données</h2>
            <p className="text-gray-300 mb-4">Nous mettons en œuvre les mesures suivantes :</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Chiffrement SSL/TLS pour toutes les communications</li>
              <li>Chiffrement des mots de passe (bcrypt)</li>
              <li>Authentification à deux facteurs (disponible)</li>
              <li>Accès restreint aux données (principe du moindre privilège)</li>
              <li>Sauvegardes régulières et sécurisées</li>
              <li>Surveillance et détection d'intrusion</li>
            </ul>
          </section>

          {/* Transferts */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">10. Transferts de données</h2>
            <p className="text-gray-300">
              Vos données sont hébergées sur des serveurs situés dans l'Union Européenne (Supabase). 
              En cas de transfert hors UE, nous nous assurons que des garanties appropriées sont en place 
              (clauses contractuelles types, décision d'adéquation).
            </p>
          </section>

          {/* Mineurs */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">11. Protection des mineurs</h2>
            <p className="text-gray-300">
              Notre plateforme est destinée aux personnes de 16 ans et plus. Si vous êtes âgé de moins de 16 ans, 
              vous devez obtenir le consentement de votre représentant légal pour utiliser nos services. 
              Nous nous réservons le droit de demander une vérification d'âge.
            </p>
          </section>

          {/* Modifications */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">12. Modifications de cette politique</h2>
            <p className="text-gray-300">
              Nous pouvons modifier cette politique à tout moment. En cas de modification substantielle, 
              nous vous en informerons par email ou via une notification sur la plateforme. 
              La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">13. Contact et réclamations</h2>
            <p className="text-gray-300 mb-4">
              Pour toute question concernant cette politique ou vos données personnelles :
            </p>
            <div className="bg-[#161b22] p-6 rounded-xl border border-white/10">
              <p className="text-gray-300">📧 Email : <a href={`mailto:${contactEmail}`} className="text-cyan-400 hover:underline">{contactEmail}</a></p>
            </div>
            <p className="text-gray-300 mt-4">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                CNIL (Commission Nationale de l'Informatique et des Libertés)
              </a>.
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
