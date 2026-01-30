import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { toast } from './utils/toast';
import { messageSchema } from './shared/utils/schemas/message';

export default function Chat({ tournamentId, matchId, session }) {
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

  // Queries Convex - se mettent à jour automatiquement en temps réel
  const matchMessages = useQuery(
    api.chat.listByMatch,
    isMatchChat && matchId ? { matchId, limit: 100 } : "skip"
  );
  
  // Pour le chat tournoi, on n'a pas encore de table séparée dans Convex
  // On utilise matchChat pour les matchs uniquement
  const rawMessages = matchMessages ?? [];
  
  // Adapter les messages pour l'affichage
  const messages = useMemo(() => {
    return rawMessages.map(msg => ({
      ...msg,
      id: msg._id,
      user_id: msg.userId,
      created_at: msg.createdAt,
      profiles: msg.user ? {
        username: msg.user.username,
        avatar_url: msg.user.avatarUrl
      } : null
    }));
  }, [rawMessages]);

  // Mutation Convex pour envoyer un message
  const sendMessageMut = useMutation(api.chat.send);

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
    if (!session || sending || !isMatchChat) return;

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
      await sendMessageMut({
        matchId,
        message: trimmedMessage.substring(0, MAX_MESSAGE_LENGTH)
      });
      setNewMessage('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message: ' + error.message);
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