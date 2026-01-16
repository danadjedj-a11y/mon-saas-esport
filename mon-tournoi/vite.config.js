import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin pour créer les routes API
function apiPlugin() {
  return {
    name: 'api-server',
    configureServer(server) {
      // Importer dynamiquement le router API
      import('./server/api.js').then(({ default: apiRouter }) => {
        // Les routes API sont configurées dans apiRouter
        server.middlewares.use('/api', apiRouter)
      }).catch(err => {
        console.error('Erreur chargement API:', err)
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    apiPlugin()
  ],
  optimizeDeps: {
    // Inclure @sentry/react dans l'optimisation pour résoudre les problèmes CommonJS
    include: ['@sentry/react'],
    // Forcer la conversion CommonJS vers ESM
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  resolve: {
    // Forcer la résolution ESM pour @sentry/react
    conditions: ['import', 'module', 'browser', 'default']
  },
  build: {
    commonjsOptions: {
      // Convertir les modules CommonJS en ESM
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        // Découper les gros modules en chunks séparés
        manualChunks: {
          // Vendor chunks pour les libs tierces
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-sentry': ['@sentry/react'],
        }
      }
    },
    // Augmenter la limite d'avertissement pour les gros chunks
    chunkSizeWarningLimit: 500
  }
})
