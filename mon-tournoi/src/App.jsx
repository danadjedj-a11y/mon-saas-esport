import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Auth from './Auth'
import Dashboard from './Dashboard' // <--- Nouveau
import Tournament from './Tournament'
import Profile from './Profile';

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
        {/* Redirection si route inconnue */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/profile" element={<Profile session={session} />} />
      </Routes>
    </Router>
  )
}

export default App