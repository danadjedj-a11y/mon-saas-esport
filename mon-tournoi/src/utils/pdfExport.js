// Utilitaire pour l'export PDF des résultats de tournoi
import jsPDF from 'jspdf';

/**
 * Exporte les résultats d'un tournoi en PDF
 * @param {Object} tournament - Données du tournoi
 * @param {Array} participants - Liste des participants
 * @param {Array} matches - Liste des matchs
 * @param {Array} standings - Classement (optionnel, pour Round Robin/Swiss)
 */
export function exportTournamentToPDF(tournament, participants, matches, standings = null) {
  const doc = new jsPDF();
  
  // Couleurs
  const primaryColor = [52, 152, 219]; // #3498db
  const darkColor = [26, 26, 26]; // #1a1a1a
  
  let yPos = 20;
  
  // Titre
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.text(tournament.name, 14, yPos);
  yPos += 10;
  
  // Informations du tournoi
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Jeu: ${tournament.game}`, 14, yPos);
  yPos += 7;
  
  const formatNames = {
    'elimination': 'Élimination Directe',
    'double_elimination': 'Double Elimination',
    'round_robin': 'Championnat (Round Robin)',
    'swiss': 'Système Suisse'
  };
  doc.text(`Format: ${formatNames[tournament.format] || tournament.format}`, 14, yPos);
  yPos += 7;
  
  doc.text(`Statut: ${tournament.status === 'completed' ? 'Terminé' : tournament.status === 'ongoing' ? 'En cours' : 'Inscriptions'}`, 14, yPos);
  yPos += 7;
  
  if (tournament.start_date) {
    const date = new Date(tournament.start_date);
    doc.text(`Date de début: ${date.toLocaleDateString('fr-FR')}`, 14, yPos);
    yPos += 7;
  }
  
  doc.text(`Participants: ${participants.length}`, 14, yPos);
  yPos += 15;
  
  // Classement (si disponible)
  if (standings && standings.length > 0) {
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text('Classement Final', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // En-tête du tableau
    let xPos = 14;
    doc.setFont(undefined, 'bold');
    doc.text('Rang', xPos, yPos);
    xPos += 20;
    doc.text('Équipe', xPos, yPos);
    xPos += 80;
    
    if (tournament.format === 'swiss') {
      doc.text('V', xPos, yPos);
      xPos += 15;
      doc.text('D', xPos, yPos);
      xPos += 15;
      doc.text('N', xPos, yPos);
      xPos += 15;
      doc.text('Buchholz', xPos, yPos);
    } else {
      doc.text('Pts', xPos, yPos);
      xPos += 20;
      doc.text('J', xPos, yPos);
      xPos += 20;
      doc.text('V', xPos, yPos);
      xPos += 20;
      doc.text('N', xPos, yPos);
      xPos += 20;
      doc.text('D', xPos, yPos);
    }
    
    yPos += 7;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, 190, yPos);
    yPos += 5;
    
    // Lignes du classement
    doc.setFont(undefined, 'normal');
    standings.slice(0, 20).forEach((team, index) => { // Limiter à 20 pour tenir sur la page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      xPos = 14;
      doc.text(`#${index + 1}`, xPos, yPos);
      xPos += 20;
      
      const teamName = team.teams?.name || team.name || 'Inconnu';
      doc.text(teamName.length > 30 ? teamName.substring(0, 27) + '...' : teamName, xPos, yPos);
      xPos += 80;
      
      if (tournament.format === 'swiss') {
        doc.text(String(team.wins || 0), xPos, yPos);
        xPos += 15;
        doc.text(String(team.losses || 0), xPos, yPos);
        xPos += 15;
        doc.text(String(team.draws || 0), xPos, yPos);
        xPos += 15;
        doc.text(String((team.buchholz_score || 0).toFixed(1)), xPos, yPos);
      } else {
        doc.text(String(team.points || 0), xPos, yPos);
        xPos += 20;
        doc.text(String(team.played || 0), xPos, yPos);
        xPos += 20;
        doc.text(String(team.wins || 0), xPos, yPos);
        xPos += 20;
        doc.text(String(team.draws || 0), xPos, yPos);
        xPos += 20;
        doc.text(String(team.losses || 0), xPos, yPos);
      }
      
      yPos += 7;
    });
    
    yPos += 10;
  }
  
  // Résultats des matchs
  if (matches && matches.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.text('Résultats des Matchs', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    const completedMatches = matches.filter(m => m.status === 'completed');
    const matchesByRound = {};
    
    completedMatches.forEach(match => {
      const round = match.round_number || 1;
      if (!matchesByRound[round]) matchesByRound[round] = [];
      matchesByRound[round].push(match);
    });
    
    Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).forEach(round => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFont(undefined, 'bold');
      doc.text(`Round ${round}`, 14, yPos);
      yPos += 7;
      doc.setFont(undefined, 'normal');
      
      matchesByRound[round].forEach(match => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        const p1Name = match.p1_name || 'Équipe 1';
        const p2Name = match.p2_name || 'Équipe 2';
        const score1 = match.score_p1 ?? '-';
        const score2 = match.score_p2 ?? '-';
        
        doc.text(`${p1Name.split(' [')[0]} ${score1} - ${score2} ${p2Name.split(' [')[0]}`, 20, yPos);
        yPos += 6;
      });
      
      yPos += 3;
    });
  }
  
  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i}/${pageCount}`, 190, 285, { align: 'right' });
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 285);
  }
  
  // Sauvegarder
  const fileName = `${tournament.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

