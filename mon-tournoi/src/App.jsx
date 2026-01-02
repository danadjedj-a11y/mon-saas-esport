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
import PublicTournament from './PublicTournament';
import StatsDashboard from './StatsDashboard';
import Leaderboard from './Leaderboard';
import StreamOverlay from './stream/StreamOverlay';
import StreamDashboard from './stream/StreamDashboard';
import TournamentAPI from './api/TournamentAPI';

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

  return (
    <Router>
      <Routes>
        {/* ROUTES PUBLIQUES (Accessibles sans authentification) */}
        <Route path="/tournament/:id/public" element={<PublicTournament />} />
        
        {/* STREAM & API ROUTES (Accessibles sans authentification) */}
        <Route path="/stream/overlay/:id" element={<StreamOverlay />} />
        <Route path="/stream/dashboard/:id" element={<StreamDashboard />} />
        <Route path="/api/tournament/:id/:endpoint" element={<TournamentAPI />} />
        
        {/* Routes protégées nécessitant une authentification */}
        <Route path="/" element={session ? <Dashboard session={session} /> : <Auth />} />
        <Route path="/dashboard" element={session ? <Dashboard session={session} /> : <Auth />} />
        <Route path="/tournament/:id" element={session ? <Tournament session={session} /> : <Auth />} />
        <Route path="/profile" element={session ? <Profile session={session} /> : <Auth />} />
        <Route path="/create-team" element={session ? <CreateTeam session={session} supabase={supabase} /> : <Auth />} />
        <Route path="/my-team" element={session ? <MyTeam session={session} supabase={supabase} /> : <Auth />} />
        <Route path="/join-team/:teamId" element={session ? <JoinTeam session={session} supabase={supabase} /> : <Auth />} />
        <Route path="/match/:id" element={session ? <MatchLobby session={session} supabase={supabase} /> : <Auth />} />
        <Route path="/create-tournament" element={session ? <CreateTournament session={session} supabase={supabase} /> : <Auth />} />
        <Route path="/stats" element={session ? <StatsDashboard session={session} supabase={supabase} /> : <Auth />} />
        <Route path="/leaderboard" element={session ? <Leaderboard session={session} supabase={supabase} /> : <Auth />} />

        {/* Catch-all pour les routes non définies */}
        <Route path="*" element={session ? <Navigate to="/" /> : <Auth />} />
      </Routes>
    </Router>
  )
}

export default App