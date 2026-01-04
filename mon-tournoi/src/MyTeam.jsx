import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MyTeam({ session, supabase }) {
  const [allTeams, setAllTeams] = useState([]); // Liste de toutes mes équipes
  const [currentTeam, setCurrentTeam] = useState(null); // L'équipe affichée actuellement
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) fetchAllMyTeams();
  }, [session]);

  // Si on change d'équipe via le menu déroulant, on charge ses membres
  useEffect(() => {
    if (currentTeam) {
      fetchMembers(currentTeam.id);
    }
  }, [currentTeam]);

  const fetchAllMyTeams = async () => {
    // 1. Récupérer les équipes où je suis CAPITAINE
    const { data: captainTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('captain_id', session.user.id)
      .order('created_at', { ascending: true }); // On fixe l'ordre pour éviter que ça bouge

    // 2. Récupérer les équipes où je suis MEMBRE
    const { data: memberData } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', session.user.id);

    let memberTeams = [];
    if (memberData && memberData.length > 0) {
        const ids = memberData.map(m => m.team_id);
        const { data: teams } = await supabase
          .from('teams')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: true });
        memberTeams = teams || [];
    }

    // 3. Fusionner les deux listes (en évitant les doublons si je suis capitaine et membre)
    // On utilise un Map pour filtrer par ID unique
    const mergedTeams = [...(captainTeams || []), ...memberTeams];
    const uniqueTeams = Array.from(new Map(mergedTeams.map(item => [item.id, item])).values());

    setAllTeams(uniqueTeams);

    // 4. Sélectionner la première équipe par défaut
    if (uniqueTeams.length > 0) {
      setCurrentTeam(uniqueTeams[0]);
    } else {
      setLoading(false); // Pas d'équipe
    }
  };

  const fetchMembers = async (teamId) => {
    const { data } = await supabase
        .from('team_members')
        .select('*, profiles(username, avatar_url)')
        .eq('team_id', teamId);
    setMembers(data || []);
    setLoading(false);
  };

  const handleTeamSwitch = (teamId) => {
    const selected = allTeams.find(t => t.id === teamId);
    setCurrentTeam(selected);
  };

  const uploadLogo = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('Sélectionne une image !');

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTeam.id}-${Date.now()}.${fileExt}`; // Nom unique avec timestamp

      // Upload
      const { error: uploadError } = await supabase.storage.from('team-logos').upload(fileName, file);
      if (uploadError) throw uploadError;

      // URL Publique
      const { data: { publicUrl } } = supabase.storage.from('team-logos').getPublicUrl(fileName);

      // Update DB
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: publicUrl })
        .eq('id', currentTeam.id);

      if (updateError) throw updateError;

      // Update Local State
      setCurrentTeam({ ...currentTeam, logo_url: publicUrl });
      
      // Mettre à jour aussi la liste globale pour que le logo change dans le sélecteur si besoin
      setAllTeams(prev => prev.map(t => t.id === currentTeam.id ? { ...t, logo_url: publicUrl } : t));
      
      alert("Logo mis à jour !");

    } catch (error) {
      alert('Erreur : ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join-team/${currentTeam.id}`;
    navigator.clipboard.writeText(link);
    alert("Lien d'invitation copié !");
  };

  const kickMember = async (userId) => {
    if (!confirm("Virer ce joueur ?")) return;
    await supabase.from('team_members').delete().match({ team_id: currentTeam.id, user_id: userId });
    fetchMembers(currentTeam.id); // Rafraîchir juste la liste des membres
  };

  if (loading) return <div style={{color:'#F8F6F2', padding:'20px', background: '#030913', fontFamily: "'Protest Riot', sans-serif", minHeight: '100vh'}}>Chargement...</div>;

  if (allTeams.length === 0) return (
    <div style={{color:'#F8F6F2', textAlign:'center', marginTop:'50px', background: '#030913', minHeight: '100vh', padding: '40px'}}>
      <h2 style={{fontFamily: "'Shadows Into Light', cursive", color: '#FF36A3', fontSize: '2rem'}}>Tu n'as pas encore d'équipe.</h2>
      <button 
        type="button"
        onClick={() => navigate('/create-team')} 
        style={{
          padding:'10px 20px', 
          background:'#C10468', 
          color:'#F8F6F2', 
          border:'2px solid #FF36A3', 
          borderRadius:'8px', 
          cursor:'pointer', 
          marginTop:'20px',
          fontFamily: "'Shadows Into Light', cursive",
          fontSize: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#FF36A3';
          e.currentTarget.style.borderColor = '#C10468';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#C10468';
          e.currentTarget.style.borderColor = '#FF36A3';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        Créer une Team
      </button>
    </div>
  );

  const isCaptain = currentTeam?.captain_id === session.user.id;

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', color: '#F8F6F2', maxWidth: '600px', margin: '0 auto', background: '#030913' }}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <button 
          type="button"
          onClick={() => navigate('/dashboard')} 
          style={{
            background:'transparent', 
            border:'2px solid #C10468', 
            color:'#F8F6F2', 
            padding:'8px 16px', 
            borderRadius:'8px', 
            cursor:'pointer',
            fontFamily: "'Shadows Into Light', cursive",
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#C10468';
            e.currentTarget.style.borderColor = '#FF36A3';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#C10468';
          }}
        >
          ← Retour
        </button>
        
        {/* SÉLECTEUR D'ÉQUIPE (Visible seulement si plusieurs équipes) */}
        {allTeams.length > 1 && (
            <select 
                value={currentTeam.id} 
                onChange={(e) => handleTeamSwitch(e.target.value)}
                style={{ 
                  padding:'8px', 
                  background:'rgba(3, 9, 19, 0.8)', 
                  color:'#F8F6F2', 
                  border:'2px solid #C10468', 
                  borderRadius:'8px',
                  fontFamily: "'Protest Riot', sans-serif",
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
            >
                {allTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>
                ))}
            </select>
        )}
      </div>
      
      <div style={{ background: 'rgba(3, 9, 19, 0.95)', padding: '30px', borderRadius: '15px', border: '2px solid #FF36A3', boxShadow: '0 8px 32px rgba(193, 4, 104, 0.3)' }}>
        
        {/* EN-TÊTE AVEC LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                <img 
                  src={currentTeam.logo_url || `https://ui-avatars.com/api/?name=${currentTeam.tag}&background=random&size=128`} 
                  alt="Team Logo" 
                  style={{ width: '100%', height: '100%', borderRadius: '15px', objectFit: 'cover', border: '2px solid #FF36A3' }}
                />
                
                {isCaptain && (
                  <>
                    <label htmlFor="logo-upload" style={{
                      position: 'absolute', bottom: '-5px', right: '-5px', 
                      background: '#FF36A3', color: '#F8F6F2', width: '30px', height: '30px', 
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', border: '2px solid #030913', fontWeight:'bold', fontSize:'1.2rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#C10468';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FF36A3';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    >
                      {uploading ? '⏳' : '+'}
                    </label>
                    <input 
                      type="file" 
                      id="logo-upload" 
                      accept="image/*" 
                      onChange={uploadLogo} 
                      disabled={uploading}
                      style={{ display: 'none' }} 
                    />
                  </>
                )}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
                <h1 style={{ margin: 0, color: '#F8F6F2', fontSize: '2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Shadows Into Light', cursive" }}>{currentTeam.name}</h1>
                <span style={{ fontSize: '1rem', color: '#FF36A3', fontWeight: 'bold', fontFamily: "'Protest Riot', sans-serif" }}>[{currentTeam.tag}]</span>
            </div>

            <button 
              type="button"
              onClick={copyInviteLink} 
              style={{ 
                background: '#C10468', 
                color: '#F8F6F2', 
                border: '2px solid #FF36A3', 
                padding: '10px 15px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontFamily: "'Shadows Into Light', cursive",
                fontWeight: 'bold', 
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FF36A3';
                e.currentTarget.style.borderColor = '#C10468';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#C10468';
                e.currentTarget.style.borderColor = '#FF36A3';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🔗 Inviter
            </button>
        </div>

        {/* LISTE DES MEMBRES */}
        <h3 style={{ borderBottom: '2px solid #FF36A3', paddingBottom: '10px', fontFamily: "'Shadows Into Light', cursive", color: '#FF36A3', fontSize: '1.5rem' }}>Roster ({members.length})</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {members.map(m => (
            <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid rgba(255, 54, 163, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={m.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${m.profiles?.username || 'User'}`} 
                  style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit:'cover', border: '2px solid #FF36A3' }} alt="" 
                />
                <span style={{color: m.user_id === session.user.id ? '#FF36A3' : '#F8F6F2', fontFamily: "'Protest Riot', sans-serif"}}>
                  {m.profiles?.username || 'Joueur sans pseudo'} 
                  {m.role === 'captain' && <span style={{ marginLeft: '10px', fontSize: '0.7rem', background: '#E7632C', color: '#F8F6F2', padding: '2px 6px', borderRadius: '4px', fontFamily: "'Protest Riot', sans-serif" }}>CAPTAIN</span>}
                </span>
              </div>
              
              {isCaptain && m.user_id !== session.user.id && (
                <button 
                  type="button"
                  onClick={() => kickMember(m.user_id)} 
                  style={{ 
                    background: 'transparent', 
                    color: '#F8F6F2', 
                    border: '2px solid #C10468', 
                    padding: '5px 10px', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    fontSize: '0.8rem',
                    fontFamily: "'Shadows Into Light', cursive",
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#C10468';
                    e.currentTarget.style.borderColor = '#FF36A3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#C10468';
                  }}
                >
                  Exclure
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}