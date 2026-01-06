import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { getUserRole } from './utils/userRole'
import { toast } from './utils/toast'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' ou 'signup'
  const navigate = useNavigate()

  // Rediriger si déjà connecté
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Rediriger vers le dashboard approprié
        const role = await getUserRole(supabase, session.user.id)
        if (role === 'organizer') {
          navigate('/organizer/dashboard', { replace: true })
        } else {
          navigate('/player/dashboard', { replace: true })
        }
      }
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Rediriger après connexion
        const role = await getUserRole(supabase, session.user.id)
        if (role === 'organizer') {
          navigate('/organizer/dashboard', { replace: true })
        } else {
          navigate('/player/dashboard', { replace: true })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    let result
    if (mode === 'signup') {
      // Inscription
      result = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { username: email.split('@')[0] } // On crée un pseudo par défaut
        }
      })
    } else {
      // Connexion
      result = await supabase.auth.signInWithPassword({ email, password })
    }

    const { error } = result
    if (error) {
      toast.error(error.message)
      setLoading(false)
    }
    // Si succès, la redirection sera gérée par onAuthStateChange
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-fluky-bg text-fluky-text">
      <div className="bg-[#030913]/60 backdrop-blur-md border border-white/5 shadow-xl rounded-xl p-10 w-full max-w-md text-center">
        <h1 className="font-display text-4xl mb-5 text-fluky-secondary" style={{ textShadow: '0 0 20px rgba(193, 4, 104, 0.5)' }}>
          Fluky Boys
        </h1>
        <p className="font-body text-lg mb-8 text-fluky-text">
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </p>
        
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 bg-black/50 border-2 border-fluky-primary text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20"
            required
          />
          <button 
            type="submit"
            disabled={loading} 
            className={`px-4 py-3 bg-gradient-to-r from-fluky-primary to-fluky-secondary border-2 border-fluky-secondary rounded-lg text-white font-display text-base uppercase tracking-wide transition-all duration-300 ${
              loading 
                ? 'opacity-60 cursor-not-allowed' 
                : 'hover:scale-105 hover:shadow-lg hover:shadow-fluky-secondary/50'
            }`}
          >
            {loading ? 'Chargement...' : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <p 
          className="mt-5 text-sm text-fluky-text cursor-pointer font-body transition-colors duration-300 hover:text-fluky-secondary"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </p>
      </div>
    </div>
  )
}