import React, { useState } from 'react';
import { Order, DeliveryPriority } from '../types';
import { api } from '../services/api';
import './OrderList.css';

interface OrderListProps {
  orders: Order[];
  compact?: boolean;
  onOrderCreated?: () => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, compact = false, onOrderCreated }) => {
  console.log("📦 OrderList renderizando com", orders.length, "pedidos");
  console.log("📦 Dados dos pedidos:", JSON.stringify(orders.slice(0, 2), null, 2));
  const [newOrder, setNewOrder] = useState({
    customerLocation: { x: 0, y: 0 },
    weight: 1,
    priority: DeliveryPriority.MEDIUM,
  });
  const [showForm, setShowForm] = useState(false);

  const getPriorityColor = (priority: DeliveryPriority) => {
    switch (priority) {
      case DeliveryPriority.HIGH:
        return '#ef4444';
      case DeliveryPriority.MEDIUM:
        return '#f59e0b';
      case DeliveryPriority.LOW:
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: DeliveryPriority) => {
    const labels: Record<DeliveryPriority, string> = {
      [DeliveryPriority.HIGH]: 'Alta',
      [DeliveryPriority.MEDIUM]: 'Média',
      [DeliveryPriority.LOW]: 'Baixa',
    };
    return labels[priority] || priority;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      assigned: 'Atribuído',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Formulário submetido!');
    console.log('📦 Dados do pedido:', JSON.stringify(newOrder, null, 2));
    try {
      console.log('🚀 Iniciando criação do pedido...');
      const result = await api.createOrder(newOrder);
      console.log('✅ Pedido criado com sucesso:', result);
      setNewOrder({
        customerLocation: { x: 0, y: 0 },
        weight: 1,
        priority: DeliveryPriority.MEDIUM,
      });
      setShowForm(false);
      if (onOrderCreated) {
        setTimeout(() => {
          onOrderCreated();
        }, 100);
      }
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      const errorMessage = error.message || 'Erro desconhecido. Verifique se o backend está rodando na porta 3001.';
      alert(`Erro ao criar pedido: ${errorMessage}`);
    }
  };

  const handleCancelOrder = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) {
      return;
    }
    try {
      await api.cancelOrder(id);
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (error: any) {
      alert(`Erro ao cancelar pedido: ${error.message}`);
    }
  };

  if (compact) {
    const pendingOrders = orders.filter(o => o.status === 'pending');
    console.log("📦 OrderList compact - pedidos pendentes:", pendingOrders.length);
    return (
      <div className="order-list compact">
        <h3>📦 Pedidos ({pendingOrders.length} pendentes)</h3>
        {pendingOrders.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Nenhum pedido pendente
          </p>
        ) : (
          <div className="order-grid">
            {pendingOrders.slice(0, 3).map((order) => (
            <div key={order.id} className="order-card compact">
              <div className="order-header">
                <span className="order-id">#{order.id.slice(0, 8)}</span>
                <span
                  className="order-priority"
                  style={{ backgroundColor: getPriorityColor(order.priority) }}
                >
                  {getPriorityLabel(order.priority)}
                </span>
              </div>
              <div className="order-info">
                <div>📍 ({order.customerLocation.x}, {order.customerLocation.y})</div>
                <div>⚖️ {order.weight} kg</div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const otherOrders = orders.filter(o => o.status !== 'pending');

  return (
    <div className="order-list">
      <div className="order-list-header">
        <h2>📦 Pedidos</h2>
        <button className="btn-create" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Pedido'}
        </button>
      </div>

      {showForm && (
        <form className="order-form" onSubmit={handleCreateOrder}>
          <h3>Criar Novo Pedido</h3>
          <div className="form-group">
            <label>Localização X:</label>
            <input
              type="number"
              value={newOrder.customerLocation.x}
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  customerLocation: {
                    ...newOrder.customerLocation,
                    x: parseInt(e.target.value) || 0,
                  },
                })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Localização Y:</label>
            <input
              type="number"
              value={newOrder.customerLocation.y}
              onChange={(e) =>
                setNewOrder({
                  ...newOrder,
                  customerLocation: {
                    ...newOrder.customerLocation,
                    y: parseInt(e.target.value) || 0,
                  },
                })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Peso (kg):</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={newOrder.weight}
              onChange={(e) =>
                setNewOrder({ ...newOrder, weight: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </div>
          <div className="form-group">
            <label>Prioridade:</label>
            <select
              value={newOrder.priority}
              onChange={(e) =>
                setNewOrder({ ...newOrder, priority: e.target.value as DeliveryPriority })
              }
            >
              <option value={DeliveryPriority.LOW}>Baixa</option>
              <option value={DeliveryPriority.MEDIUM}>Média</option>
              <option value={DeliveryPriority.HIGH}>Alta</option>
            </select>
          </div>
          <button type="submit" className="btn-submit">
            Criar Pedido
          </button>
        </form>
      )}

      <div className="order-section">
        <h3>Pendentes ({pendingOrders.length})</h3>
        <div className="order-grid">
          {pendingOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <span className="order-id">#{order.id.slice(0, 8)}</span>
                <span
                  className="order-priority"
                  style={{ backgroundColor: getPriorityColor(order.priority) }}
                >
                  {getPriorityLabel(order.priority)}
                </span>
              </div>
              <div className="order-details">
                <div className="detail-item">
                  <span className="detail-label">Localização:</span>
                  <span className="detail-value">
                    ({order.customerLocation.x}, {order.customerLocation.y})
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Peso:</span>
                  <span className="detail-value">{order.weight} kg</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{getStatusLabel(order.status)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Criado em:</span>
                  <span className="detail-value">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              {order.status === 'pending' && (
                <button
                  className="btn-cancel"
                  onClick={() => handleCancelOrder(order.id)}
                >
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {otherOrders.length > 0 && (
        <div className="order-section">
          <h3>Outros ({otherOrders.length})</h3>
          <div className="order-grid">
            {otherOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <span className="order-id">#{order.id.slice(0, 8)}</span>
                  <span
                    className="order-priority"
                    style={{ backgroundColor: getPriorityColor(order.priority) }}
                  >
                    {getPriorityLabel(order.priority)}
                  </span>
                </div>
                <div className="order-details">
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{getStatusLabel(order.status)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;

