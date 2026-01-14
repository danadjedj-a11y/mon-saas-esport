import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from './utils/toast';
import { messageSchema } from './shared/utils/schemas/message';

export default function Chat({ tournamentId, matchId, session, supabase }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMessageTimeRef = useRef(0);
  const messageCountRef = useRef(0);
  const rateLimitResetRef = useRef(Date.now());
  const isMountedRef = useRef(true);

  const MAX_MESSAGE_LENGTH = 500;
  const RATE_LIMIT_MESSAGES = 5;
  const RATE_LIMIT_WINDOW = 10000;
  const MIN_TIME_BETWEEN_MESSAGES = 1000;

  const isMatchChat = !!matchId;
  const channelContext = isMatchChat ? `match-${matchId}` : `tournament-${tournamentId}`;

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Mémoriser scrollToBottom
  const scrollToBottom = useCallback(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Mémoriser fetchMessages avec toutes les dépendances
  const fetchMessages = useCallback(async () => {
    if (!tournamentId && !matchId) return;

    try {
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
        toast.error("Erreur lors du chargement des messages");
        // Garder les messages précédents en cas d'erreur
        return;
      }

      if (isMountedRef.current) {
        setMessages(data || []);
      }
    } catch (err) {
      console.error("Exception lors du chargement des messages:", err);
      if (isMountedRef.current) {
        toast.error("Erreur lors du chargement des messages");
      }
    }
  }, [tournamentId, matchId, isMatchChat, supabase]);

  // Effect pour charger les messages et s'abonner aux changements
  useEffect(() => {
    if (!tournamentId && !matchId) return;

    isMountedRef.current = true;
    fetchMessages();

    const channel = supabase.channel(`chat-${channelContext}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: isMatchChat ? `match_id=eq.${matchId}` : `tournament_id=eq.${tournamentId}`
      }, 
      () => {
        if (isMountedRef.current) {
          fetchMessages(); 
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, matchId, channelContext, isMatchChat, supabase, fetchMessages]);

  // Effect pour le scroll automatique
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container && isMountedRef.current) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      if (isNearBottom) {
        const timeoutId = setTimeout(() => {
          if (isMountedRef.current) {
            scrollToBottom();
          }
        }, 50);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messages, scrollToBottom]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!session || sending) return;

    // Validation avec Zod
    const result = messageSchema.safeParse({ content: newMessage });
    
    if (!result.success) {
      // Afficher la première erreur
      const firstError = result.error.issues[0];
      toast.warning(firstError.message);
      return;
    }
    
    const trimmedMessage = result.data.content;

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
      toast.warning(`Trop de messages envoyés. Veuillez attendre ${timeLeft} seconde(s).`);
      return;
    }

    // Vérifier le temps minimum entre les messages
    if (now - lastMessageTimeRef.current < MIN_TIME_BETWEEN_MESSAGES) {
      toast.warning('Veuillez attendre avant d\'envoyer un nouveau message.');
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
        toast.error("Erreur envoi : " + error.message);
        messageCountRef.current -= 1; // Annuler le compteur en cas d'erreur
      } else {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
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