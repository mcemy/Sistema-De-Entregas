import { Delivery as DeliveryType, Order as OrderType, Coordinate } from '../types';
import { Order } from './Order';
import { calculateDistance } from '../utils/distance';

export class DeliveryModel {
  private delivery: DeliveryType;

  constructor(
    id: string,
    droneId: string,
    orders: Order[],
    route: Coordinate[]
  ) {
    const totalWeight = orders.reduce((sum, order) => sum + order.getWeight(), 0);
    const totalDistance = this.calculateRouteDistance(route);
    const estimatedTime = this.calculateEstimatedTime(totalDistance);

    this.delivery = {
      id,
      droneId,
      orders: orders.map(o => o.toJSON()),
      route: [...route],
      totalDistance,
      totalWeight,
      estimatedTime,
      status: 'scheduled'
    };
  }

  private calculateRouteDistance(route: Coordinate[]): number {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      distance += calculateDistance(route[i], route[i + 1]);
    }
    return distance;
  }

  private calculateEstimatedTime(distance: number): number {
    const speedKmPerMin = 30 / 60;
    return Math.ceil(distance / speedKmPerMin);
  }

  getId(): string {
    return this.delivery.id;
  }

  getDroneId(): string {
    return this.delivery.droneId;
  }

  getOrders(): OrderType[] {
    return this.delivery.orders;
  }

  getRoute(): Coordinate[] {
    return [...this.delivery.route];
  }

  getTotalDistance(): number {
    return this.delivery.totalDistance;
  }

  getTotalWeight(): number {
    return this.delivery.totalWeight;
  }

  getEstimatedTime(): number {
    return this.delivery.estimatedTime;
  }

  getStatus(): string {
    return this.delivery.status;
  }

  start(): void {
    this.delivery.status = 'in-progress';
    this.delivery.startedAt = new Date();
  }

  complete(): void {
    this.delivery.status = 'completed';
    this.delivery.completedAt = new Date();
    this.delivery.orders.forEach(order => {
      order.status = 'delivered';
    });
  }

  fail(): void {
    this.delivery.status = 'failed';
  }

  getDeliveryTime(): number | null {
    if (this.delivery.startedAt && this.delivery.completedAt) {
      return (this.delivery.completedAt.getTime() - this.delivery.startedAt.getTime()) / 1000 / 60;
    }
    return null;
  }

  toJSON(): any {
    return { 
      ...this.delivery,
      startedAt: this.delivery.startedAt instanceof Date 
        ? this.delivery.startedAt.toISOString() 
        : this.delivery.startedAt,
      completedAt: this.delivery.completedAt instanceof Date 
        ? this.delivery.completedAt.toISOString() 
        : this.delivery.completedAt
    };
  }
}

