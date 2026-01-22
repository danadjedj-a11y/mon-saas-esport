/**
 * Composant SkipLink pour l'accessibilité
 * Permet aux utilisateurs de clavier de sauter directement au contenu principal
 */

const SkipLink = ({ targetId = 'main-content', children = 'Aller au contenu principal' }) => {
  const handleClick = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
    >
      {children}
    </a>
  );
};

export default SkipLink;
