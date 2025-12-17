import { Drone } from "../models/Drone";
import { DeliveryModel } from "../models/Delivery";
import { DroneState } from "../types";
import { DronesDB, OrdersDB, DeliveriesDB } from "./DatabaseService";

export class SimulationService {
  private drones: Map<string, Drone> = new Map();
  private deliveries: Map<string, DeliveryModel> = new Map();
  private simulationInterval?: NodeJS.Timeout;
  private deliverySteps: Map<string, number> = new Map();

  addDrone(drone: Drone): void {
    this.drones.set(drone.getId(), drone);
  }

  getDrone(droneId: string): Drone | undefined {
    return this.drones.get(droneId);
  }

  getAllDrones(): Drone[] {
    return Array.from(this.drones.values());
  }

  addDelivery(delivery: DeliveryModel): void {
    this.deliveries.set(delivery.getId(), delivery);
    const drone = this.drones.get(delivery.getDroneId());
    if (drone) {
      drone.assignDelivery(delivery.toJSON());
    }
  }

  getDelivery(deliveryId: string): DeliveryModel | undefined {
    return this.deliveries.get(deliveryId);
  }

  getAllDeliveries(): DeliveryModel[] {
    return Array.from(this.deliveries.values());
  }

  removeDrone(droneId: string): void {
    const drone = this.drones.get(droneId);
    if (drone) {
      // Remove deliveries associated with the drone
      const droneDeliveries = Array.from(this.deliveries.values()).filter(
        (d) => d.getDroneId() === droneId
      );
      droneDeliveries.forEach((delivery) => {
        this.deliveries.delete(delivery.getId());
      });
      // Remove the drone
      this.drones.delete(droneId);
      console.log(`Drone ${droneId} removed from SimulationService`);
    }
  }

  clearScheduledDeliveries(): void {
    const scheduledDeliveries = Array.from(this.deliveries.values()).filter(
      (d) => d.getStatus() === "scheduled"
    );

    scheduledDeliveries.forEach((delivery) => {
      const drone = this.drones.get(delivery.getDroneId());
      if (drone && drone.getState() === "idle") {
        drone.assignDelivery(undefined);
      }
      this.deliveries.delete(delivery.getId());
    });

    if (scheduledDeliveries.length > 0) {
      console.log(
        `${scheduledDeliveries.length} scheduled deliveries removed to allow new assignment`
      );
    }
  }

  processDroneState(drone: Drone): void {
    const delivery = drone.getCurrentDelivery();

    if (!delivery) {
      if (drone.getState() !== DroneState.IDLE) {
        drone.setState(DroneState.IDLE);
        this.saveDroneState(drone);
      }

      if (
        drone.needsRecharge() &&
        drone.getCurrentLocation().x === drone.getBaseLocation().x &&
        drone.getCurrentLocation().y === drone.getBaseLocation().y
      ) {
        drone.recharge();
        this.saveDroneState(drone);
      }
      return;
    }

    const deliveryModel = this.deliveries.get(delivery.id);
    if (!deliveryModel) {
      console.warn(`Delivery ${delivery.id} not found in SimulationService`);
      return;
    }

    console.log(
      `Processing drone ${drone.getId()} - State: ${drone.getState()}, Delivery: ${
        delivery.id
      }`
    );

    switch (drone.getState()) {
      case DroneState.IDLE:
        console.log(`Drone ${drone.getId()} starting loading`);
        drone.setState(DroneState.LOADING);
        this.saveDroneState(drone);
        break;

      case DroneState.LOADING:
        console.log(`Drone ${drone.getId()} starting flight`);
        drone.setState(DroneState.FLYING);
        deliveryModel.start();
        DeliveriesDB.updateStartedAt(deliveryModel.getId(), new Date());
        this.saveDroneState(drone);
        break;

      case DroneState.FLYING:
        this.simulateFlight(drone, deliveryModel);
        this.saveDroneState(drone);
        break;

      case DroneState.DELIVERING:
        // Fica no estado DELIVERING por 2 ciclos antes de retornar
        const currentSteps = this.deliverySteps.get(drone.getId()) || 0;
        if (currentSteps >= 2) {
          console.log(`Drone ${drone.getId()} delivered, returning`);
          drone.setState(DroneState.RETURNING);
          this.deliverySteps.delete(drone.getId());
          this.saveDroneState(drone);
        } else {
          this.deliverySteps.set(drone.getId(), currentSteps + 1);
          console.log(
            `Drone ${drone.getId()} delivering... (${currentSteps + 1}/2)`
          );
        }
        break;

      case DroneState.RETURNING:
        this.simulateReturn(drone, deliveryModel);
        this.saveDroneState(drone);
        break;
    }
  }

  private saveDroneState(drone: Drone): void {
    try {
      DronesDB.update(drone.getId(), {
        batteryLevel: drone.getBatteryLevel(),
        currentState: drone.getState(),
        currentLocation: drone.getCurrentLocation(),
        totalDeliveries: drone["drone"].totalDeliveries,
        totalDistance: drone["drone"].totalDistance,
      });
    } catch (error: any) {
      console.error(
        `Error saving drone state ${drone.getId()}:`,
        error.message
      );
    }
  }

  private simulateFlight(drone: Drone, delivery: DeliveryModel): void {
    const route = delivery.getRoute();
    if (route.length === 0) {
      console.warn(`Empty route for delivery ${delivery.getId()}`);
      return;
    }

    const currentLocation = drone.getCurrentLocation();

    let currentIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < route.length; i++) {
      const distance = Math.sqrt(
        Math.pow(route[i].x - currentLocation.x, 2) +
          Math.pow(route[i].y - currentLocation.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        currentIndex = i;
      }
    }

    if (currentIndex === 0 && minDistance > 1) {
      const firstPoint = route[0];
      const distanceToFirst = Math.sqrt(
        Math.pow(firstPoint.x - currentLocation.x, 2) +
          Math.pow(firstPoint.y - currentLocation.y, 2)
      );
      if (distanceToFirst > 1) {
        const dx = firstPoint.x - currentLocation.x;
        const dy = firstPoint.y - currentLocation.y;
        const stepSize = Math.min(20, distanceToFirst);
        const ratio = stepSize / distanceToFirst;
        const newLocation = {
          x: currentLocation.x + dx * ratio,
          y: currentLocation.y + dy * ratio,
        };
        drone.setLocation(newLocation);
        return;
      }
    }

    if (currentIndex < route.length - 1) {
      const nextPoint = route[currentIndex + 1];
      const distanceToNext = Math.sqrt(
        Math.pow(nextPoint.x - currentLocation.x, 2) +
          Math.pow(nextPoint.y - currentLocation.y, 2)
      );

      if (distanceToNext <= 1) {
        // Chegou a um ponto da rota
        drone.setLocation(route[currentIndex + 1]);

        const deliveryDestinationIndex = route.length - 2;
        if (currentIndex + 1 === deliveryDestinationIndex) {
          console.log(
            `Drone ${drone.getId()} reached delivery destination (point ${
              currentIndex + 1
            }/${route.length - 1})`
          );
          drone.setState(DroneState.DELIVERING);

          // Marcar as ordens como delivered quando chegar ao destino
          delivery.getOrders().forEach((order) => {
            order.status = "delivered";
            OrdersDB.update(order.id, "delivered");
            console.log(`Order ${order.id} marked as delivered`);
          });
        } else if (currentIndex + 1 < route.length - 1) {
        } else {
          drone.setState(DroneState.RETURNING);
        }
      } else {
        const dx = nextPoint.x - currentLocation.x;
        const dy = nextPoint.y - currentLocation.y;
        const stepSize = Math.min(20, distanceToNext);
        const ratio = stepSize / distanceToNext;
        const newLocation = {
          x: currentLocation.x + dx * ratio,
          y: currentLocation.y + dy * ratio,
        };
        drone.setLocation(newLocation);
      }
    } else {
      drone.setState(DroneState.RETURNING);
    }
  }

  private simulateReturn(drone: Drone, delivery: DeliveryModel): void {
    const baseLocation = drone.getBaseLocation();
    const currentLocation = drone.getCurrentLocation();

    if (
      currentLocation.x === baseLocation.x &&
      currentLocation.y === baseLocation.y
    ) {
      drone.completeDelivery(delivery.getTotalDistance() * 2);
      delivery.complete();

      delivery.getOrders().forEach((order) => {
        order.status = "delivered";
        OrdersDB.update(order.id, "delivered");
      });

      drone.setState(DroneState.IDLE);
      drone.assignDelivery(undefined);

      this.saveDroneState(drone);

      DeliveriesDB.update(delivery.getId(), "completed", new Date());

      console.log(
        `Delivery ${delivery.getId()} completed by drone ${drone.getId()}`
      );
    } else {
      const dx = baseLocation.x - currentLocation.x;
      const dy = baseLocation.y - currentLocation.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 1) {
        const stepSize = Math.min(20, distance);
        const ratio = stepSize / distance;
        const newLocation = {
          x: currentLocation.x + dx * ratio,
          y: currentLocation.y + dy * ratio,
        };
        drone.setLocation(newLocation);
      } else {
        drone.setLocation(baseLocation);
      }
    }
  }

  startSimulation(intervalMs: number = 5000): void {
    if (this.simulationInterval) {
      this.stopSimulation();
    }

    this.simulationInterval = setInterval(() => {
      this.drones.forEach((drone) => {
        this.processDroneState(drone);
      });
    }, intervalMs);
  }

  stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = undefined;
    }
  }

  stepSimulation(): void {
    this.drones.forEach((drone) => {
      this.processDroneState(drone);
    });
  }

  getStats() {
    const allDeliveries = this.getAllDeliveries();
    const completedDeliveries = allDeliveries.filter(
      (d) => d.getStatus() === "completed"
    );

    const deliveryTimes = completedDeliveries
      .map((d) => d.getDeliveryTime())
      .filter((t): t is number => t !== null);

    const averageDeliveryTime =
      deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
        : 0;

    const totalDistance = completedDeliveries.reduce(
      (sum, d) => sum + d.getTotalDistance() * 2,
      0
    );

    const droneStats = Array.from(this.drones.values())
      .map((drone) => ({
        droneId: drone.getId(),
        deliveries: drone.getStats().totalDeliveries,
        efficiency: drone.getStats().efficiency,
      }))
      .filter((s) => s.deliveries > 0)
      .sort((a, b) => {
        if (a.efficiency !== b.efficiency) {
          return a.efficiency - b.efficiency;
        }
        return b.deliveries - a.deliveries;
      });

    return {
      totalDeliveries: allDeliveries.length,
      completedDeliveries: completedDeliveries.length,
      averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      mostEfficientDrone: droneStats.length > 0 ? droneStats[0] : undefined,
    };
  }
}
