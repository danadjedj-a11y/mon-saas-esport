import React, { useState, useEffect } from 'react';

export default function Chat({ tournamentId, session, supabase }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    fetchMessages();

    const channel = supabase.channel(`chat-${tournamentId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `tournament_id=eq.${tournamentId}` 
      }, async (payload) => {
        // Sécurité : on récupère le profil dès qu'un message arrive
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.user_id)
          .single();
        
        const messageWithProfile = { ...payload.new, profiles: profile };
        setMessages(prev => [...prev, messageWithProfile]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [tournamentId]);

  const fetchMessages = async () => {
    console.log("Recherche des messages pour le tournoi :", tournamentId);

    const { data, error } = await supabase
      .from('messages')
      .select('*') // On prend tout sans jointure compliquée pour tester
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Erreur Supabase détaillée :", error);
    } else {
      console.log("Nombre de messages trouvés :", data?.length);
      setMessages(data || []);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.user) return;

    const { error } = await supabase.from('messages').insert([{ 
      tournament_id: tournamentId, 
      user_id: session.user.id, 
      text: newMessage,
      user_email: session.user.email
    }]);

    if (error) console.error("Erreur envoi:", error);
    setNewMessage('');
  };

  return (
    <div style={{ background: '#111', borderRadius: '8px', border: '1px solid #333', display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {messages.map((m, i) => {
          // Sécurité d'affichage : si le profil manque, on utilise l'email ou "Anonyme"
          const name = m.profiles?.username || m.user_email?.split('@')[0] || "Joueur";
          const avatar = m.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user_id}`;

          return (
            <div key={i} style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <img 
                src={avatar} 
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#333', marginTop: '2px' }} 
                alt="av"
              />
              <div style={{ fontSize: '0.9rem' }}>
                <div style={{ color: '#3498db', fontWeight: 'bold', fontSize: '0.75rem' }}>{name}</div>
                <div style={{ color: '#ddd', background: '#222', padding: '6px 10px', borderRadius: '0 8px 8px 8px', marginTop: '2px' }}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={sendMessage} style={{ display: 'flex', borderTop: '1px solid #333', background: '#1a1a1a', padding: '5px' }}>
        <input 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)} 
          placeholder="Écris un message..." 
          style={{ flex: 1, padding: '10px', background: 'transparent', border: 'none', color: 'white', outline: 'none' }} 
        />
        <button type="submit" style={{ padding: '0 15px', background: '#3498db', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>
          Envoyer
        </button>
      </form>
    </div>
  );
}