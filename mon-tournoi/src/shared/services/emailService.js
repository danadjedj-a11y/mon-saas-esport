/**
 * Service d'envoi d'emails pour les notifications
 * Utilise Make.com (Integromat) pour l'envoi d'emails via webhook
 * 
 * Configuration:
 * 1. Créez un scénario Make.com avec un webhook comme trigger
 * 2. Ajoutez un module "Email" (Gmail, Outlook, ou SMTP)
 * 3. Copiez l'URL du webhook dans VITE_MAKE_WEBHOOK_URL de votre .env
 */

// URL du webhook Make.com (à configurer dans .env)
const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL || null;

// Configuration email
const EMAIL_CONFIG = {
  from: 'Fluky Boys <noreply@flukyboys.com>',
  replyTo: 'support@flukyboys.com'
};

/**
 * Envoie des données à Make.com via webhook
 */
const sendToMakeWebhook = async (data) => {
  if (!MAKE_WEBHOOK_URL) {
    console.warn('⚠️ VITE_MAKE_WEBHOOK_URL non configuré - Email non envoyé');
    console.log('📧 Données email (mode dev):', data);
    return { success: true, mode: 'dev' };
  }

  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Make.com webhook error: ${response.status}`);
    }

    console.log('✅ Email envoyé via Make.com');
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur webhook Make.com:', error);
    return { success: false, error };
  }
};

/**
 * Envoie un email d'invitation à rejoindre une équipe
 */
export const sendTeamInvitationEmail = async ({
  recipientEmail,
  recipientName,
  teamName,
  inviterName,
  message,
  invitationUrl
}) => {
  const emailData = {
    type: 'team_invitation',
    to: recipientEmail,
    toName: recipientName || 'Joueur',
    subject: `🎮 Invitation à rejoindre ${teamName} sur Fluky Boys`,
    // Données pour le template Make.com
    data: {
      recipientName: recipientName || 'joueur',
      teamName,
      inviterName,
      message: message || '',
      invitationUrl: invitationUrl || 'https://flukyboys.com',
      year: new Date().getFullYear()
    },
    // HTML pré-généré si Make.com le supporte directement
    html: generateTeamInvitationHTML({
      recipientName,
      teamName,
      inviterName,
      message,
      invitationUrl
    })
  };

  return sendToMakeWebhook(emailData);
};

/**
 * Envoie un email de notification de match
 */
export const sendMatchNotificationEmail = async ({
  recipientEmail,
  recipientName,
  matchInfo,
  tournamentName,
  matchUrl
}) => {
  const emailData = {
    type: 'match_notification',
    to: recipientEmail,
    toName: recipientName,
    subject: `⚔️ Votre match est prêt - ${tournamentName}`,
    data: {
      recipientName,
      tournamentName,
      matchUrl: matchUrl || 'https://flukyboys.com',
      year: new Date().getFullYear()
    },
    html: generateMatchNotificationHTML({
      recipientName,
      matchInfo,
      tournamentName
    })
  };

  return sendToMakeWebhook(emailData);
};

/**
 * Envoie un email générique (pour les admins, annonces, etc.)
 */
export const sendGenericEmail = async ({
  recipientEmail,
  recipientName,
  subject,
  content,
  ctaText,
  ctaUrl
}) => {
  const emailData = {
    type: 'generic',
    to: recipientEmail,
    toName: recipientName,
    subject,
    data: {
      recipientName,
      content,
      ctaText,
      ctaUrl,
      year: new Date().getFullYear()
    }
  };

  return sendToMakeWebhook(emailData);
};

// Templates HTML pour les emails

function generateTeamInvitationHTML({ recipientName, teamName, inviterName, message, invitationUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:0;">
    
    <!-- Header avec gradient -->
    <div style="background:linear-gradient(135deg,#1E0B4E 0%,#C10468 100%);padding:40px 30px;text-align:center;border-radius:12px 12px 0 0;">
      <h1 style="color:#ffffff;font-size:36px;margin:0;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
        FLUKY BOYS
      </h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:10px 0 0 0;letter-spacing:1px;">
        LA PLATEFORME ESPORT
      </p>
    </div>
    
    <!-- Contenu principal -->
    <div style="background:#12121a;padding:40px 30px;border-left:1px solid rgba(193,4,104,0.3);border-right:1px solid rgba(193,4,104,0.3);">
      
      <!-- Icône -->
      <div style="text-align:center;margin-bottom:25px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#C10468,#1E0B4E);width:70px;height:70px;border-radius:50%;line-height:70px;font-size:32px;">
          🎮
        </div>
      </div>
      
      <!-- Titre -->
      <h2 style="color:#ffffff;margin:0 0 25px 0;font-size:24px;text-align:center;font-weight:600;">
        Tu as reçu une invitation !
      </h2>
      
      <!-- Message principal -->
      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:25px;border:1px solid rgba(255,255,255,0.08);margin-bottom:25px;">
        <p style="color:#e0e0e0;font-size:16px;line-height:1.7;margin:0 0 15px 0;">
          Salut <strong style="color:#ffffff;">${recipientName || 'joueur'}</strong> 👋
        </p>
        
        <p style="color:#e0e0e0;font-size:16px;line-height:1.7;margin:0;">
          <strong style="color:#C10468;">${inviterName || 'Un capitaine'}</strong> t'invite à rejoindre son équipe
        </p>
        
        <!-- Nom de l'équipe mis en avant -->
        <div style="text-align:center;margin:20px 0;">
          <span style="display:inline-block;background:linear-gradient(135deg,#1E0B4E,#C10468);color:#ffffff;font-size:22px;font-weight:700;padding:15px 30px;border-radius:8px;letter-spacing:1px;">
            ${teamName || 'Une équipe'}
          </span>
        </div>
      </div>
      
      ${message ? `
      <!-- Message personnalisé -->
      <div style="background:rgba(193,4,104,0.1);border-left:4px solid #C10468;padding:20px;margin-bottom:25px;border-radius:0 8px 8px 0;">
        <p style="color:#aaa;font-size:13px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">
          💬 Message de ${inviterName || 'l\'inviteur'}
        </p>
        <p style="color:#e0e0e0;margin:0;font-size:15px;font-style:italic;line-height:1.6;">
          "${message}"
        </p>
      </div>
      ` : ''}
      
      <!-- Bouton CTA -->
      <div style="text-align:center;margin:30px 0;">
        <a href="${invitationUrl || 'https://flukyboys.com'}" 
           style="display:inline-block;background:linear-gradient(135deg,#C10468,#ff1493);color:#ffffff;padding:18px 50px;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 20px rgba(193,4,104,0.4);">
          ✨ Voir l'invitation
        </a>
      </div>
      
      <p style="color:#888;font-size:14px;text-align:center;margin:0;">
        Connecte-toi sur Fluky Boys pour accepter ou refuser cette invitation
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background:#0a0a0f;padding:30px;text-align:center;border-radius:0 0 12px 12px;border:1px solid rgba(193,4,104,0.2);border-top:none;">
      <p style="color:#666;font-size:12px;margin:0 0 10px 0;">
        © ${new Date().getFullYear()} Fluky Boys - Tous droits réservés
      </p>
      <p style="color:#555;font-size:11px;margin:0;">
        Tu reçois cet email car quelqu'un t'a invité sur Fluky Boys.<br>
        Si tu n'as pas demandé cette invitation, ignore simplement ce message.
      </p>
    </div>
    
  </div>
</body>
</html>
  `.trim();
}

function generateTeamInvitationText({ recipientName, teamName, inviterName, message, invitationUrl }) {
  return `
Fluky Boys - Invitation à rejoindre une équipe

Salut ${recipientName || 'joueur'},

${inviterName} t'invite à rejoindre l'équipe "${teamName}" !

${message ? `Message de ${inviterName}: "${message}"` : ''}

Connecte-toi sur Fluky Boys pour accepter ou refuser cette invitation:
${invitationUrl || 'https://flukyboys.com'}

---
Fluky Boys - La plateforme esport pour tous
Cet email a été envoyé automatiquement.
  `.trim();
}

function generateMatchNotificationHTML({ recipientName, matchInfo, tournamentName }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:0;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1E0B4E 0%,#C10468 100%);padding:40px 30px;text-align:center;border-radius:12px 12px 0 0;">
      <h1 style="color:#ffffff;font-size:36px;margin:0;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
        FLUKY BOYS
      </h1>
    </div>
    
    <!-- Contenu -->
    <div style="background:#12121a;padding:40px 30px;border-left:1px solid rgba(193,4,104,0.3);border-right:1px solid rgba(193,4,104,0.3);">
      
      <div style="text-align:center;margin-bottom:25px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#C10468,#1E0B4E);width:70px;height:70px;border-radius:50%;line-height:70px;font-size:32px;">
          ⚔️
        </div>
      </div>
      
      <h2 style="color:#ffffff;margin:0 0 25px 0;font-size:24px;text-align:center;font-weight:600;">
        Ton match est prêt !
      </h2>
      
      <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:25px;border:1px solid rgba(255,255,255,0.08);margin-bottom:25px;">
        <p style="color:#e0e0e0;font-size:16px;line-height:1.7;margin:0 0 15px 0;">
          Salut <strong style="color:#ffffff;">${recipientName || 'joueur'}</strong> 👋
        </p>
        
        <p style="color:#e0e0e0;font-size:16px;line-height:1.7;margin:0;">
          Ton match dans le tournoi est prêt à commencer !
        </p>
        
        <div style="text-align:center;margin:20px 0;">
          <span style="display:inline-block;background:linear-gradient(135deg,#1E0B4E,#C10468);color:#ffffff;font-size:20px;font-weight:700;padding:15px 30px;border-radius:8px;">
            🏆 ${tournamentName || 'Tournoi'}
          </span>
        </div>
      </div>
      
      <div style="text-align:center;margin:30px 0;">
        <a href="https://flukyboys.com" 
           style="display:inline-block;background:linear-gradient(135deg,#C10468,#ff1493);color:#ffffff;padding:18px 50px;text-decoration:none;border-radius:50px;font-weight:700;font-size:16px;text-transform:uppercase;letter-spacing:1px;box-shadow:0 4px 20px rgba(193,4,104,0.4);">
          🎮 Rejoindre le lobby
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background:#0a0a0f;padding:30px;text-align:center;border-radius:0 0 12px 12px;border:1px solid rgba(193,4,104,0.2);border-top:none;">
      <p style="color:#666;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} Fluky Boys - Tous droits réservés
      </p>
    </div>
    
  </div>
</body>
</html>
  `.trim();
}

export default {
  sendTeamInvitationEmail,
  sendMatchNotificationEmail,
  sendGenericEmail
};
