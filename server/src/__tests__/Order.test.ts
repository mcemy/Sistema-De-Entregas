import { Order } from "../models/Order";
import { DeliveryPriority } from "../types";

describe("Order", () => {
  it("should create a valid order", () => {
    const order = new Order("1", { x: 10, y: 20 }, 5, DeliveryPriority.HIGH);

    expect(order.getId()).toBe("1");
    expect(order.getWeight()).toBe(5);
    expect(order.getPriority()).toBe(DeliveryPriority.HIGH);
    expect(order.getStatus()).toBe("pending");
  });

  it("should throw error for invalid weight", () => {
    expect(() => {
      new Order("1", { x: 10, y: 20 }, 0, DeliveryPriority.MEDIUM);
    }).toThrow("Peso do pedido deve ser maior que zero");
  });

  it("should assign an order", () => {
    const order = new Order("1", { x: 10, y: 20 }, 5, DeliveryPriority.HIGH);
    order.assign();
    expect(order.getStatus()).toBe("assigned");
  });

  it("should deliver an order", () => {
    const order = new Order("1", { x: 10, y: 20 }, 5, DeliveryPriority.HIGH);
    order.deliver();
    expect(order.getStatus()).toBe("delivered");
  });

  it("should return correct priority values", () => {
    const highOrder = new Order(
      "1",
      { x: 10, y: 20 },
      5,
      DeliveryPriority.HIGH
    );
    const mediumOrder = new Order(
      "2",
      { x: 10, y: 20 },
      5,
      DeliveryPriority.MEDIUM
    );
    const lowOrder = new Order("3", { x: 10, y: 20 }, 5, DeliveryPriority.LOW);

    expect(highOrder.getPriorityValue()).toBe(3);
    expect(mediumOrder.getPriorityValue()).toBe(2);
    expect(lowOrder.getPriorityValue()).toBe(1);
  });
});
