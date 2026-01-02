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
  ]
})
