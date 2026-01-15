import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { getUserRole } from './utils/userRole'
import { toast } from './utils/toast'
import { loginSchema, signupSchema } from './shared/utils/schemas/auth'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [mode, setMode] = useState('login') // 'login' ou 'signup'
  const [errors, setErrors] = useState({})
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
    
    // NE PAS créer de listener ici - App.jsx gère déjà onAuthStateChange
    // Cela évite les doubles redirections qui causent le clignotement
  }, [navigate])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 2 Mo')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Le fichier doit être une image')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const uploadAvatar = async (userId) => {
    if (!avatarFile) return null
    
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile)

    if (uploadError) {
      console.error('Erreur upload avatar:', uploadError)
      return null
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    
    // Validation avec Zod
    const schema = mode === 'signup' ? signupSchema : loginSchema
    const dataToValidate = mode === 'signup' 
      ? { email, password, username, dateOfBirth }
      : { email, password }
    const result = schema.safeParse(dataToValidate)
    
    if (!result.success) {
      // Mapper les erreurs Zod
      const zodErrors = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0]
        zodErrors[field] = issue.message
      })
      setErrors(zodErrors)
      setLoading(false)
      return
    }
    
    // Données validées
    const validatedData = result.data
    
    let authResult
    if (mode === 'signup') {
      // Vérifier si le pseudonyme existe déjà
      const { data: existingProfiles } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', validatedData.username)
      
      if (existingProfiles && existingProfiles.length > 0) {
        setErrors({ username: 'Ce pseudonyme est déjà utilisé' })
        setLoading(false)
        return
      }
      
      // Inscription
      authResult = await supabase.auth.signUp({ 
        email: validatedData.email, 
        password: validatedData.password,
        options: {
          data: { 
            username: validatedData.username,
            date_of_birth: validatedData.dateOfBirth
          }
        }
      })
      
      // Si inscription réussie, créer le profil et uploader l'avatar
      if (authResult.data?.user && !authResult.error) {
        let avatarUrl = null
        
        // Upload l'avatar si fourni
        if (avatarFile) {
          avatarUrl = await uploadAvatar(authResult.data.user.id)
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authResult.data.user.id,
            username: validatedData.username,
            pseudonym: validatedData.username,
            date_of_birth: validatedData.dateOfBirth,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
        
        if (profileError) {
          console.error('Erreur création profil:', profileError)
        }
      }
    } else {
      // Connexion
      authResult = await supabase.auth.signInWithPassword({ 
        email: validatedData.email, 
        password: validatedData.password 
      })
    }

    const { error } = authResult
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      // Si succès, la redirection sera gérée par onAuthStateChange dans App.jsx
      // On garde le loading pour montrer que ça charge
      // Le loading sera remis à false lors de la redirection
      console.log('✅ [Auth] Connexion réussie, attente de redirection...')
    }
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
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
              }}
              className={`w-full px-4 py-3 bg-black/50 border-2 ${
                errors.email ? 'border-red-500' : 'border-fluky-primary'
              } text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20`}
              required
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1 font-body">{errors.email}</p>
            )}
          </div>
          
          {mode === 'signup' && (
            <>
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-fluky-primary overflow-hidden bg-black/30 flex items-center justify-center">
                    {avatarPreview ? (
                      <img loading="lazy" src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">👤</span>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-fluky-secondary rounded-full flex items-center justify-center cursor-pointer hover:bg-fluky-primary transition-colors">
                    <span className="text-white text-sm">📷</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-fluky-text/60 text-xs font-body">
                  Photo de profil (optionnel, max 2 Mo)
                </p>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Pseudonyme"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (errors.username) setErrors(prev => ({ ...prev, username: undefined }))
                  }}
                  className={`w-full px-4 py-3 bg-black/50 border-2 ${
                    errors.username ? 'border-red-500' : 'border-fluky-primary'
                  } text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20`}
                  required
                />
                {errors.username && (
                  <p className="text-red-400 text-sm mt-1 font-body">{errors.username}</p>
                )}
                {!errors.username && (
                  <p className="text-fluky-text/60 text-xs mt-1 font-body">
                    3-20 caractères (lettres, chiffres, - et _)
                  </p>
                )}
              </div>
              
              <div>
                <input
                  type="date"
                  placeholder="Date de naissance"
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value)
                    if (errors.dateOfBirth) setErrors(prev => ({ ...prev, dateOfBirth: undefined }))
                  }}
                  className={`w-full px-4 py-3 bg-black/50 border-2 ${
                    errors.dateOfBirth ? 'border-red-500' : 'border-fluky-primary'
                  } text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20`}
                  required
                />
                {errors.dateOfBirth && (
                  <p className="text-red-400 text-sm mt-1 font-body">{errors.dateOfBirth}</p>
                )}
                {!errors.dateOfBirth && (
                  <p className="text-fluky-text/60 text-xs mt-1 font-body">
                    Vous devez avoir au moins 13 ans
                  </p>
                )}
              </div>
            </>
          )}
          
          <div>
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
              }}
              className={`w-full px-4 py-3 bg-black/50 border-2 ${
                errors.password ? 'border-red-500' : 'border-fluky-primary'
              } text-fluky-text rounded-lg font-body text-base transition-all duration-300 focus:border-fluky-secondary focus:ring-4 focus:ring-fluky-secondary/20`}
              required
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-1 font-body">{errors.password}</p>
            )}
            {mode === 'signup' && !errors.password && (
              <p className="text-fluky-text/60 text-xs mt-1 font-body">
                Minimum 6 caractères
              </p>
            )}
          </div>
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