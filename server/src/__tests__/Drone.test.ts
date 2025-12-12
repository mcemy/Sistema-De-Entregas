import { Drone } from "../models/Drone";
import { DroneState } from "../types";

describe("Drone", () => {
  const baseLocation = { x: 0, y: 0 };

  it("deve criar um drone válido", () => {
    const drone = new Drone("1", "Drone Alpha", 10, 50, baseLocation);

    expect(drone.getId()).toBe("1");
    expect(drone.getName()).toBe("Drone Alpha");
    expect(drone.getState()).toBe(DroneState.IDLE);
    expect(drone.getBatteryLevel()).toBe(100);
  });

  it("deve verificar capacidade de carga", () => {
    const drone = new Drone("1", "Drone Alpha", 10, 50, baseLocation);

    expect(drone.canCarry(5)).toBe(true);
    expect(drone.canCarry(10)).toBe(true);
    expect(drone.canCarry(11)).toBe(false);
  });

  it("deve verificar alcance", () => {
    const drone = new Drone("1", "Drone Alpha", 10, 50, baseLocation);

    expect(drone.canReach(50)).toBe(true);
    expect(drone.canReach(51)).toBe(false);
  });

  it("deve consumir bateria ao voar", () => {
    const drone = new Drone("1", "Drone Alpha", 10, 50, baseLocation);
    const initialBattery = drone.getBatteryLevel();

    drone.consumeBattery(10); // 10 km

    expect(drone.getBatteryLevel()).toBe(initialBattery - 10);
  });

  it("deve recarregar bateria", () => {
    const drone = new Drone("1", "Drone Alpha", 10, 50, baseLocation);
    drone.consumeBattery(50);
    drone.recharge();

    expect(drone.getBatteryLevel()).toBe(100);
  });

  it("deve verificar disponibilidade", () => {
    const drone = new Drone("1", "Drone Alpha", 10, 50, baseLocation);

    expect(drone.isAvailable()).toBe(true);

    drone.setState(DroneState.FLYING);
    expect(drone.isAvailable()).toBe(false);

    drone.setState(DroneState.IDLE);
    drone.consumeBattery(85); // Bateria abaixo de 20%
    expect(drone.isAvailable()).toBe(false);
  });

  it("deve completar uma entrega e atualizar estatísticas", () => {
    const drone = new Drone("1", "Drone Alpha", 10, 50, baseLocation);
    const initialDeliveries = drone.getStats().totalDeliveries;

    drone.completeDelivery(20);

    const stats = drone.getStats();
    expect(stats.totalDeliveries).toBe(initialDeliveries + 1);
    expect(stats.totalDistance).toBe(20);
  });
});
