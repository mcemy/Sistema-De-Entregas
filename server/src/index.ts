import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "./services/DatabaseService";

dotenv.config();

initializeDatabase();

import routes from "./routes";
import { OrderController } from "./controllers/OrderController";
import { DroneController } from "./controllers/DroneController";

setTimeout(() => {
  OrderController.reloadFromDatabase();
  DroneController.reloadFromDatabase();
}, 100);

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        "http://localhost:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
      ];

      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === "string") {
          return origin === allowed;
        }
        return allowed.test(origin);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const stringified = JSON.parse(
      JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      })
    );
    return originalJson(stringified);
  };
  next();
});

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "Servidor de Entregas por Drones",
    health: "ok",
    api: "http://localhost:3001/api",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api", (req, res) => {
  res.json({
    message: "API de Entregas por Drones",
    endpoints: {
      orders: "/api/orders",
      drones: "/api/drones",
      deliveries: "/api/deliveries",
      stats: "/api/deliveries/stats",
    },
  });
});

app.use("/api", routes);

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Algo deu errado!" });
  }
);

app
  .listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  })
  .on("error", (err: any) => {
    console.error("Error starting server:", err);
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
    }
  });
