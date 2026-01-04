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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030913', color: '#F8F6F2' }}>
      <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '40px', borderRadius: '12px', width: '350px', textAlign: 'center', boxShadow: '0 8px 32px rgba(193, 4, 104, 0.3)', border: '2px solid #FF36A3' }}>
        <h1 style={{ color: '#FF36A3', margin: '0 0 20px 0', fontFamily: "'Shadows Into Light', cursive", fontSize: '2.5rem' }}>Fluky Boys</h1>
        <p style={{ color: '#F8F6F2', marginBottom: '30px', fontFamily: "'Protest Riot', sans-serif", fontSize: '1.1rem' }}>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</p>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              padding: '12px', 
              background: 'rgba(3, 9, 19, 0.8)', 
              border: '2px solid #C10468', 
              color: '#F8F6F2', 
              borderRadius: '6px',
              fontFamily: "'Protest Riot', sans-serif",
              fontSize: '0.95rem',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF36A3';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#C10468';
              e.currentTarget.style.boxShadow = 'none';
            }}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              padding: '12px', 
              background: 'rgba(3, 9, 19, 0.8)', 
              border: '2px solid #C10468', 
              color: '#F8F6F2', 
              borderRadius: '6px',
              fontFamily: "'Protest Riot', sans-serif",
              fontSize: '0.95rem',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#FF36A3';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 54, 163, 0.2)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#C10468';
              e.currentTarget.style.boxShadow = 'none';
            }}
            required
          />
          <button 
            disabled={loading} 
            style={{ 
              padding: '12px', 
              background: '#C10468', 
              border: '2px solid #FF36A3', 
              borderRadius: '8px', 
              color: '#F8F6F2', 
              fontFamily: "'Shadows Into Light', cursive",
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#FF36A3';
                e.currentTarget.style.borderColor = '#C10468';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = '#C10468';
                e.currentTarget.style.borderColor = '#FF36A3';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? 'Chargement...' : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>

        <p style={{ marginTop: '20px', fontSize: '0.9rem', color: '#F8F6F2', cursor: 'pointer', fontFamily: "'Protest Riot', sans-serif", transition: 'color 0.3s ease' }} 
           onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
           onMouseEnter={(e) => e.currentTarget.style.color = '#FF36A3'}
           onMouseLeave={(e) => e.currentTarget.style.color = '#F8F6F2'}>
          {mode === 'login' ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </p>
      </div>
    </div>
  )
}