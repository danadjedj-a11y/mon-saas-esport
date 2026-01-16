import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import Button from './Button';

/**
 * Composant ImageUploader réutilisable
 * - Zone de drag & drop
 * - Bouton de sélection de fichier
 * - Prévisualisation de l'image
 * - Indicateur de progression d'upload
 * - Validation du type de fichier (images uniquement) et taille max (2MB)
 */
const ImageUploader = ({
  onUpload,
  currentImage = null,
  loading = false,
  maxSize = 2 * 1024 * 1024, // 2MB par défaut
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  className = '',
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    setError('');
    
    if (!file) {
      setError('Aucun fichier sélectionné');
      return false;
    }

    if (!acceptedTypes.includes(file.type)) {
      setError('Type de fichier non supporté. Utilisez une image (JPEG, PNG, GIF, WebP)');
      return false;
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      setError(`La taille du fichier dépasse ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFile = (file) => {
    if (!validateFile(file)) {
      return;
    }

    // Créer une prévisualisation
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Appeler la fonction d'upload
    if (onUpload) {
      onUpload(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleButtonClick();
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleChange}
        disabled={loading}
        className="hidden"
      />

      {/* Zone de drag & drop */}
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-lg transition-all duration-300',
          dragActive
            ? 'border-cyan-500 bg-cyan-500/10'
            : 'border-violet-500/50 bg-black/20',
          loading && 'opacity-50 cursor-not-allowed',
          !loading && 'hover:border-cyan-500 cursor-pointer'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!loading ? handleButtonClick : undefined}
        onKeyDown={!loading ? handleKeyDown : undefined}
        role="button"
        tabIndex={loading ? -1 : 0}
        aria-label="Zone d'upload d'image. Cliquez ou appuyez sur Entrée pour sélectionner un fichier"
      >
        <div className="p-8">
          {preview ? (
            // Prévisualisation
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-violet-500">
                <img
                  src={preview}
                  alt="Prévisualisation"
                  className="w-full h-full object-cover"
                />
                {loading && (
                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
                  </div>
                )}
              </div>
              {!loading && (
                <p className="text-sm text-gray-400 font-body">
                  Cliquez ou glissez une nouvelle image pour remplacer
                </p>
              )}
            </div>
          ) : (
            // Zone vide
            <div className="flex flex-col items-center gap-4">
              <div className="text-6xl">📷</div>
              <div className="text-center">
                <p className="text-white font-body mb-1">
                  Glissez une image ici ou cliquez pour sélectionner
                </p>
                <p className="text-sm text-gray-400 font-body">
                  JPEG, PNG, GIF, WebP - Max {(maxSize / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
            </div>
          )}

          {/* Indicateur de chargement */}
          {loading && (
            <div className="mt-4">
              <div className="w-full bg-black/50 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 animate-pulse" style={{ width: '100%' }} />
              </div>
              <p className="text-center text-sm text-gray-400 font-body mt-2">
                Upload en cours...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-400 font-body">⚠️ {error}</p>
        </div>
      )}

      {/* Bouton alternatif */}
      {!preview && !loading && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleButtonClick}
          >
            📁 Sélectionner une image
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
