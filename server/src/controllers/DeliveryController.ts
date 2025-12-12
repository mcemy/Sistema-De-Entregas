import { Request, Response } from "express";
import { DeliveryModel } from "../models/Delivery";
import { Order } from "../models/Order";
import { Coordinate } from "../types";
import { v4 as uuidv4 } from "uuid";
import { OptimizationService } from "../services/OptimizationService";
import { SimulationService } from "../services/SimulationService";
import { DeliveriesDB, DronesDB, OrdersDB } from "../services/DatabaseService";
import db from "../services/DatabaseService";
import { OrderController } from "./OrderController";
import { DroneController } from "./DroneController";

const simulationService = new SimulationService();

export class DeliveryController {
  static optimizeDeliveries(req: Request, res: Response): void {
    try {
      const obstacles = req.body.obstacles || [];
      const baseLocation = req.body.baseLocation || { x: 0, y: 0 };

      const pendingOrders = OrderController.getPendingOrders();
      const drones = DroneController.getAllDrones();

      console.log(
        `Assigning deliveries: ${pendingOrders.length} pending orders, ${drones.length} drones`
      );

      if (drones.length === 0) {
        res.status(400).json({ error: "No drones available" });
        return;
      }

      if (pendingOrders.length === 0) {
        res.status(400).json({ error: "No pending orders to assign" });
        return;
      }

      drones.forEach((drone) => {
        if (!simulationService.getDrone(drone.getId())) {
          simulationService.addDrone(drone);
        } else {
          const simDrone = simulationService.getDrone(drone.getId());
          if (simDrone) {
            simDrone.setState(drone.getState());
            simDrone.setLocation(drone.getCurrentLocation());
            simDrone["drone"].batteryLevel = drone.getBatteryLevel();
          }
        }
      });

      simulationService.clearScheduledDeliveries();

      console.log(`Checking availability of ${drones.length} drones:`);
      drones.forEach((d) => {
        const hasDelivery = !!d.getCurrentDelivery();
        const isIdle = d.getState() === "idle";
        const hasBattery = d.getBatteryLevel() > 20;
        const isAvail = d.isAvailable();
        console.log(
          `  - ${d.getName()}: state=${d.getState()}, battery=${d.getBatteryLevel()}%, hasDelivery=${hasDelivery}, available=${isAvail} (idle=${isIdle}, battery=${hasBattery})`
        );
      });

      const optimizations = OptimizationService.optimizeAllocation(
        pendingOrders,
        drones,
        baseLocation as Coordinate,
        obstacles
      );

      console.log(`Optimizations found: ${optimizations.length}`);

      if (optimizations.length === 0) {
        const availableCount = drones.filter((d) => d.isAvailable()).length;
        const errorMsg = `Unable to assign orders. Available drones: ${availableCount}, Orders: ${pendingOrders.length}`;
        console.error(`${errorMsg}`);
        res.status(400).json({ error: errorMsg });
        return;
      }

      const deliveries: DeliveryModel[] = [];

      for (const opt of optimizations) {
        const delivery = new DeliveryModel(
          uuidv4(),
          opt.drone.getId(),
          opt.orders,
          opt.route
        );

        opt.orders.forEach((order) => {
          order.assign();
          OrdersDB.update(order.getId(), "assigned");
        });

        const controllerDrone = DroneController.getDroneById(opt.drone.getId());
        if (controllerDrone) {
          controllerDrone.assignDelivery(delivery.toJSON());
          DronesDB.update(controllerDrone.getId(), {
            currentState: controllerDrone.getState(),
            currentLocation: controllerDrone.getCurrentLocation(),
          });
        }

        simulationService.addDelivery(delivery);

        deliveries.push(delivery);
      }

      const deliveriesList = simulationService
        .getAllDeliveries()
        .map((d) => d.toJSON());

      deliveriesList.forEach((delivery) => {
        DeliveriesDB.create(delivery);
      });

      console.log(
        `${deliveries.length} delivery(ies) created and assigned to drones`
      );

      res.json({
        message: `${deliveries.length} entrega(s) atribuída(s) aos drones`,
        deliveries: deliveries.map((d) => d.toJSON()),
      });
    } catch (error: any) {
      console.error("Error assigning deliveries:", error);
      res.status(400).json({ error: error.message });
    }
  }

  static listDeliveries(req: Request, res: Response): void {
    try {
      const status = req.query.status as string;

      const simulationDeliveries = simulationService
        .getAllDeliveries()
        .map((d) => d.toJSON());

      const dbDeliveries = DeliveriesDB.getAll();
      const completedDbDeliveries = dbDeliveries.filter(
        (d) => d.status === "completed"
      );

      const deliveriesMap = new Map<string, any>();

      completedDbDeliveries.forEach((dbDelivery: any) => {
        if (!simulationDeliveries.find((d) => d.id === dbDelivery.id)) {
          const allOrders = OrderController.getAllOrders();
          const deliveredOrders = allOrders
            .filter((o) => o.getStatus() === "delivered")
            .map((o) => o.toJSON());

          deliveriesMap.set(dbDelivery.id, {
            id: dbDelivery.id,
            droneId: dbDelivery.droneId,
            status: dbDelivery.status,
            totalDistance: dbDelivery.totalDistance || 0,
            totalWeight: dbDelivery.totalWeight || 0,
            estimatedTime: dbDelivery.estimatedTime || 0,
            startedAt: dbDelivery.startedAt
              ? dbDelivery.startedAt instanceof Date
                ? dbDelivery.startedAt.toISOString()
                : new Date(dbDelivery.startedAt).toISOString()
              : undefined,
            completedAt: dbDelivery.completedAt
              ? dbDelivery.completedAt instanceof Date
                ? dbDelivery.completedAt.toISOString()
                : new Date(dbDelivery.completedAt).toISOString()
              : undefined,
            orders: deliveredOrders.length > 0 ? deliveredOrders : [],
            route: [],
          });
        }
      });

      simulationDeliveries.forEach((simDelivery) => {
        deliveriesMap.set(simDelivery.id, simDelivery);
      });

      let deliveries = Array.from(deliveriesMap.values());
      console.log(
        `Listing deliveries: ${deliveries.length} total (${simulationDeliveries.length} in memory, ${completedDbDeliveries.length} completed in database)`
      );

      if (status) {
        deliveries = deliveries.filter((d) => d.status === status);
        console.log(`Deliveries with status "${status}": ${deliveries.length}`);
      }

      res.json(deliveries);
    } catch (error: any) {
      console.error(`Error listing deliveries:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static getDelivery(req: Request, res: Response): void {
    const { id } = req.params;
    const delivery = simulationService.getDelivery(id);

    if (!delivery) {
      res.status(404).json({ error: "Delivery not found" });
      return;
    }

    res.json(delivery.toJSON());
  }

  static getDeliveryRoute(req: Request, res: Response): void {
    const { id } = req.params;
    const delivery = simulationService.getDelivery(id);

    if (!delivery) {
      res.status(404).json({ error: "Delivery not found" });
      return;
    }

    res.json({
      id: delivery.getId(),
      droneId: delivery.getDroneId(),
      status: delivery.getStatus(),
      route: delivery.getRoute(),
      totalDistance: delivery.getTotalDistance(),
      totalWeight: delivery.getTotalWeight(),
      estimatedTime: delivery.getEstimatedTime(),
    });
  }

  static startSimulation(req: Request, res: Response): void {
    const intervalMs = req.body.intervalMs || 1000;
    console.log(`Starting simulation with interval of ${intervalMs}ms`);
    const dronesCount = simulationService.getAllDrones().length;
    const deliveriesCount = simulationService.getAllDeliveries().length;
    console.log(`Drones: ${dronesCount}, Deliveries: ${deliveriesCount}`);
    simulationService.startSimulation(intervalMs);
    res.json({ message: "Simulation started", intervalMs });
  }

  static stopSimulation(req: Request, res: Response): void {
    simulationService.stopSimulation();
    res.json({ message: "Simulation stopped" });
  }

  static stepSimulation(req: Request, res: Response): void {
    console.log("Advancing simulation one step...");
    const dronesBefore = simulationService.getAllDrones().length;
    simulationService.stepSimulation();
    const dronesAfter = simulationService.getAllDrones().length;
    console.log(
      `Simulation advanced. Drones processed: ${dronesBefore} -> ${dronesAfter}`
    );
    res.json({ message: "Simulation advanced one step" });
  }

  static getStats(req: Request, res: Response): void {
    try {
      const simulationDeliveries = simulationService.getAllDeliveries();
      const dbDeliveries = DeliveriesDB.getAll();

      const allDeliveriesSet = new Set<string>();
      const completedDeliveriesData: any[] = [];

      simulationDeliveries.forEach((delivery) => {
        allDeliveriesSet.add(delivery.getId());
        if (delivery.getStatus() === "completed") {
          completedDeliveriesData.push({
            totalDistance: delivery.getTotalDistance(),
            deliveryTime: delivery.getDeliveryTime(),
          });
        }
      });

      dbDeliveries.forEach((dbDelivery: any) => {
        allDeliveriesSet.add(dbDelivery.id);
        if (
          dbDelivery.status === "completed" &&
          !simulationDeliveries.find((d) => d.getId() === dbDelivery.id)
        ) {
          let deliveryTime = null;
          if (dbDelivery.startedAt && dbDelivery.completedAt) {
            const started =
              dbDelivery.startedAt instanceof Date
                ? dbDelivery.startedAt
                : new Date(dbDelivery.startedAt);
            const completed =
              dbDelivery.completedAt instanceof Date
                ? dbDelivery.completedAt
                : new Date(dbDelivery.completedAt);
            deliveryTime =
              (completed.getTime() - started.getTime()) / 1000 / 60;
          }
          completedDeliveriesData.push({
            totalDistance: dbDelivery.totalDistance || 0,
            deliveryTime: deliveryTime,
          });
        }
      });

      const totalDeliveries = allDeliveriesSet.size;
      const completedDeliveries = completedDeliveriesData.length;

      const deliveryTimes = completedDeliveriesData
        .map((d) => d.deliveryTime)
        .filter((t): t is number => t !== null && t > 0);

      const averageDeliveryTime =
        deliveryTimes.length > 0
          ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
          : 0;

      const totalDistance = completedDeliveriesData.reduce(
        (sum, d) => sum + (d.totalDistance || 0) * 2,
        0
      );

      const drones = DroneController.getAllDrones();
      const droneStats = drones
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

      const stats = {
        totalDeliveries,
        completedDeliveries,
        averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
        totalDistance: Math.round(totalDistance * 100) / 100,
        mostEfficientDrone: droneStats.length > 0 ? droneStats[0] : undefined,
      };

      console.log("Stats calculated:", JSON.stringify(stats, null, 2));
      res.json(stats);
    } catch (error: any) {
      console.error("Error calculating stats:", error);
      res.status(500).json({
        error: error.message,
        totalDeliveries: 0,
        completedDeliveries: 0,
        averageDeliveryTime: 0,
        totalDistance: 0,
      });
    }
  }

  static getSimulationService(): SimulationService {
    return simulationService;
  }

  static resetAll(req: Request, res: Response): void {
    try {
      console.log("Resetting entire system...");

      // Stop simulation
      simulationService.stopSimulation();

      // Clear database first
      db.exec("DELETE FROM deliveries");
      db.exec("DELETE FROM orders");
      db.exec("DELETE FROM drones");

      // Clear simulation
      const allDrones = simulationService.getAllDrones();
      allDrones.forEach((drone) => {
        simulationService.removeDrone(drone.getId());
      });

      // Clear controllers (in-memory maps will be cleared on reload)
      // Reload controllers (will clear the maps)
      DroneController.reloadFromDatabase();
      OrderController.reloadFromDatabase();

      console.log("System reset successfully");
      res.json({ message: "System reset successfully" });
    } catch (error: any) {
      console.error("Error resetting system:", error);
      res
        .status(500)
        .json({ error: error.message || "Error resetting system" });
    }
  }
}
