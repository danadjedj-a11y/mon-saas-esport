import React from 'react';
import Button from './Button';
import clsx from 'clsx';

/**
 * Composant Pagination réutilisable
 * @param {number} currentPage - Page actuelle (1-indexed)
 * @param {number} totalPages - Nombre total de pages
 * @param {Function} onPageChange - Callback appelé quand la page change (page)
 * @param {boolean} isLoading - Si true, désactive les boutons
 * @param {string} className - Classes CSS additionnelles
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  className = '',
}) {
  // Si une seule page ou moins, ne pas afficher la pagination
  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage || isLoading) {
      return;
    }
    onPageChange(page);
  };

  // Générer les numéros de pages à afficher
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7; // Nombre maximum de pages visibles
    
    if (totalPages <= maxVisible) {
      // Afficher toutes les pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Afficher avec ellipses
      if (currentPage <= 3) {
        // Début : 1 2 3 4 ... last
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Fin : 1 ... (n-3) (n-2) (n-1) n
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Milieu : 1 ... (current-1) current (current+1) ... last
        pages.push(1);
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav 
      className={clsx('flex items-center justify-center gap-2', className)}
      aria-label="Pagination"
    >
      {/* Bouton Précédent */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        aria-label="Page précédente"
      >
        ←
      </Button>

      {/* Numéros de pages */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-3 py-1 text-fluky-text/60 font-body"
              >
                ...
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <Button
              key={page}
              variant={isActive ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePageChange(page)}
              disabled={isLoading}
              className={clsx(
                'min-w-[2.5rem]',
                isActive && 'font-semibold'
              )}
              aria-label={`Page ${page}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Bouton Suivant */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        aria-label="Page suivante"
      >
        →
      </Button>
    </nav>
  );
}
