import { Order as OrderType, DeliveryPriority, Coordinate } from "../types";

export class Order {
  private order: OrderType;

  constructor(
    id: string,
    customerLocation: Coordinate,
    weight: number,
    priority: DeliveryPriority,
    deliveryLocation?: Coordinate
  ) {
    if (weight <= 0) {
      throw new Error("Peso do pedido deve ser maior que zero");
    }

    this.order = {
      id,
      customerLocation: { ...customerLocation },
      deliveryLocation: deliveryLocation ? { ...deliveryLocation } : undefined,
      weight,
      priority,
      createdAt: new Date(),
      status: "pending",
    };
  }

  getId(): string {
    return this.order.id;
  }

  getCustomerLocation(): Coordinate {
    return { ...this.order.customerLocation };
  }

  getDeliveryLocation(): Coordinate {
    return this.order.deliveryLocation
      ? { ...this.order.deliveryLocation }
      : { ...this.order.customerLocation };
  }

  getWeight(): number {
    return this.order.weight;
  }

  getPriority(): DeliveryPriority {
    return this.order.priority;
  }

  getStatus(): string {
    return this.order.status;
  }

  assign(): void {
    this.order.status = "assigned";
  }

  deliver(): void {
    this.order.status = "delivered";
  }

  cancel(): void {
    this.order.status = "cancelled";
  }

  getPriorityValue(): number {
    switch (this.order.priority) {
      case DeliveryPriority.HIGH:
        return 3;
      case DeliveryPriority.MEDIUM:
        return 2;
      case DeliveryPriority.LOW:
        return 1;
      default:
        return 0;
    }
  }

  toJSON(): any {
    return {
      ...this.order,
      createdAt:
        this.order.createdAt instanceof Date
          ? this.order.createdAt.toISOString()
          : this.order.createdAt,
    };
  }
}
