import React, { useState } from 'react';
import { Drone, DroneState } from '../types';
import { api } from '../services/api';
import './DroneList.css';

interface DroneListProps {
  drones: Drone[];
  compact?: boolean;
  onDroneCreated?: () => void;
}

const DroneList: React.FC<DroneListProps> = ({ drones, compact = false, onDroneCreated }) => {
  console.log("🚁 DroneList renderizando com", drones.length, "drones");
  console.log("🚁 Dados dos drones:", JSON.stringify(drones.slice(0, 2), null, 2));
  const [showForm, setShowForm] = useState(false);
  const [newDrone, setNewDrone] = useState({
    name: '',
    maxWeight: 10,
    maxDistance: 50,
    baseLocation: { x: 0, y: 0 },
  });
  const getStateColor = (state: DroneState) => {
    switch (state) {
      case DroneState.IDLE:
        return '#10b981';
      case DroneState.LOADING:
        return '#f59e0b';
      case DroneState.FLYING:
        return '#3b82f6';
      case DroneState.DELIVERING:
        return '#8b5cf6';
      case DroneState.RETURNING:
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStateLabel = (state: DroneState) => {
    const labels: Record<DroneState, string> = {
      [DroneState.IDLE]: 'Ocioso',
      [DroneState.LOADING]: 'Carregando',
      [DroneState.FLYING]: 'Em Voo',
      [DroneState.DELIVERING]: 'Entregando',
      [DroneState.RETURNING]: 'Retornando',
    };
    return labels[state] || state;
  };

  const handleCreateDrone = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validação adicional no frontend
    if (!newDrone.name || newDrone.name.trim() === '') {
      alert('Por favor, informe o nome do drone');
      return;
    }
    
    if (!newDrone.maxWeight || newDrone.maxWeight <= 0) {
      alert('Por favor, informe uma capacidade máxima maior que zero');
      return;
    }
    
    if (!newDrone.maxDistance || newDrone.maxDistance <= 0) {
      alert('Por favor, informe um alcance máximo maior que zero');
      return;
    }
    
    try {
      console.log('🚁 Criando drone:', newDrone);
      const createdDrone = await api.createDrone(newDrone);
      console.log('✅ Drone criado com sucesso:', createdDrone);
      
      setNewDrone({
        name: '',
        maxWeight: 10,
        maxDistance: 50,
        baseLocation: { x: 0, y: 0 },
      });
      setShowForm(false);
      
      if (onDroneCreated) {
        console.log('🔄 Chamando onDroneCreated callback...');
        // Aguardar um pouco para garantir que o backend processou
        setTimeout(() => {
          onDroneCreated();
        }, 300);
      } else {
        console.warn('⚠️ onDroneCreated callback não fornecido');
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar drone:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao criar drone';
      alert(`Erro ao criar drone: ${errorMessage}`);
    }
  };

  const handleRecharge = async (id: string) => {
    try {
      await api.rechargeDrone(id);
      if (onDroneCreated) {
        await onDroneCreated();
      }
    } catch (error: any) {
      alert(`Erro ao recarregar: ${error.message}`);
    }
  };

  const handleDeleteDrone = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este drone?')) {
      return;
    }
    try {
      await api.deleteDrone(id);
      if (onDroneCreated) {
        onDroneCreated();
      }
    } catch (error: any) {
      alert(`Erro ao remover drone: ${error.message}`);
    }
  };

  if (compact) {
    console.log("🚁 DroneList compact - drones:", drones.length);
    return (
      <div className="drone-list compact">
        <h3>🚁 Drones ({drones.length})</h3>
        {drones.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Nenhum drone cadastrado
          </p>
        ) : (
          <div className="drone-grid">
            {drones.slice(0, 3).map((drone) => (
            <div key={drone.id} className="drone-card compact">
              <div className="drone-header">
                <span className="drone-name">{drone.name}</span>
                <span
                  className="drone-state"
                  style={{ backgroundColor: getStateColor(drone.currentState) }}
                >
                  {getStateLabel(drone.currentState)}
                </span>
              </div>
              <div className="drone-info">
                <div>🔋 {drone.batteryLevel}%</div>
                <div>📦 {drone.totalDeliveries} entregas</div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="drone-list">
      <div className="drone-list-header">
        <h2>🚁 Drones</h2>
        <button 
          className="btn-create" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Botão clicado! showForm atual:', showForm);
            setShowForm(!showForm);
          }}
          type="button"
        >
          {showForm ? 'Cancelar' : '+ Novo Drone'}
        </button>
      </div>

      {showForm && (
        <form className="drone-form" onSubmit={handleCreateDrone}>
          <h3>Criar Novo Drone</h3>
          <div className="form-group">
            <label>Nome:</label>
            <input
              type="text"
              value={newDrone.name}
              onChange={(e) => setNewDrone({ ...newDrone, name: e.target.value })}
              placeholder="Ex: Drone Alpha"
              required
            />
          </div>
          <div className="form-group">
            <label>Capacidade Máxima (kg):</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={newDrone.maxWeight}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                  setNewDrone({ ...newDrone, maxWeight: value });
                }
              }}
              required
            />
          </div>
          <div className="form-group">
            <label>Alcance Máximo (km):</label>
            <input
              type="number"
              min="1"
              step="1"
              value={newDrone.maxDistance}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0) {
                  setNewDrone({ ...newDrone, maxDistance: value });
                }
              }}
              required
            />
          </div>
          <div className="form-group">
            <label>Localização Base X:</label>
            <input
              type="number"
              value={newDrone.baseLocation.x}
              onChange={(e) =>
                setNewDrone({
                  ...newDrone,
                  baseLocation: { ...newDrone.baseLocation, x: parseInt(e.target.value) || 0 },
                })
              }
            />
          </div>
          <div className="form-group">
            <label>Localização Base Y:</label>
            <input
              type="number"
              value={newDrone.baseLocation.y}
              onChange={(e) =>
                setNewDrone({
                  ...newDrone,
                  baseLocation: { ...newDrone.baseLocation, y: parseInt(e.target.value) || 0 },
                })
              }
            />
          </div>
          <button type="submit" className="btn-submit">
            Criar Drone
          </button>
        </form>
      )}

      <div className="drone-grid">
        {drones.map((drone) => (
          <div key={drone.id} className="drone-card">
            <div className="drone-header">
              <span className="drone-name">{drone.name}</span>
              <span
                className="drone-state"
                style={{ backgroundColor: getStateColor(drone.currentState) }}
              >
                {getStateLabel(drone.currentState)}
              </span>
            </div>
            <div className="drone-details">
              <div className="detail-item">
                <span className="detail-label">ID:</span>
                <span className="detail-value">{drone.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Bateria:</span>
                <div className="battery-container">
                  <div
                    className="battery-bar"
                    style={{
                      width: `${drone.batteryLevel}%`,
                      backgroundColor:
                        drone.batteryLevel > 50
                          ? '#10b981'
                          : drone.batteryLevel > 20
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  />
                  <span className="battery-text">{drone.batteryLevel}%</span>
                </div>
              </div>
              <div className="detail-item">
                <span className="detail-label">Capacidade:</span>
                <span className="detail-value">{drone.maxWeight} kg</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Alcance:</span>
                <span className="detail-value">{drone.maxDistance} km</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Localização:</span>
                <span className="detail-value">
                  ({drone.currentLocation.x}, {drone.currentLocation.y})
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Entregas:</span>
                <span className="detail-value">{drone.totalDeliveries}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Distância Total:</span>
                <span className="detail-value">{drone.totalDistance.toFixed(1)} km</span>
              </div>
              {drone.currentDelivery && (
                <div className="detail-item">
                  <span className="detail-label">Entrega Atual:</span>
                  <span className="detail-value">{drone.currentDelivery.id.slice(0, 8)}...</span>
                </div>
              )}
            </div>
            <div className="drone-actions">
              {drone.currentState === DroneState.IDLE && drone.batteryLevel < 100 && (
                <button
                  className="btn-recharge"
                  onClick={() => handleRecharge(drone.id)}
                >
                  Recarregar
                </button>
              )}
              {drone.currentState === DroneState.IDLE && !drone.currentDelivery && (
                <button
                  className="btn-cancel"
                  onClick={() => handleDeleteDrone(drone.id)}
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DroneList;

