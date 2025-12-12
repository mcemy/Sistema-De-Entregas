import { Router } from "express";
import { OrderController } from "../controllers/OrderController";
import { DroneController } from "../controllers/DroneController";
import { DeliveryController } from "../controllers/DeliveryController";

const router = Router();

router.post("/orders", OrderController.createOrder);
router.get("/orders", OrderController.listOrders);
router.get("/orders/:id", OrderController.getOrder);
router.delete("/orders/:id", OrderController.cancelOrder);

router.post("/drones", DroneController.createDrone);
router.get("/drones", DroneController.listDrones);
router.get("/drones/:id", DroneController.getDrone);
router.get("/drones/:id/status", DroneController.getDroneStatus);
router.post("/drones/:id/recharge", DroneController.rechargeDrone);
router.delete("/drones/:id", DroneController.deleteDrone);

// Specific routes MUST come before parameterized routes
router.post("/deliveries/optimize", DeliveryController.optimizeDeliveries);
router.get("/deliveries/stats", DeliveryController.getStats);
router.post("/deliveries/simulate/start", DeliveryController.startSimulation);
router.post("/deliveries/simulate/stop", DeliveryController.stopSimulation);
router.post("/deliveries/simulate/step", DeliveryController.stepSimulation);
router.post("/deliveries/reset", DeliveryController.resetAll);
router.get("/deliveries", DeliveryController.listDeliveries);
router.get("/deliveries/:id/route", DeliveryController.getDeliveryRoute);
router.get("/deliveries/:id", DeliveryController.getDelivery);

export default router;
