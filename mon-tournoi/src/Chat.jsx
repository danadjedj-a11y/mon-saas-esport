import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ tournamentId, matchId, session, supabase }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMessageTimeRef = useRef(0);
  const messageCountRef = useRef(0);
  const rateLimitResetRef = useRef(Date.now());

  const MAX_MESSAGE_LENGTH = 500; // Limite de 500 caractères
  const RATE_LIMIT_MESSAGES = 5; // 5 messages maximum
  const RATE_LIMIT_WINDOW = 10000; // Par fenêtre de 10 secondes
  const MIN_TIME_BETWEEN_MESSAGES = 1000; // 1 seconde minimum entre chaque message

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
    // Scroll uniquement si on est déjà proche du bas (pour ne pas déranger l'utilisateur s'il scroll en haut)
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        // Petit délai pour laisser le DOM se mettre à jour
        setTimeout(() => {
          scrollToBottom();
        }, 50);
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      // Utiliser scrollTop directement au lieu de scrollIntoView pour éviter les scrolls continus
      container.scrollTop = container.scrollHeight;
    }
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
    if (!session || sending) return;

    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;

    // Vérifier la longueur
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      alert(`Message trop long (maximum ${MAX_MESSAGE_LENGTH} caractères)`);
      return;
    }

    const now = Date.now();
    
    // Vérifier le rate limiting (fenêtre glissante)
    if (now - rateLimitResetRef.current > RATE_LIMIT_WINDOW) {
      // Réinitialiser le compteur si la fenêtre est expirée
      messageCountRef.current = 0;
      rateLimitResetRef.current = now;
    }

    // Vérifier le nombre de messages dans la fenêtre
    if (messageCountRef.current >= RATE_LIMIT_MESSAGES) {
      const timeLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - rateLimitResetRef.current)) / 1000);
      alert(`Trop de messages envoyés. Veuillez attendre ${timeLeft} seconde(s).`);
      return;
    }

    // Vérifier le temps minimum entre les messages
    if (now - lastMessageTimeRef.current < MIN_TIME_BETWEEN_MESSAGES) {
      alert('Veuillez attendre avant d\'envoyer un nouveau message.');
      return;
    }

    setSending(true);
    lastMessageTimeRef.current = now;
    messageCountRef.current += 1;

    try {
      // React échappe automatiquement les strings, pas besoin de sanitization HTML
      const messageData = {
        content: trimmedMessage.substring(0, MAX_MESSAGE_LENGTH), // Limiter la longueur au cas où
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
        messageCountRef.current -= 1; // Annuler le compteur en cas d'erreur
      } else {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert('Erreur lors de l\'envoi du message');
      messageCountRef.current -= 1;
    } finally {
      setSending(false);
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

      <form onSubmit={sendMessage} style={{ padding: '10px', borderTop: '1px solid #333', display: 'flex', gap: '10px', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= MAX_MESSAGE_LENGTH) {
                setNewMessage(value);
              }
            }} 
            placeholder="Message..." 
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={sending}
            style={{ 
              flex: 1, 
              padding: '10px', 
              borderRadius: '5px', 
              border: '1px solid #444', 
              background: '#222', 
              color: 'white',
              opacity: sending ? 0.6 : 1
            }}
          />
          <button 
            type="submit" 
            disabled={sending || !newMessage.trim()}
            style={{ 
              padding: '10px 15px', 
              background: sending || !newMessage.trim() ? '#555' : '#00d4ff', 
              border: 'none', 
              borderRadius: '5px', 
              fontWeight: 'bold', 
              cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !newMessage.trim() ? 0.6 : 1
            }}
          >
            {sending ? '...' : '➤'}
          </button>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#666', textAlign: 'right' }}>
          {newMessage.length}/{MAX_MESSAGE_LENGTH}
        </div>
      </form>
    </div>
  );
}