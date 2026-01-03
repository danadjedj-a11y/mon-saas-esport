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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'white', fontFamily: 'Arial' }}>
      <div style={{ background: '#222', padding: '40px', borderRadius: '10px', width: '300px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <h1 style={{ color: '#00d4ff', margin: '0 0 20px 0' }}>Toornament Clone</h1>
        <p style={{ color: '#888', marginBottom: '30px' }}>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</p>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '12px', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '12px', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
            required
          />
          <button disabled={loading} style={{ padding: '12px', background: '#00d4ff', border: 'none', borderRadius: '4px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
            {loading ? 'Chargement...' : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#aaa', cursor: 'pointer' }} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </p>
      </div>
    </div>
  )
}