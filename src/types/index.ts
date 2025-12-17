export enum DroneState {
  IDLE = "idle",
  LOADING = "loading",
  FLYING = "flying",
  DELIVERING = "delivering",
  RETURNING = "returning",
}

export enum DeliveryPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface Drone {
  id: string;
  name: string;
  maxWeight: number;
  maxDistance: number;
  batteryLevel: number;
  currentState: DroneState;
  currentLocation: Coordinate;
  baseLocation: Coordinate;
  currentDelivery?: Delivery;
  totalDeliveries: number;
  totalDistance: number;
  createdAt: string;
}

export interface Order {
  id: string;
  customerLocation: Coordinate;
  deliveryLocation?: Coordinate;
  weight: number;
  priority: DeliveryPriority;
  createdAt: string;
  status: "pending" | "assigned" | "delivered" | "cancelled";
}

export interface Delivery {
  id: string;
  droneId: string;
  orders: Order[];
  route: Coordinate[];
  totalDistance: number;
  totalWeight: number;
  estimatedTime: number;
  startedAt?: string;
  completedAt?: string;
  status: "scheduled" | "in-progress" | "completed" | "failed";
}

export interface DeliveryStats {
  totalDeliveries: number;
  completedDeliveries: number;
  averageDeliveryTime: number;
  totalDistance: number;
  mostEfficientDrone?: {
    droneId: string;
    deliveries: number;
    efficiency: number;
  };
}
