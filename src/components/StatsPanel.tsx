import React from "react";
import { DeliveryStats } from "../types";
import "./StatsPanel.css";

interface StatsPanelProps {
  stats: DeliveryStats | null;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="stats-panel">
        <h2>📊 Estatísticas do Sistema</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">0</div>
            <div className="stat-label">Total de Entregas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">0</div>
            <div className="stat-label">Entregas Concluídas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-value">0</div>
            <div className="stat-label">Tempo Médio (min)</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📏</div>
            <div className="stat-value">0</div>
            <div className="stat-label">Distância Total (km)</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-panel">
      <h2>📊 Estatísticas do Sistema</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">{stats.totalDeliveries}</div>
          <div className="stat-label">Total de Entregas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.completedDeliveries}</div>
          <div className="stat-label">Entregas Concluídas</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">
            {stats.averageDeliveryTime.toFixed(1)}
          </div>
          <div className="stat-label">Tempo Médio (min)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📏</div>
          <div className="stat-value">{stats.totalDistance.toFixed(1)}</div>
          <div className="stat-label">Distância Total (km)</div>
        </div>
        {stats.mostEfficientDrone && (
          <div className="stat-card highlight">
            <div className="stat-icon">🏆</div>
            <div className="stat-value">
              Drone #{stats.mostEfficientDrone.droneId.slice(0, 8)}
            </div>
            <div className="stat-label">
              Mais Eficiente: {stats.mostEfficientDrone.deliveries} entregas
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPanel;
