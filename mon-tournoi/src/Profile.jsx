import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Profile({ session }) {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (session) getProfile();
  }, [session]);

  async function getProfile() {
    const { data } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
    if (data) {
      setUsername(data.username || '');
      setAvatarUrl(data.avatar_url || '');
    }
  }

  async function updateProfile() {
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    });
    if (error) alert("Erreur : " + error.message);
    else alert("Profil mis à jour !");
  }

  return (
    <div style={{ padding: '40px', color: 'white', maxWidth: '500px', margin: '0 auto', background: '#1a1a1a', borderRadius: '15px', marginTop: '50px', border: '1px solid #333' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', marginBottom: '20px' }}>← Retour au Dashboard</button>
      <h2 style={{ marginBottom: '30px' }}>Settings de mon Profil</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Ton Pseudo :</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#000', color: 'white' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', color: '#888' }}>Lien de ta photo (URL) :</label>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #333', background: '#000', color: 'white' }} />
        </div>

        {avatarUrl && (
          <div style={{ textAlign: 'center' }}>
            <img src={avatarUrl} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3498db' }} alt="Aperçu" />
          </div>
        )}

        <button onClick={updateProfile} style={{ background: '#3498db', color: 'white', padding: '15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
          Sauvegarder les modifications
        </button>
      </div>
    </div>
  );
}