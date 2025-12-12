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
  maxWeight: number; // kg
  maxDistance: number; // km
  batteryLevel: number; // 0-100
  currentState: DroneState;
  currentLocation: Coordinate;
  baseLocation: Coordinate;
  currentDelivery?: Delivery;
  totalDeliveries: number;
  totalDistance: number;
  createdAt: Date;
}

export interface Order {
  id: string;
  customerLocation: Coordinate;
  deliveryLocation?: Coordinate;
  weight: number; // kg
  priority: DeliveryPriority;
  createdAt: Date;
  status: "pending" | "assigned" | "delivered" | "cancelled";
}

export interface Delivery {
  id: string;
  droneId: string;
  orders: Order[];
  route: Coordinate[];
  totalDistance: number;
  totalWeight: number;
  estimatedTime: number; // minutes
  startedAt?: Date;
  completedAt?: Date;
  status: "scheduled" | "in-progress" | "completed" | "failed";
}

export interface Obstacle {
  id: string;
  location: Coordinate;
  radius: number; // km
  type: "no-fly-zone" | "restricted";
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
