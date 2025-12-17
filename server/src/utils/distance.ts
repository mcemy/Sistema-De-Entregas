import { Coordinate } from '../types';

export function calculateDistance(point1: Coordinate, point2: Coordinate): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isPointInObstacle(
  point: Coordinate,
  obstacleCenter: Coordinate,
  radius: number
): boolean {
  const distance = calculateDistance(point, obstacleCenter);
  return distance <= radius;
}

export function routeHasObstacle(
  route: Coordinate[],
  obstacles: Array<{ location: Coordinate; radius: number }>
): boolean {
  for (const point of route) {
    for (const obstacle of obstacles) {
      if (isPointInObstacle(point, obstacle.location, obstacle.radius)) {
        return true;
      }
    }
  }
  return false;
}

export function calculateRouteDistance(route: Coordinate[]): number {
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += calculateDistance(route[i], route[i + 1]);
  }
  return totalDistance;
}

