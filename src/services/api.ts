import { Drone, Order, Delivery, DeliveryStats } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 Requisição: ${options?.method || 'GET'} ${url}`);
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      console.log(`📥 Resposta: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('❌ Erro na resposta:', error);
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Dados recebidos:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ Erro na requisição para ${url}:`, error);
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3001.');
      }
      throw error;
    }
  }

  // Orders
  async createOrder(order: {
    customerLocation: { x: number; y: number };
    weight: number;
    priority: string;
  }): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getOrders(status?: string): Promise<Order[]> {
    const url = status ? `/orders?status=${status}` : '/orders';
    return this.request<Order[]>(url);
  }

  async cancelOrder(id: string) {
    return this.request(`/orders/${id}`, { method: 'DELETE' });
  }

  // Drones
  async createDrone(drone: {
    name: string;
    maxWeight: number;
    maxDistance: number;
    baseLocation?: { x: number; y: number };
  }): Promise<Drone> {
    return this.request<Drone>('/drones', {
      method: 'POST',
      body: JSON.stringify(drone),
    });
  }

  async getDrones(status?: string): Promise<Drone[]> {
    const url = status ? `/drones?status=${status}` : '/drones';
    return this.request<Drone[]>(url);
  }

  async getDroneStatus(id: string) {
    return this.request(`/drones/${id}/status`);
  }

  async rechargeDrone(id: string) {
    return this.request(`/drones/${id}/recharge`, { method: 'POST' });
  }

  async deleteDrone(id: string) {
    return this.request(`/drones/${id}`, { method: 'DELETE' });
  }

  // Deliveries
  async optimizeDeliveries(obstacles: any[] = [], baseLocation?: { x: number; y: number }) {
    return this.request('/deliveries/optimize', {
      method: 'POST',
      body: JSON.stringify({ obstacles, baseLocation }),
    });
  }

  async getDeliveries(status?: string): Promise<Delivery[]> {
    const url = status ? `/deliveries?status=${status}` : '/deliveries';
    return this.request<Delivery[]>(url);
  }

  async getDeliveryRoute(id: string) {
    return this.request(`/deliveries/${id}/route`);
  }

  async getStats(): Promise<DeliveryStats> {
    return this.request<DeliveryStats>('/deliveries/stats');
  }

  // Simulation
  async startSimulation(intervalMs: number = 5000) {
    return this.request('/deliveries/simulate/start', {
      method: 'POST',
      body: JSON.stringify({ intervalMs }),
    });
  }

  async stopSimulation() {
    return this.request('/deliveries/simulate/stop', { method: 'POST' });
  }

  async stepSimulation() {
    return this.request('/deliveries/simulate/step', { method: 'POST' });
  }

  async resetAll() {
    return this.request('/deliveries/reset', { method: 'POST' });
  }
}

export const api = new ApiService();

