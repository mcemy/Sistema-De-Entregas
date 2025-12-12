import { Order } from "../models/Order";
import { Drone } from "../models/Drone";
import { Coordinate, DeliveryPriority } from "../types";
import { calculateDistance } from "../utils/distance";

interface OptimizationResult {
  drone: Drone;
  orders: Order[];
  route: Coordinate[];
  totalWeight: number;
  totalDistance: number;
}

export class OptimizationService {
  static optimizeAllocation(
    orders: Order[],
    drones: Drone[],
    baseLocation: Coordinate,
    obstacles: Array<{ location: Coordinate; radius: number }> = []
  ): OptimizationResult[] {
    const availableDrones = drones.filter((d) => {
      const available = d.isAvailable();
      if (!available) {
        console.log(
          `Drone ${d.getName()} not available: state=${d.getState()}, battery=${d.getBatteryLevel()}%`
        );
      }
      return available;
    });

    if (availableDrones.length === 0) {
      console.log(`No available drones. Total drones: ${drones.length}`);
      drones.forEach((d) => {
        console.log(
          `  - ${d.getName()}: state=${d.getState()}, battery=${d.getBatteryLevel()}%, isAvailable=${d.isAvailable()}`
        );
      });
      return [];
    }

    console.log(`${availableDrones.length} drones available for optimization`);

    const pendingOrders = orders
      .filter((o) => o.getStatus() === "pending")
      .sort((a, b) => {
        const priorityDiff = b.getPriorityValue() - a.getPriorityValue();
        if (priorityDiff !== 0) return priorityDiff;
        const aCreatedAt = a.toJSON().createdAt;
        const bCreatedAt = b.toJSON().createdAt;
        const aTime =
          aCreatedAt instanceof Date
            ? aCreatedAt.getTime()
            : new Date(aCreatedAt).getTime();
        const bTime =
          bCreatedAt instanceof Date
            ? bCreatedAt.getTime()
            : new Date(bCreatedAt).getTime();
        return aTime - bTime;
      });

    console.log(`Pending orders to optimize: ${pendingOrders.length}`);

    const allocations: OptimizationResult[] = [];
    const usedDrones = new Set<string>(); // Track drones that already received deliveries
    const unassignedOrders: Order[] = []; // Orders that could not be assigned to new drones

    // First pass: distribute orders among available drones (one order per drone)
    for (const order of pendingOrders) {
      // Filter drones that have not been used yet
      const trulyAvailableDrones = availableDrones.filter(
        (d) => !usedDrones.has(d.getId())
      );

      if (trulyAvailableDrones.length === 0) {
        // No more new drones available, try grouping with already used drones
        unassignedOrders.push(order);
        continue;
      }

      console.log(
        `Assigning order ${order.getId()} (weight: ${order.getWeight()}kg) to one of ${
          trulyAvailableDrones.length
        } available drones`
      );
      const bestAllocation = this.findBestDroneForOrder(
        order,
        trulyAvailableDrones,
        baseLocation,
        obstacles
      );

      if (bestAllocation) {
        allocations.push(bestAllocation);
        // Mark the drone as used to not receive more deliveries this round
        usedDrones.add(bestAllocation.drone.getId());
        console.log(
          `Order ${order.getId()} assigned to drone ${bestAllocation.drone.getName()}`
        );
      } else {
        // Could not find capable drone, try grouping later
        unassignedOrders.push(order);
        console.log(
          `Unable to find new drone for order ${order.getId()}, grouping will be attempted`
        );
      }
    }

    // Second pass: try grouping remaining orders with drones that already have deliveries
    if (unassignedOrders.length > 0 && allocations.length > 0) {
      console.log(
        `Attempting to group ${unassignedOrders.length} remaining order(s) with existing drones`
      );
      for (const order of unassignedOrders) {
        // Try to find a drone that already has a delivery and can carry this order too
        let bestGroupedAllocation: OptimizationResult | null = null;
        let bestAllocationIndex = -1;

        for (let i = 0; i < allocations.length; i++) {
          const existingAllocation = allocations[i];
          const drone = existingAllocation.drone;
          const newWeight = existingAllocation.totalWeight + order.getWeight();

          if (!drone.canCarry(newWeight)) continue;

          const newRoute = this.calculateRoute(
            baseLocation,
            [...existingAllocation.orders, order].map((o) =>
              o.getCustomerLocation()
            ),
            obstacles
          );
          const newDistance = this.calculateRouteDistance(newRoute);

          if (drone.canReach(newDistance * 2)) {
            // This drone can carry this additional order
            if (
              !bestGroupedAllocation ||
              newDistance < bestGroupedAllocation.totalDistance
            ) {
              bestGroupedAllocation = {
                drone,
                orders: [...existingAllocation.orders, order],
                route: newRoute,
                totalWeight: newWeight,
                totalDistance: newDistance,
              };
              bestAllocationIndex = i;
            }
          }
        }

        if (bestGroupedAllocation && bestAllocationIndex !== -1) {
          allocations[bestAllocationIndex] = bestGroupedAllocation;
          console.log(
            `Order ${order.getId()} grouped with other orders on drone ${bestGroupedAllocation.drone.getName()}`
          );
        } else {
          console.log(
            `Unable to group order ${order.getId()} with any existing drone`
          );
        }
      }
    }

    console.log(
      `Optimization summary: ${allocations.length} allocation(s) created, ${unassignedOrders.length} unassigned order(s)`
    );

    if (allocations.length === 0 && pendingOrders.length > 0) {
      // Could not assign any orders, investigate the reason
      console.error(`No orders were assigned! Investigating...`);
      pendingOrders.forEach((order) => {
        const orderLocation = order.getCustomerLocation();
        const distance = calculateDistance(baseLocation, orderLocation);
        const roundTripDistance = distance * 2;
        console.error(
          `  Order ${order.getId()}: weight=${order.getWeight()}kg, distance=${distance.toFixed(
            1
          )}km (round-trip: ${roundTripDistance.toFixed(1)}km)`
        );

        availableDrones.forEach((drone) => {
          const canCarry = drone.canCarry(order.getWeight());
          const canReach = drone.canReach(roundTripDistance);
          console.error(
            `    Drone ${drone.getName()}: canCarry=${canCarry} (max: ${
              drone["drone"].maxWeight
            }kg), canReach=${canReach} (max: ${
              drone["drone"].maxDistance
            }km), battery=${drone.getBatteryLevel()}%, state=${drone.getState()}, hasDelivery=${!!drone.getCurrentDelivery()}`
          );
        });
      });
    }

    // Now try grouping orders on the same drone only if there is still capacity
    const finalAllocations = this.optimizeGrouping(
      allocations,
      availableDrones,
      baseLocation,
      obstacles
    );

    console.log(`Total final allocations: ${finalAllocations.length}`);
    if (finalAllocations.length > 0) {
      finalAllocations.forEach((alloc, index) => {
        console.log(
          `  ${index + 1}. Drone ${alloc.drone.getName()}: ${
            alloc.orders.length
          } order(s), total weight: ${
            alloc.totalWeight
          }kg, distance: ${alloc.totalDistance.toFixed(1)}km`
        );
      });
    }

    return finalAllocations;
  }

  private static findBestDroneForOrder(
    order: Order,
    drones: Drone[],
    baseLocation: Coordinate,
    obstacles: Array<{ location: Coordinate; radius: number }>
  ): OptimizationResult | null {
    const orderLocation = order.getCustomerLocation();

    // If deliveryLocation is defined, use it; otherwise use customerLocation
    const deliveryLocation = (order as any).deliveryLocation || orderLocation;

    // Calculate distance as if: base -> order -> delivery -> base
    const distanceToOrder = calculateDistance(baseLocation, orderLocation);
    const distanceToDelivery = calculateDistance(
      orderLocation,
      deliveryLocation
    );
    const distanceFromDeliveryToBase = calculateDistance(
      deliveryLocation,
      baseLocation
    );
    const totalRoutingDistance =
      distanceToOrder + distanceToDelivery + distanceFromDeliveryToBase;

    console.log(
      `Finding drone for order: weight=${order.getWeight()}kg, distance=${totalRoutingDistance.toFixed(
        1
      )}km (base->order->delivery->base)`
    );

    const capableDrones = drones.filter((d) => {
      const canCarry = d.canCarry(order.getWeight());
      const canReach = d.canReach(totalRoutingDistance);
      if (!canCarry) {
        console.log(
          `  ${d.getName()}: cannot carry ${order.getWeight()}kg (max: ${
            d["drone"].maxWeight
          }kg)`
        );
      }
      if (!canReach) {
        console.log(
          `  ${d.getName()}: cannot reach ${totalRoutingDistance.toFixed(
            1
          )}km (max: ${d["drone"].maxDistance}km)`
        );
      }
      return canCarry && canReach;
    });

    console.log(
      `  Capable drones: ${capableDrones.length} of ${drones.length}`
    );

    if (capableDrones.length === 0) {
      return null;
    }

    const bestDrone = capableDrones.reduce((best, current) => {
      const bestStats = best.getStats();
      const currentStats = current.getStats();

      if (current.getBatteryLevel() > best.getBatteryLevel()) return current;
      if (
        current.getBatteryLevel() === best.getBatteryLevel() &&
        currentStats.totalDeliveries < bestStats.totalDeliveries
      ) {
        return current;
      }
      return best;
    });

    // Calculate route with two destinations: order and delivery
    const route = this.calculateRoute(
      baseLocation,
      [orderLocation, deliveryLocation],
      obstacles
    );
    const routeDistance = this.calculateRouteDistance(route);

    console.log(`  Route calculated: ${routeDistance.toFixed(1)}km`);
    console.log(
      `  Drone selected: ${bestDrone.getName()}, battery: ${bestDrone.getBatteryLevel()}%, max distance: ${
        bestDrone["drone"].maxDistance
      }km`
    );

    if (!bestDrone.canReach(routeDistance)) {
      console.log(
        `  Drone ${bestDrone.getName()} cannot reach route distance (${routeDistance.toFixed(
          1
        )}km > ${bestDrone["drone"].maxDistance}km)`
      );
      return null;
    }

    console.log(`  Drone ${bestDrone.getName()} can perform delivery!`);

    return {
      drone: bestDrone,
      orders: [order],
      route,
      totalWeight: order.getWeight(),
      totalDistance: routeDistance,
    };
  }

  private static optimizeGrouping(
    allocations: OptimizationResult[],
    availableDrones: Drone[],
    baseLocation: Coordinate,
    obstacles: Array<{ location: Coordinate; radius: number }>
  ): OptimizationResult[] {
    // If no allocations, return empty
    if (allocations.length === 0) {
      console.log(`No allocations to group`);
      return [];
    }

    // If we already have allocations distributed among multiple drones, return as is
    // Grouping only makes sense if there are more orders than available drones
    // or if it's route optimization for the same drone

    // First, check if we already have adequate distribution
    const uniqueDrones = new Set(allocations.map((a) => a.drone.getId()));

    // If each allocation is already on a different drone, no need to group
    if (allocations.length === uniqueDrones.size) {
      console.log(
        `Orders already distributed across ${uniqueDrones.size} different drones. No grouping needed.`
      );
      return allocations;
    }

    // Otherwise, try grouping only orders from the same drone (route optimization)
    const optimized: OptimizationResult[] = [];
    const processedOrders = new Set<string>();
    const droneAllocations = new Map<string, OptimizationResult[]>();

    // Group allocations by drone
    for (const allocation of allocations) {
      const droneId = allocation.drone.getId();
      if (!droneAllocations.has(droneId)) {
        droneAllocations.set(droneId, []);
      }
      droneAllocations.get(droneId)!.push(allocation);
    }

    // For each drone, try grouping its orders into a single optimized route
    for (const [droneId, droneAllocs] of droneAllocations) {
      if (droneAllocs.length === 1) {
        // If the drone has only one order, keep as is
        optimized.push(droneAllocs[0]);
        continue;
      }

      // If the drone has multiple orders, try grouping them in an optimized route
      const drone = droneAllocs[0].drone;
      let currentOrders: Order[] = [];
      let currentWeight = 0;

      for (const alloc of droneAllocs) {
        if (processedOrders.has(alloc.orders[0].getId())) continue;

        const newOrder = alloc.orders[0];
        const newWeight = currentWeight + newOrder.getWeight();

        if (!drone.canCarry(newWeight)) {
          // If cannot carry more, create separate delivery with current orders
          if (currentOrders.length > 0) {
            const route = this.calculateRoute(
              baseLocation,
              currentOrders.map((o) => o.getCustomerLocation()),
              obstacles
            );
            optimized.push({
              drone,
              orders: [...currentOrders],
              route,
              totalWeight: currentWeight,
              totalDistance: this.calculateRouteDistance(route),
            });
            currentOrders.forEach((o) => processedOrders.add(o.getId()));
            currentOrders = [];
            currentWeight = 0;
          }
          // Try adding this order alone
          const route = this.calculateRoute(
            baseLocation,
            [newOrder.getCustomerLocation()],
            obstacles
          );
          const distance = this.calculateRouteDistance(route);
          if (drone.canReach(distance * 2)) {
            optimized.push({
              drone,
              orders: [newOrder],
              route,
              totalWeight: newOrder.getWeight(),
              totalDistance: distance,
            });
            processedOrders.add(newOrder.getId());
          }
          continue;
        }

        // Tentar adicionar ao grupo atual
        const testOrders = [...currentOrders, newOrder];
        const testRoute = this.calculateRoute(
          baseLocation,
          testOrders.map((o) => o.getCustomerLocation()),
          obstacles
        );
        const testDistance = this.calculateRouteDistance(testRoute);

        if (drone.canReach(testDistance * 2)) {
          currentOrders.push(newOrder);
          currentWeight = newWeight;
        } else {
          // If cannot reach, create delivery with current orders
          if (currentOrders.length > 0) {
            const route = this.calculateRoute(
              baseLocation,
              currentOrders.map((o) => o.getCustomerLocation()),
              obstacles
            );
            optimized.push({
              drone,
              orders: [...currentOrders],
              route,
              totalWeight: currentWeight,
              totalDistance: this.calculateRouteDistance(route),
            });
            currentOrders.forEach((o) => processedOrders.add(o.getId()));
          }
          // Start new group with this order
          currentOrders = [newOrder];
          currentWeight = newOrder.getWeight();
        }
      }

      // Add final group if any
      if (currentOrders.length > 0) {
        const route = this.calculateRoute(
          baseLocation,
          currentOrders.map((o) => o.getCustomerLocation()),
          obstacles
        );
        optimized.push({
          drone,
          orders: currentOrders,
          route,
          totalWeight: currentWeight,
          totalDistance: this.calculateRouteDistance(route),
        });
        currentOrders.forEach((o) => processedOrders.add(o.getId()));
      }
    }

    return optimized;
  }

  private static calculateRoute(
    start: Coordinate,
    destinations: Coordinate[],
    obstacles: Array<{ location: Coordinate; radius: number }>
  ): Coordinate[] {
    if (destinations.length === 0) {
      return [start, start];
    }

    if (destinations.length === 1) {
      return [start, destinations[0], start];
    }

    const route: Coordinate[] = [start];
    const unvisited = [...destinations];

    let current = start;
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = calculateDistance(current, unvisited[0]);

      for (let i = 1; i < unvisited.length; i++) {
        const distance = calculateDistance(current, unvisited[i]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const next = unvisited.splice(nearestIndex, 1)[0];
      route.push(next);
      current = next;
    }

    route.push(start);

    if (this.routeHasObstacle(route, obstacles)) {
      const altRoute: Coordinate[] = [start];
      destinations.forEach((dest) => {
        altRoute.push(dest);
      });
      altRoute.push(start);
      return altRoute;
    }

    return route;
  }

  private static calculateRouteDistance(route: Coordinate[]): number {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      distance += calculateDistance(route[i], route[i + 1]);
    }
    return distance;
  }

  private static routeHasObstacle(
    route: Coordinate[],
    obstacles: Array<{ location: Coordinate; radius: number }>
  ): boolean {
    for (const point of route) {
      for (const obstacle of obstacles) {
        const distance = calculateDistance(point, obstacle.location);
        if (distance <= obstacle.radius) {
          return true;
        }
      }
    }
    return false;
  }
}
