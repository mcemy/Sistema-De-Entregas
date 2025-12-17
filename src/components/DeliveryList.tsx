import React from 'react';
import { Delivery } from '../types';
import './DeliveryList.css';

interface DeliveryListProps {
  deliveries: Delivery[];
}

const DeliveryList: React.FC<DeliveryListProps> = ({ deliveries }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#6b7280';
      case 'in-progress':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Agendada',
      'in-progress': 'Em Andamento',
      completed: 'Concluída',
      failed: 'Falhou',
    };
    return labels[status] || status;
  };

  return (
    <div className="delivery-list">
      <h2>🚚 Entregas</h2>
      {deliveries.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma entrega ainda. Crie pedidos e atribua entregas!</p>
        </div>
      ) : (
        <div className="delivery-grid">
          {deliveries
            .sort((a, b) => {
              const statusOrder: Record<string, number> = {
                completed: 1,
                'in-progress': 2,
                scheduled: 3,
                failed: 4,
              };
              return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
            })
            .map((delivery) => (
            <div key={delivery.id} className="delivery-card">
              <div className="delivery-header">
                <span className="delivery-id">#{delivery.id.slice(0, 8)}</span>
                <span
                  className="delivery-status"
                  style={{ backgroundColor: getStatusColor(delivery.status) }}
                >
                  {getStatusLabel(delivery.status)}
                </span>
              </div>
              <div className="delivery-details">
                <div className="detail-item">
                  <span className="detail-label">Drone:</span>
                  <span className="detail-value">{delivery.droneId.slice(0, 8)}...</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pedidos:</span>
                  <span className="detail-value">{delivery.orders.length}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Peso Total:</span>
                  <span className="detail-value">{delivery.totalWeight} kg</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Distância:</span>
                  <span className="detail-value">{delivery.totalDistance.toFixed(1)} km</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tempo Estimado:</span>
                  <span className="detail-value">{delivery.estimatedTime} min</span>
                </div>
                {delivery.startedAt && (
                  <div className="detail-item">
                    <span className="detail-label">Iniciada em:</span>
                    <span className="detail-value">
                      {new Date(delivery.startedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {delivery.completedAt && (
                  <div className="detail-item">
                    <span className="detail-label">Concluída em:</span>
                    <span className="detail-value">
                      {new Date(delivery.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="delivery-orders">
                <strong>Pedidos ({delivery.orders.length}):</strong>
                <ul>
                  {delivery.orders.map((order) => (
                    <li key={order.id}>
                      #{order.id.slice(0, 8)} - {order.weight} kg - 
                      {order.status === 'delivered' ? ' ✅ Entregue' : 
                       order.status === 'assigned' ? ' 📦 Atribuído' : 
                       ' ⏳ Pendente'} - 
                      ({order.customerLocation.x}, {order.customerLocation.y})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryList;

