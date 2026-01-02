import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ tournamentId, matchId, session, supabase }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const isMatchChat = !!matchId;
  const channelContext = isMatchChat ? `match-${matchId}` : `tournament-${tournamentId}`;

  useEffect(() => {
    if (!tournamentId && !matchId) return;

    fetchMessages();

    const channel = supabase.channel(`chat-${channelContext}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: isMatchChat ? `match_id=eq.${matchId}` : `tournament_id=eq.${tournamentId}`
      }, 
      (payload) => {
        fetchMessages(); 
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [tournamentId, matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    let query = supabase
      .from('messages')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: true });

    if (isMatchChat) {
      query = query.eq('match_id', matchId);
    } else {
      query = query.eq('tournament_id', tournamentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur chargement chat:", error);
    }
    else setMessages(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session) return;

    const messageData = {
      content: newMessage, // <--- ON UTILISE BIEN "content" ICI
      user_id: session.user.id,
    };

    if (isMatchChat) {
      messageData.match_id = matchId;
    } else {
      messageData.tournament_id = tournamentId;
    }

    const { error } = await supabase.from('messages').insert([messageData]);

    if (error) {
      alert("Erreur envoi : " + error.message);
    } else {
      setNewMessage('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1a1a', color: 'white' }}>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div style={{color:'#666', textAlign:'center', marginTop:'20px', fontStyle:'italic'}}>
            {isMatchChat ? "Chat du match." : "Chat du tournoi."}
          </div>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.user_id === session?.user?.id;
          return (
            <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row', marginBottom:'4px' }}>
                 <span style={{ fontSize: '0.7rem', color: '#888' }}>{msg.profiles?.username || '...'}</span>
              </div>
              <div style={{ 
                background: isMe ? '#8e44ad' : '#333', 
                padding: '8px 12px', 
                borderRadius: '8px',
                wordBreak: 'break-word'
              }}>
                {/* --- ICI AUSSI ON UTILISE .content --- */}
                {msg.content} 
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} style={{ padding: '10px', borderTop: '1px solid #333', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          placeholder="Message..." 
          style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#222', color: 'white' }}
        />
        <button type="submit" style={{ padding: '10px 15px', background: '#00d4ff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
          ➤
        </button>
      </form>
    </div>
  );
}