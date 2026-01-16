import React from 'react';
import AdminStatCard from './AdminStatCard';

/**
 * Onglet Vue d'ensemble du panneau admin
 * Affiche les métriques principales et statistiques détaillées
 */
export default function AdminOverviewTab({ stats }) {
  if (!stats) return null;

  return (
    <div>
      {/* Métriques principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <AdminStatCard
          title="Participants"
          value={stats.totalParticipants}
          subtitle={`${stats.checkedIn} check-in${stats.disqualified > 0 ? ` • ${stats.disqualified} DQ` : ''}`}
          gradient="linear-gradient(135deg, #3498db, #2980b9)"
          borderColor="#2980b9"
        />
        
        <AdminStatCard
          title="Matchs"
          value={stats.totalMatches}
          subtitle={`${stats.completedMatches} terminés (${stats.completionRate}%)`}
          gradient="linear-gradient(135deg, #8e44ad, #7d3c98)"
          borderColor="#7d3c98"
        />
        
        <AdminStatCard
          title="En attente"
          value={stats.pendingMatches}
          subtitle={`${stats.scheduledMatches} planifiés`}
          gradient="linear-gradient(135deg, #f39c12, #e67e22)"
          borderColor="#e67e22"
        />
        
        {stats.disputedMatches > 0 && (
          <AdminStatCard
            title="Conflits"
            value={stats.disputedMatches}
            subtitle="Nécessitent une résolution"
            gradient="linear-gradient(135deg, #e74c3c, #c0392b)"
            borderColor="#c0392b"
          />
        )}
      </div>

      {/* Statistiques détaillées */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Matchs par Round */}
        {Object.keys(stats.matchesByRound).length > 0 && (
          <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#00d4ff' }}>📋 Matchs par Round</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(stats.matchesByRound)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([round, data]) => (
                  <div key={round} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#1a1a1a', borderRadius: '5px' }}>
                    <span style={{ fontWeight: 'bold' }}>Round {round}</span>
                    <span style={{ color: '#aaa' }}>
                      {data.completed}/{data.total} ({data.total > 0 ? ((data.completed / data.total) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Scores moyens */}
        <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#4ade80' }}>⚽ Scores Moyens</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Équipe 1</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>{stats.avgScore1}</span>
            </div>
            <div style={{ height: '1px', background: '#444' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Équipe 2</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>{stats.avgScore2}</span>
            </div>
          </div>
        </div>

        {/* Stats Best-of-X */}
        {stats.bestOfStats && (
          <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#f39c12' }}>🎮 Best-of-X</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Manches totales</span>
                <span style={{ fontWeight: 'bold' }}>{stats.bestOfStats.totalGames}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Manches terminées</span>
                <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{stats.bestOfStats.completedGames}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Taux de complétion</span>
                <span style={{ fontWeight: 'bold', color: '#00d4ff' }}>{stats.bestOfStats.completionRate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
