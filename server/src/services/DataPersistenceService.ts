import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const DRONES_FILE = path.join(DATA_DIR, "drones.json");
const DELIVERIES_FILE = path.join(DATA_DIR, "deliveries.json");

console.log(`Data directory will be: ${DATA_DIR}`);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Data directory created: ${DATA_DIR}`);
} else {
  console.log(`Data directory found: ${DATA_DIR}`);
}

export class DataPersistenceService {
  static saveOrders(orders: any[]) {
    try {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
      console.log(`Orders saved to ${ORDERS_FILE}: ${orders.length} records`);
    } catch (error: any) {
      console.error(`Error saving orders to ${ORDERS_FILE}:`, error.message);
    }
  }

  static loadOrders(): any[] {
    try {
      if (fs.existsSync(ORDERS_FILE)) {
        const data = fs.readFileSync(ORDERS_FILE, "utf-8");
        const orders = JSON.parse(data);
        console.log(
          `Orders loaded from ${ORDERS_FILE}: ${orders.length} records`
        );
        return orders;
      } else {
        console.log(`Orders file not found at ${ORDERS_FILE}`);
      }
    } catch (error: any) {
      console.error(`Error loading orders:`, error.message);
    }
    return [];
  }

  static saveDrones(drones: any[]) {
    try {
      fs.writeFileSync(DRONES_FILE, JSON.stringify(drones, null, 2));
      console.log(`Drones saved to ${DRONES_FILE}: ${drones.length} records`);
    } catch (error: any) {
      console.error(`Error saving drones to ${DRONES_FILE}:`, error.message);
    }
  }

  static loadDrones(): any[] {
    try {
      if (fs.existsSync(DRONES_FILE)) {
        const data = fs.readFileSync(DRONES_FILE, "utf-8");
        const drones = JSON.parse(data);
        console.log(
          `Drones loaded from ${DRONES_FILE}: ${drones.length} records`
        );
        return drones;
      } else {
        console.log(`Drones file not found at ${DRONES_FILE}`);
      }
    } catch (error: any) {
      console.error(`Error loading drones:`, error.message);
    }
    return [];
  }

  static saveDeliveries(deliveries: any[]) {
    try {
      fs.writeFileSync(DELIVERIES_FILE, JSON.stringify(deliveries, null, 2));
      console.log(
        `Deliveries saved to ${DELIVERIES_FILE}: ${deliveries.length} records`
      );
    } catch (error: any) {
      console.error(
        `Error saving deliveries to ${DELIVERIES_FILE}:`,
        error.message
      );
    }
  }

  static loadDeliveries(): any[] {
    try {
      if (fs.existsSync(DELIVERIES_FILE)) {
        const data = fs.readFileSync(DELIVERIES_FILE, "utf-8");
        const deliveries = JSON.parse(data);
        console.log(
          `Deliveries loaded from ${DELIVERIES_FILE}: ${deliveries.length} records`
        );
        return deliveries;
      } else {
        console.log(`Deliveries file not found at ${DELIVERIES_FILE}`);
      }
    } catch (error: any) {
      console.error(`Error loading deliveries:`, error.message);
    }
    return [];
  }

  static clearAllData() {
    try {
      if (fs.existsSync(ORDERS_FILE)) fs.unlinkSync(ORDERS_FILE);
      if (fs.existsSync(DRONES_FILE)) fs.unlinkSync(DRONES_FILE);
      if (fs.existsSync(DELIVERIES_FILE)) fs.unlinkSync(DELIVERIES_FILE);
      console.log("All data cleared");
    } catch (error: any) {
      console.error("Error clearing data:", error.message);
    }
  }
}
