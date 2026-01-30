/**
 * AUTH.JSX - Version Clerk
 * 
 * Utilise les composants Clerk pour l'authentification
 * Remplace complètement Supabase Auth
 */

import { SignIn, SignUp, useUser } from "@clerk/clerk-react"
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useQuery } from "convex/react"
import { api } from "../convex/_generated/api"

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' ou 'signup'
  const { isSignedIn, isLoaded } = useUser()
  const convexUser = useQuery(api.users.getCurrent)
  const navigate = useNavigate()

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isLoaded && isSignedIn && convexUser) {
      const targetRoute = convexUser.role === 'organizer'
        ? '/organizer/dashboard'
        : '/player/dashboard'
      navigate(targetRoute, { replace: true })
    }
  }, [isLoaded, isSignedIn, convexUser, navigate])

  // Si connecté mais sans profil Convex, attendre la sync
  if (isSignedIn && !convexUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-violet/30 border-t-violet rounded-full animate-spin mx-auto mb-4" />
          <p className="font-body text-text-secondary">Synchronisation du profil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-violet/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <img src="/Logo.png" alt="Fluky Boys" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-display text-3xl font-bold gradient-text mb-2">
            Fluky Boys
          </h1>
          <p className="font-body text-text-secondary">
            {mode === 'login' ? 'Content de vous revoir !' : 'Rejoignez la communauté'}
          </p>
        </div>

        {/* Clerk Auth Component */}
        <div className="clerk-auth-container">
          {mode === 'login' ? (
            <SignIn
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-dark-50/80 backdrop-blur-xl border border-glass-border shadow-xl",
                  headerTitle: "text-text font-display",
                  headerSubtitle: "text-text-secondary font-body",
                  socialButtonsBlockButton: "bg-dark border border-glass-border hover:border-violet text-text",
                  formFieldLabel: "text-text-secondary font-body",
                  formFieldInput: "bg-dark border-glass-border text-text focus:border-violet",
                  formButtonPrimary: "bg-gradient-to-r from-violet to-violet-dark hover:from-violet-dark hover:to-violet text-white",
                  footerActionLink: "text-violet-light hover:text-violet",
                  identityPreview: "bg-dark-50 border-glass-border",
                  identityPreviewText: "text-text",
                  identityPreviewEditButton: "text-violet-light",
                }
              }}
            />
          ) : (
            <SignUp
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "mx-auto",
                  card: "bg-dark-50/80 backdrop-blur-xl border border-glass-border shadow-xl",
                  headerTitle: "text-text font-display",
                  headerSubtitle: "text-text-secondary font-body",
                  socialButtonsBlockButton: "bg-dark border border-glass-border hover:border-violet text-text",
                  formFieldLabel: "text-text-secondary font-body",
                  formFieldInput: "bg-dark border-glass-border text-text focus:border-violet",
                  formButtonPrimary: "bg-gradient-to-r from-violet to-violet-dark hover:from-violet-dark hover:to-violet text-white",
                  footerActionLink: "text-violet-light hover:text-violet",
                }
              }}
            />
          )}
        </div>

        {/* Divider */}
        <div className="divider-gradient my-6 w-full max-w-sm" />

        {/* Switch mode */}
        <p
          className="text-center text-sm text-text-secondary cursor-pointer font-body transition-colors duration-200 hover:text-violet-light"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? (
            <>Pas encore de compte ? <span className="text-violet-light font-medium">S'inscrire</span></>
          ) : (
            <>Déjà un compte ? <span className="text-violet-light font-medium">Se connecter</span></>
          )}
        </p>
      </div>
    </div>
  )
}