import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useAuth } from "@clerk/clerk-react"
import { ConvexProviderWithClerk } from "convex/react-clerk"
import convex from "./convexClient"
import App from './App.jsx'
import './index.css'

// Clé publique Clerk (à configurer)
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_xxx"

// Enregistrer le Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker enregistré avec succès:', registration.scope);
      })
      .catch((error) => {
        console.log('Échec de l\'enregistrement du Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>,
)