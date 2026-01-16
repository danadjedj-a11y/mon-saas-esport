import React from 'react';
import AdminStatCard from './AdminStatCard';

/**
 * Onglet Statistiques du panneau admin
 * Affiche les statistiques détaillées du tournoi
 */
export default function AdminStatsTab({ stats }) {
  if (!stats) return null;

  return (
    <div>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Statistiques Détaillées</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <AdminStatCard
          title="Participants"
          value={stats.totalParticipants}
          subtitle={`${stats.checkedIn} check-in${stats.disqualified > 0 ? ` • ${stats.disqualified} DQ` : ''}`}
        />
        
        <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>Matchs</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8e44ad' }}>{stats.totalMatches}</div>
          <div style={{ fontSize: '0.85rem', color: '#4ade80', marginTop: '8px' }}>
            {stats.completedMatches} terminés ({stats.completionRate}%)
          </div>
        </div>
        
        <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>En attente</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f39c12' }}>{stats.pendingMatches}</div>
          <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '8px' }}>
            {stats.scheduledMatches} planifiés
          </div>
        </div>
        
        {stats.disputedMatches > 0 && (
          <AdminStatCard
            title="Conflits"
            value={stats.disputedMatches}
            subtitle="À résoudre"
            isAlert={true}
          />
        )}
      </div>
    </div>
  );
}
