import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './Auth'
import Dashboard from './Dashboard'
import Tournament from './Tournament'
import Profile from './Profile';
import CreateTeam from './CreateTeam';
import MyTeam from './MyTeam';
import JoinTeam from './JoinTeam';
import MatchLobby from './MatchLobby';
import CreateTournament from './CreateTournament';

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1a1a1a', color: 'white' }}>
        <Auth />
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Route par défaut : Le Dashboard */}
        <Route path="/" element={<Dashboard session={session} />} />
        
        {/* Route Dashboard explicite */}
        <Route path="/dashboard" element={<Dashboard session={session} />} />
        
        {/* Route Tournoi */}
        <Route path="/tournament/:id" element={<Tournament session={session} />} />
        
        {/* --- TES NOUVELLES ROUTES (DOIVENT ÊTRE AVANT LE "*") --- */}
        <Route path="/profile" element={<Profile session={session} />} />
        <Route path="/create-team" element={<CreateTeam session={session} supabase={supabase} />} />
        <Route path="/my-team" element={<MyTeam session={session} supabase={supabase} />} />
        <Route path="/join-team/:teamId" element={<JoinTeam session={session} supabase={supabase} />} />
        <Route path="/match/:id" element={<MatchLobby session={session} supabase={supabase} />} />
        <Route path="/create-tournament" element={<CreateTournament session={session} supabase={supabase} />} />

        {/* --- LE "CATCH-ALL" DOIT ÊTRE EN DERNIER --- */}
        {/* Redirection si route inconnue */}
        <Route path="*" element={<Navigate to="/" />} />
        
      </Routes>
    </Router>
  )
}

export default App