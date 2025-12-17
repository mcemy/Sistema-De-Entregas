import { Request, Response } from "express";
import { Order } from "../models/Order";
import { DeliveryPriority, Coordinate } from "../types";
import { v4 as uuidv4 } from "uuid";
import { OrdersDB } from "../services/DatabaseService";

const orders: Map<string, Order> = new Map();

const loadOrdersFromDatabase = () => {
  try {
    const savedOrders = OrdersDB.getAll();
    console.log(
      `Attempting to load ${savedOrders.length} orders from database`
    );
    savedOrders.forEach((orderData: any) => {
      try {
        const order = new Order(
          orderData.id,
          orderData.customerLocation,
          orderData.weight,
          orderData.priority
        );
        if (orderData.status === "assigned") {
          order.assign();
        } else if (orderData.status === "delivered") {
          order.deliver();
        } else if (orderData.status === "cancelled") {
          order.cancel();
        }
        orders.set(order.getId(), order);
      } catch (error: any) {
        console.error(`Error loading order ${orderData.id}:`, error.message);
      }
    });
    console.log(`${savedOrders.length} orders loaded from database`);
    console.log(`Total orders in memory: ${orders.size}`);
  } catch (error: any) {
    console.error(`Error loading orders from database:`, error.message);
  }
};

loadOrdersFromDatabase();

export class OrderController {
  static reloadFromDatabase() {
    orders.clear();
    loadOrdersFromDatabase();
  }

  static createOrder(req: Request, res: Response): void {
    try {
      const { customerLocation, deliveryLocation, weight, priority } = req.body;
      if (
        !customerLocation ||
        typeof customerLocation.x !== "number" ||
        typeof customerLocation.y !== "number"
      ) {
        res.status(400).json({ error: "Localização do cliente inválida" });
        return;
      }

      if (!weight || weight <= 0) {
        res.status(400).json({ error: "Peso deve ser maior que zero" });
        return;
      }

      if (!priority || !Object.values(DeliveryPriority).includes(priority)) {
        res
          .status(400)
          .json({ error: "Prioridade inválida. Use: low, medium ou high" });
        return;
      }

      // Validar deliveryLocation se fornecido
      let finalDeliveryLocation: Coordinate | undefined = undefined;
      if (deliveryLocation) {
        if (
          typeof deliveryLocation.x !== "number" ||
          typeof deliveryLocation.y !== "number"
        ) {
          res.status(400).json({ error: "Localização de entrega inválida" });
          return;
        }
        finalDeliveryLocation = deliveryLocation;
      }

      const order = new Order(
        uuidv4(),
        customerLocation as Coordinate,
        weight,
        priority as DeliveryPriority,
        finalDeliveryLocation
      );

      orders.set(order.getId(), order);
      console.log(
        `Order created: ${order.getId()}, Total orders: ${orders.size}`
      );

      OrdersDB.create(order.toJSON());

      res.status(201).json(order.toJSON());
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static listOrders(req: Request, res: Response): void {
    try {
      const status = req.query.status as string;
      let orderList = Array.from(orders.values()).map((o) => o.toJSON());
      console.log(`Listing orders: ${orderList.length} total`);
      console.log(
        `Order data:`,
        JSON.stringify(orderList.slice(0, 2), null, 2)
      );

      if (status) {
        orderList = orderList.filter((o) => o.status === status);
        console.log(`Orders with status "${status}": ${orderList.length}`);
      }

      res.json(orderList);
    } catch (error: any) {
      console.error(`Error listing orders:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  static getOrder(req: Request, res: Response): void {
    const { id } = req.params;
    const order = orders.get(id);

    if (!order) {
      res.status(404).json({ error: "Pedido não encontrado" });
      return;
    }

    res.json(order.toJSON());
  }

  static cancelOrder(req: Request, res: Response): void {
    const { id } = req.params;
    const order = orders.get(id);

    if (!order) {
      res.status(404).json({ error: "Pedido não encontrado" });
      return;
    }

    if (order.getStatus() === "delivered") {
      res
        .status(400)
        .json({ error: "Não é possível cancelar um pedido já entregue" });
      return;
    }

    order.cancel();

    OrdersDB.update(id, "cancelled");

    res.json(order.toJSON());
  }

  static getPendingOrders(): Order[] {
    return Array.from(orders.values()).filter(
      (o) => o.getStatus() === "pending"
    );
  }

  static getAllOrders(): Order[] {
    return Array.from(orders.values());
  }
}
