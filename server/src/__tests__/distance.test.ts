import { calculateDistance, isPointInObstacle } from '../utils/distance';
import { Coordinate } from '../types';

describe('Distance Utils', () => {
  describe('calculateDistance', () => {
    it('deve calcular distância entre dois pontos', () => {
      const point1: Coordinate = { x: 0, y: 0 };
      const point2: Coordinate = { x: 3, y: 4 };

      const distance = calculateDistance(point1, point2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('deve retornar 0 para pontos iguais', () => {
      const point: Coordinate = { x: 5, y: 5 };
      const distance = calculateDistance(point, point);
      expect(distance).toBe(0);
    });

    it('deve calcular distância com coordenadas negativas', () => {
      const point1: Coordinate = { x: -5, y: -5 };
      const point2: Coordinate = { x: 5, y: 5 };

      const distance = calculateDistance(point1, point2);
      expect(distance).toBeCloseTo(14.14, 1);
    });
  });

  describe('isPointInObstacle', () => {
    it('deve detectar ponto dentro do obstáculo', () => {
      const point: Coordinate = { x: 5, y: 5 };
      const obstacleCenter: Coordinate = { x: 5, y: 5 };
      const radius = 10;

      expect(isPointInObstacle(point, obstacleCenter, radius)).toBe(true);
    });

    it('deve detectar ponto fora do obstáculo', () => {
      const point: Coordinate = { x: 20, y: 20 };
      const obstacleCenter: Coordinate = { x: 5, y: 5 };
      const radius = 10;

      expect(isPointInObstacle(point, obstacleCenter, radius)).toBe(false);
    });

    it('deve detectar ponto na borda do obstáculo', () => {
      const obstacleCenter: Coordinate = { x: 0, y: 0 };
      const radius = 5;
      const point: Coordinate = { x: 5, y: 0 }; // Exatamente no raio

      expect(isPointInObstacle(point, obstacleCenter, radius)).toBe(true);
    });
  });
});

