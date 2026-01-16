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
    <div className="min-h-screen flex items-center justify-center bg-dark p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-violet/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan/15 rounded-full blur-3xl" />
      </div>
      
      <div className="relative z-10 glass-card w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet to-cyan rounded-2xl flex items-center justify-center text-3xl shadow-glow-md">
            🎮
          </div>
          <h1 className="font-display text-3xl font-bold gradient-text mb-2">
            Fluky Boys
          </h1>
          <p className="font-body text-text-secondary">
            {mode === 'login' ? 'Content de vous revoir !' : 'Rejoignez la communauté'}
          </p>
        </div>
        
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
              className={`w-full px-4 py-3.5 bg-dark-50 border ${
                errors.email ? 'border-danger' : 'border-glass-border'
              } text-text rounded-xl font-body transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20 placeholder:text-text-muted`}
              required
            />
            {errors.email && (
              <p className="text-danger text-sm mt-2 font-body flex items-center gap-1">
                <span>⚠</span> {errors.email}
              </p>
            )}
          </div>
          
          {mode === 'signup' && (
            <>
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl border-2 border-glass-border overflow-hidden bg-dark-50 flex items-center justify-center group-hover:border-violet transition-colors">
                    {avatarPreview ? (
                      <img loading="lazy" src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">👤</span>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-r from-violet to-violet-dark rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-glow-sm">
                    <span className="text-white text-sm">📷</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-text-muted text-xs font-body">
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
                  className={`w-full px-4 py-3.5 bg-dark-50 border ${
                    errors.username ? 'border-danger' : 'border-glass-border'
                  } text-text rounded-xl font-body transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20 placeholder:text-text-muted`}
                  required
                />
                {errors.username && (
                  <p className="text-danger text-sm mt-2 font-body flex items-center gap-1">
                    <span>⚠</span> {errors.username}
                  </p>
                )}
                {!errors.username && (
                  <p className="text-text-muted text-xs mt-2 font-body">
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
                  className={`w-full px-4 py-3.5 bg-dark-50 border ${
                    errors.dateOfBirth ? 'border-danger' : 'border-glass-border'
                  } text-text rounded-xl font-body transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20`}
                  required
                />
                {errors.dateOfBirth && (
                  <p className="text-danger text-sm mt-2 font-body flex items-center gap-1">
                    <span>⚠</span> {errors.dateOfBirth}
                  </p>
                )}
                {!errors.dateOfBirth && (
                  <p className="text-text-muted text-xs mt-2 font-body">
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
              className={`w-full px-4 py-3.5 bg-dark-50 border ${
                errors.password ? 'border-danger' : 'border-glass-border'
              } text-text rounded-xl font-body transition-all duration-200 focus:border-violet focus:ring-2 focus:ring-violet/20 placeholder:text-text-muted`}
              required
            />
            {errors.password && (
              <p className="text-danger text-sm mt-2 font-body flex items-center gap-1">
                <span>⚠</span> {errors.password}
              </p>
            )}
            {mode === 'signup' && !errors.password && (
              <p className="text-text-muted text-xs mt-2 font-body">
                Minimum 6 caractères
              </p>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={loading} 
            className={`w-full mt-2 px-6 py-3.5 bg-gradient-to-r from-violet to-violet-dark text-white rounded-xl font-display font-semibold transition-all duration-200 ${
              loading 
                ? 'opacity-60 cursor-not-allowed' 
                : 'hover:shadow-glow-md hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Chargement...
              </span>
            ) : (
              mode === 'login' ? '🔐 Se connecter' : '✨ S\'inscrire'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="divider-gradient my-6" />

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