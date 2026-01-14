import React from 'react';
import { Card, Badge } from '../../../shared/components/ui';

/**
 * Composant pour afficher les métriques d'un tournoi
 */
const TournamentMetrics = ({ tournaments }) => {
  const draftCount = tournaments.filter(t => t.status === 'draft').length;
  const ongoingCount = tournaments.filter(t => t.status === 'ongoing').length;
  const completedCount = tournaments.filter(t => t.status === 'completed').length;
  const totalCount = tournaments.length;

  const metrics = [
    { label: 'Total', value: totalCount, icon: '🏆', color: 'bg-fluky-primary' },
    { label: 'Brouillons', value: draftCount, icon: '📝', color: 'bg-yellow-500' },
    { label: 'En cours', value: ongoingCount, icon: '⚔️', color: 'bg-green-500' },
    { label: 'Terminés', value: completedCount, icon: '🏁', color: 'bg-fluky-secondary' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} variant="glass" padding="lg" className="border-fluky-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-body text-fluky-text/70 mb-1">
                {metric.label}
              </div>
              <div className="text-3xl font-display text-fluky-secondary">
                {metric.value}
              </div>
            </div>
            <div className={`w-16 h-16 ${metric.color} rounded-full flex items-center justify-center text-3xl`}>
              {metric.icon}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default TournamentMetrics;
