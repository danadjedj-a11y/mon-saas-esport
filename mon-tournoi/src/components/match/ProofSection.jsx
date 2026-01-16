import React from 'react';

/**
 * Section pour uploader/afficher les preuves de screenshot
 */
export default function ProofSection({ 
  proofUrl, 
  canUpload, 
  uploading, 
  onUpload 
}) {
  return (
    <div className="mt-5 bg-[#1a1a1a] p-5 rounded-2xl border border-white/20">
      <h3 className="font-display text-white mt-0">📷 Preuve du résultat (Screenshot)</h3>
      
      {proofUrl ? (
        <a href={proofUrl} target="_blank" rel="noreferrer">
          <img 
            loading="lazy" 
            src={proofUrl} 
            className="max-w-full max-h-[300px] rounded-lg border border-white/30" 
            alt="Preuve" 
          />
        </a>
      ) : (
        <p className="text-gray-500 font-body">Aucune preuve envoyée.</p>
      )}
      
      {canUpload && (
        <div className="mt-2.5">
          <input 
            type="file" 
            accept="image/*" 
            onChange={onUpload} 
            disabled={uploading} 
            aria-label="Télécharger une preuve de screenshot" 
            className="text-white font-body"
          />
          {uploading && (
            <span className="ml-2.5 text-gray-400 font-body">Upload en cours...</span>
          )}
        </div>
      )}
    </div>
  );
}
