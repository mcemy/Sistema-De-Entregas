import { Drone as DroneType, DroneState, Coordinate } from '../types';

export class Drone {
  private drone: DroneType;

  constructor(
    id: string,
    name: string,
    maxWeight: number,
    maxDistance: number,
    baseLocation: Coordinate
  ) {
    this.drone = {
      id,
      name,
      maxWeight,
      maxDistance,
      batteryLevel: 100,
      currentState: DroneState.IDLE,
      currentLocation: { ...baseLocation },
      baseLocation: { ...baseLocation },
      totalDeliveries: 0,
      totalDistance: 0,
      createdAt: new Date()
    };
  }

  getId(): string {
    return this.drone.id;
  }

  getName(): string {
    return this.drone.name;
  }

  getState(): DroneState {
    return this.drone.currentState;
  }

  setState(state: DroneState): void {
    this.drone.currentState = state;
  }

  getBatteryLevel(): number {
    return this.drone.batteryLevel;
  }

  consumeBattery(distance: number): void {
    const batteryConsumption = distance * 1;
    this.drone.batteryLevel = Math.max(0, this.drone.batteryLevel - batteryConsumption);
  }

  recharge(): void {
    this.drone.batteryLevel = 100;
  }

  getCurrentLocation(): Coordinate {
    return { ...this.drone.currentLocation };
  }

  setLocation(location: Coordinate): void {
    this.drone.currentLocation = { ...location };
  }

  getBaseLocation(): Coordinate {
    return { ...this.drone.baseLocation };
  }

  canCarry(weight: number): boolean {
    return weight <= this.drone.maxWeight;
  }

  canReach(distance: number): boolean {
    return distance <= this.drone.maxDistance;
  }

  isAvailable(): boolean {
    const hasNoDelivery = !this.drone.currentDelivery;
    const isIdle = this.drone.currentState === DroneState.IDLE;
    const hasBattery = this.drone.batteryLevel > 20;
    return hasNoDelivery && isIdle && hasBattery;
  }

  needsRecharge(): boolean {
    return this.drone.batteryLevel < 20;
  }

  assignDelivery(delivery: any): void {
    this.drone.currentDelivery = delivery;
  }

  getCurrentDelivery() {
    return this.drone.currentDelivery;
  }

  completeDelivery(distance: number): void {
    this.drone.totalDeliveries++;
    this.drone.totalDistance += distance;
    this.consumeBattery(distance);
    this.drone.currentDelivery = undefined;
  }

  getStats() {
    return {
      totalDeliveries: this.drone.totalDeliveries,
      totalDistance: this.drone.totalDistance,
      efficiency: this.drone.totalDeliveries > 0 
        ? this.drone.totalDistance / this.drone.totalDeliveries 
        : 0
    };
  }

  toJSON(): any {
    return { 
      ...this.drone,
      createdAt: this.drone.createdAt instanceof Date 
        ? this.drone.createdAt.toISOString() 
        : this.drone.createdAt
    };
  }
}

