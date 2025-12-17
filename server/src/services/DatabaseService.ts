import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(__dirname, "..", "..", "data");
const DB_FILE = path.join(DB_DIR, "drones.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log(`Data directory created: ${DB_DIR}`);
}

const db = new Database(DB_FILE);
db.exec("PRAGMA journal_mode = WAL");

console.log(`SQLite database initialized: ${DB_FILE}`);

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customerLocation_x REAL NOT NULL,
      customerLocation_y REAL NOT NULL,
      weight REAL NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS drones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      maxWeight REAL NOT NULL,
      maxDistance REAL NOT NULL,
      baseLocation_x REAL NOT NULL,
      baseLocation_y REAL NOT NULL,
      batteryLevel REAL NOT NULL DEFAULT 100,
      currentState TEXT NOT NULL DEFAULT 'idle',
      currentLocation_x REAL NOT NULL,
      currentLocation_y REAL NOT NULL,
      totalDeliveries INTEGER NOT NULL DEFAULT 0,
      totalDistance REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      droneId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      totalDistance REAL NOT NULL,
      totalWeight REAL NOT NULL,
      estimatedTime REAL NOT NULL,
      startedAt TEXT,
      completedAt TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (droneId) REFERENCES drones(id)
    )
  `);

  console.log("Database tables created/verified");
}

export const OrdersDB = {
  create: (order: any) => {
    const stmt = db.prepare(`
      INSERT INTO orders (id, customerLocation_x, customerLocation_y, weight, priority, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    // createdAt pode ser Date ou string (se vier de toJSON())
    const createdAtStr =
      order.createdAt instanceof Date
        ? order.createdAt.toISOString()
        : order.createdAt;
    stmt.run(
      order.id,
      order.customerLocation.x,
      order.customerLocation.y,
      order.weight,
      order.priority,
      order.status,
      createdAtStr
    );
    console.log(`Order saved to database: ${order.id}`);
  },

  getAll: () => {
    const stmt = db.prepare("SELECT * FROM orders");
    const rows = stmt.all();
    return rows.map((row: any) => ({
      id: row.id,
      customerLocation: {
        x: row.customerLocation_x,
        y: row.customerLocation_y,
      },
      weight: row.weight,
      priority: row.priority,
      status: row.status,
      createdAt: new Date(row.createdAt),
    }));
  },

  update: (orderId: string, status: string) => {
    const stmt = db.prepare("UPDATE orders SET status = ? WHERE id = ?");
    stmt.run(status, orderId);
    console.log(`Order ${orderId} updated with status: ${status}`);
  },

  delete: (orderId: string) => {
    const stmt = db.prepare("DELETE FROM orders WHERE id = ?");
    stmt.run(orderId);
  },
};

export const DronesDB = {
  create: (drone: any) => {
    const stmt = db.prepare(`
      INSERT INTO drones (id, name, maxWeight, maxDistance, baseLocation_x, baseLocation_y, 
                         batteryLevel, currentState, currentLocation_x, currentLocation_y, 
                         totalDeliveries, totalDistance, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // createdAt pode ser Date ou string (se vier de toJSON())
    const createdAtStr =
      drone.createdAt instanceof Date
        ? drone.createdAt.toISOString()
        : drone.createdAt;
    stmt.run(
      drone.id,
      drone.name,
      drone.maxWeight,
      drone.maxDistance,
      drone.baseLocation.x,
      drone.baseLocation.y,
      drone.batteryLevel,
      drone.currentState,
      drone.currentLocation.x,
      drone.currentLocation.y,
      drone.totalDeliveries,
      drone.totalDistance,
      createdAtStr
    );
    console.log(`Drone saved to database: ${drone.id}`);
  },

  getAll: () => {
    const stmt = db.prepare("SELECT * FROM drones");
    const rows = stmt.all();
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      maxWeight: row.maxWeight,
      maxDistance: row.maxDistance,
      baseLocation: { x: row.baseLocation_x, y: row.baseLocation_y },
      batteryLevel: row.batteryLevel,
      currentState: row.currentState,
      currentLocation: { x: row.currentLocation_x, y: row.currentLocation_y },
      totalDeliveries: row.totalDeliveries,
      totalDistance: row.totalDistance,
      createdAt: new Date(row.createdAt),
    }));
  },

  update: (droneId: string, data: any) => {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.batteryLevel !== undefined) {
      updates.push("batteryLevel = ?");
      values.push(data.batteryLevel);
    }
    if (data.currentState !== undefined) {
      updates.push("currentState = ?");
      values.push(data.currentState);
    }
    if (data.currentLocation !== undefined) {
      updates.push("currentLocation_x = ?, currentLocation_y = ?");
      values.push(data.currentLocation.x, data.currentLocation.y);
    }
    if (data.totalDeliveries !== undefined) {
      updates.push("totalDeliveries = ?");
      values.push(data.totalDeliveries);
    }
    if (data.totalDistance !== undefined) {
      updates.push("totalDistance = ?");
      values.push(data.totalDistance);
    }

    if (updates.length === 0) return;

    values.push(droneId);
    const stmt = db.prepare(
      `UPDATE drones SET ${updates.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);
    console.log(`Drone ${droneId} updated`);
  },

  delete: (droneId: string) => {
    const stmt = db.prepare("DELETE FROM drones WHERE id = ?");
    stmt.run(droneId);
  },
};

export const DeliveriesDB = {
  create: (delivery: any) => {
    const existing = db
      .prepare("SELECT id FROM deliveries WHERE id = ?")
      .get(delivery.id);
    if (existing) {
      console.log(
        `Delivery ${delivery.id} already exists in database, skipping...`
      );
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO deliveries (id, droneId, status, totalDistance, totalWeight, estimatedTime, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      delivery.id,
      delivery.droneId,
      delivery.status || "scheduled",
      delivery.totalDistance || 0,
      delivery.totalWeight || 0,
      delivery.estimatedTime || 0,
      new Date().toISOString()
    );
    console.log(`Delivery saved to database: ${delivery.id}`);
  },

  getAll: () => {
    const stmt = db.prepare("SELECT * FROM deliveries");
    const rows = stmt.all();
    return rows.map((row: any) => ({
      id: row.id,
      droneId: row.droneId,
      status: row.status,
      totalDistance: row.totalDistance,
      totalWeight: row.totalWeight,
      estimatedTime: row.estimatedTime,
      startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
    }));
  },

  update: (deliveryId: string, status: string, completedAt?: Date) => {
    const stmt = db.prepare(
      "UPDATE deliveries SET status = ?, completedAt = ? WHERE id = ?"
    );
    const completedAtStr =
      completedAt instanceof Date
        ? completedAt.toISOString()
        : completedAt || null;
    const result = stmt.run(status, completedAtStr, deliveryId);
    if (result.changes > 0) {
      console.log(`Delivery ${deliveryId} updated with status: ${status}`);
    } else {
      console.warn(`Delivery ${deliveryId} not found in database for update`);
    }
  },

  updateStartedAt: (deliveryId: string, startedAt: Date) => {
    const stmt = db.prepare(
      "UPDATE deliveries SET status = 'in-progress', startedAt = ? WHERE id = ?"
    );
    const startedAtStr =
      startedAt instanceof Date ? startedAt.toISOString() : startedAt;
    stmt.run(startedAtStr, deliveryId);
    console.log(`Delivery ${deliveryId} started at: ${startedAtStr}`);
  },

  delete: (deliveryId: string) => {
    const stmt = db.prepare("DELETE FROM deliveries WHERE id = ?");
    stmt.run(deliveryId);
  },
};

export default db;
