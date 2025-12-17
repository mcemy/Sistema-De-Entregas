import { Request, Response } from "express";
import { Drone } from "../models/Drone";
import { Coordinate } from "../types";
import { v4 as uuidv4 } from "uuid";
import { DronesDB } from "../services/DatabaseService";
import { DeliveryController } from "./DeliveryController";

const drones: Map<string, Drone> = new Map();

const loadDronesFromDatabase = () => {
  try {
    const savedDrones = DronesDB.getAll();
    console.log(
      `Attempting to load ${savedDrones.length} drones from database`
    );
    savedDrones.forEach((droneData: any) => {
      try {
        const drone = new Drone(
          droneData.id,
          droneData.name,
          droneData.maxWeight,
          droneData.maxDistance,
          droneData.baseLocation
        );
        if (droneData.batteryLevel !== undefined) {
          drone["drone"].batteryLevel = droneData.batteryLevel;
        }
        if (droneData.currentState) {
          drone.setState(droneData.currentState);
        }
        if (droneData.currentLocation) {
          drone.setLocation(droneData.currentLocation);
        }
        if (droneData.totalDeliveries !== undefined) {
          drone["drone"].totalDeliveries = droneData.totalDeliveries;
        }
        if (droneData.totalDistance !== undefined) {
          drone["drone"].totalDistance = droneData.totalDistance;
        }
        drones.set(drone.getId(), drone);
      } catch (error: any) {
        console.error(`Error loading drone ${droneData.id}:`, error.message);
      }
    });
    console.log(`${savedDrones.length} drones loaded from database`);
    console.log(`Total drones in memory: ${drones.size}`);
  } catch (error: any) {
    console.error(`Error loading drones from database:`, error.message);
  }
};

loadDronesFromDatabase();

export class DroneController {
  static reloadFromDatabase() {
    drones.clear();
    loadDronesFromDatabase();
  }

  static createDrone(req: Request, res: Response): void {
    try {
      const { name, maxWeight, maxDistance, baseLocation } = req.body;
      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Nome do drone é obrigatório" });
        return;
      }

      if (!maxWeight || maxWeight <= 0) {
        res.status(400).json({ error: "Peso máximo deve ser maior que zero" });
        return;
      }

      if (!maxDistance || maxDistance <= 0) {
        res
          .status(400)
          .json({ error: "Distância máxima deve ser maior que zero" });
        return;
      }

      const base = baseLocation || { x: 0, y: 0 };
      if (typeof base.x !== "number" || typeof base.y !== "number") {
        res.status(400).json({ error: "Localização da base inválida" });
        return;
      }

      const drone = new Drone(
        uuidv4(),
        name,
        maxWeight,
        maxDistance,
        base as Coordinate
      );

      drones.set(drone.getId(), drone);
      console.log(
        `Drone created: ${drone.getId()}, Total drones: ${drones.size}`
      );

      DronesDB.create(drone.toJSON());

      // Add to SimulationService if not already there
      const simulationService = DeliveryController.getSimulationService();
      if (!simulationService.getDrone(drone.getId())) {
        simulationService.addDrone(drone);
        console.log(`Drone ${drone.getId()} added to SimulationService`);
      }

      res.status(201).json(drone.toJSON());
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static listDrones(req: Request, res: Response): void {
    try {
      const status = req.query.status as string;

      const simulationService = DeliveryController.getSimulationService();
      const simulationDrones = simulationService.getAllDrones();

      simulationDrones.forEach((simDrone) => {
        const controllerDrone = drones.get(simDrone.getId());
        if (controllerDrone) {
          controllerDrone.setState(simDrone.getState());
          controllerDrone.setLocation(simDrone.getCurrentLocation());
          controllerDrone["drone"].batteryLevel = simDrone.getBatteryLevel();
          controllerDrone["drone"].totalDeliveries =
            simDrone["drone"].totalDeliveries;
          controllerDrone["drone"].totalDistance =
            simDrone["drone"].totalDistance;

          const simDelivery = simDrone.getCurrentDelivery();
          if (simDelivery) {
            controllerDrone.assignDelivery(simDelivery);
          }
        }
      });

      let droneList = Array.from(drones.values()).map((d) => d.toJSON());
      console.log(`Listing drones: ${droneList.length} total`);
      console.log(
        `Drone data:`,
        JSON.stringify(droneList.slice(0, 2), null, 2)
      );

      if (status) {
        droneList = droneList.filter((d) => d.currentState === status);
        console.log(`Drones with status "${status}": ${droneList.length}`);
      }

      res.json(droneList);
    } catch (error: any) {
      console.error(`Error listing drones:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static getDrone(req: Request, res: Response): void {
    const { id } = req.params;
    const drone = drones.get(id);

    if (!drone) {
      res.status(404).json({ error: "Drone não encontrado" });
      return;
    }

    res.json(drone.toJSON());
  }

  static getDroneStatus(req: Request, res: Response): void {
    const { id } = req.params;
    const drone = drones.get(id);

    if (!drone) {
      res.status(404).json({ error: "Drone não encontrado" });
      return;
    }

    const stats = drone.getStats();
    const delivery = drone.getCurrentDelivery();

    res.json({
      ...drone.toJSON(),
      stats,
      currentDelivery: delivery || null,
    });
  }

  static rechargeDrone(req: Request, res: Response): void {
    const { id } = req.params;
    const drone = drones.get(id);

    if (!drone) {
      res.status(404).json({ error: "Drone não encontrado" });
      return;
    }

    if (drone.getState() !== "idle") {
      res.status(400).json({ error: "Drone deve estar idle para recarregar" });
      return;
    }

    const baseLocation = drone.getBaseLocation();
    const currentLocation = drone.getCurrentLocation();

    if (
      currentLocation.x !== baseLocation.x ||
      currentLocation.y !== baseLocation.y
    ) {
      res
        .status(400)
        .json({ error: "Drone deve estar na base para recarregar" });
      return;
    }

    drone.recharge();

    DronesDB.update(drone.getId(), {
      batteryLevel: drone["drone"].batteryLevel,
      currentState: drone.getState(),
      currentLocation: drone.getCurrentLocation(),
    });

    res.json(drone.toJSON());
  }

  static getAllDrones(): Drone[] {
    return Array.from(drones.values());
  }

  static getDroneById(id: string): Drone | undefined {
    return drones.get(id);
  }

  static deleteDrone(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const drone = drones.get(id);

      if (!drone) {
        res.status(404).json({ error: "Drone não encontrado" });
        return;
      }

      // Check if drone is in use (has assigned delivery)
      if (drone.getCurrentDelivery()) {
        res.status(400).json({
          error:
            "Não é possível remover um drone que está em uma entrega. Aguarde a conclusão da entrega.",
        });
        return;
      }

      // Remove from SimulationService
      const simulationService = DeliveryController.getSimulationService();
      simulationService.removeDrone(id);

      // Remove from in-memory map
      drones.delete(id);

      // Remover do banco de dados
      DronesDB.delete(id);

      console.log(`Drone removed: ${id}, Total drones: ${drones.size}`);

      res.json({ message: "Drone removido com sucesso", id });
    } catch (error: any) {
      console.error(`Error removing drone:`, error);
      res.status(500).json({ error: error.message || "Erro ao remover drone" });
    }
  }
}
