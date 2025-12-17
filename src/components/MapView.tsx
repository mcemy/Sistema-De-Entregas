import React, { useRef, useEffect, useCallback } from "react";
import { Drone, Order, Delivery } from "../types";
import "./MapView.css";

interface MapViewProps {
  drones: Drone[];
  orders: Order[];
  deliveries: Delivery[];
}

const MapView: React.FC<MapViewProps> = ({ drones, orders, deliveries }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Validação de dados
    const validDrones = drones.filter(
      (d) =>
        d &&
        typeof d.currentLocation?.x === "number" &&
        typeof d.currentLocation?.y === "number" &&
        typeof d.baseLocation?.x === "number" &&
        typeof d.baseLocation?.y === "number" &&
        !isNaN(d.currentLocation.x) &&
        !isNaN(d.currentLocation.y) &&
        !isNaN(d.baseLocation.x) &&
        !isNaN(d.baseLocation.y)
    );

    const validOrders = orders.filter(
      (o) =>
        o &&
        typeof o.customerLocation?.x === "number" &&
        typeof o.customerLocation?.y === "number" &&
        !isNaN(o.customerLocation.x) &&
        !isNaN(o.customerLocation.y)
    );

    // Coleta todos os pontos válidos para calcular limites
    const allPoints: number[][] = [];

    validDrones.forEach((d) => {
      allPoints.push([d.currentLocation.x, d.currentLocation.y]);
      allPoints.push([d.baseLocation.x, d.baseLocation.y]);
    });

    validOrders.forEach((o) => {
      allPoints.push([o.customerLocation.x, o.customerLocation.y]);
    });

    deliveries.forEach((d) => {
      if (d.route && Array.isArray(d.route)) {
        d.route.forEach((r) => {
          if (
            r &&
            typeof r.x === "number" &&
            typeof r.y === "number" &&
            !isNaN(r.x) &&
            !isNaN(r.y)
          ) {
            allPoints.push([r.x, r.y]);
          }
        });
      }
    });

    if (allPoints.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#6b7280";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "Nenhum dado para exibir",
        canvas.width / 2,
        canvas.height / 2
      );
      return;
    }

    // Calcula limites com segurança
    const xs = allPoints.map((p) => p[0]).filter((x) => isFinite(x));
    const ys = allPoints.map((p) => p[1]).filter((y) => isFinite(y));

    if (xs.length === 0 || ys.length === 0) return;

    const minX = Math.min(...xs) - 5;
    const maxX = Math.max(...xs) + 5;
    const minY = Math.min(...ys) - 5;
    const maxY = Math.max(...ys) + 5;

    const rangeX = Math.max(maxX - minX, 20);
    const rangeY = Math.max(maxY - minY, 20);

    const scaleX = (canvas.width - 40) / rangeX;
    const scaleY = (canvas.height - 40) / rangeY;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (canvas.width - rangeX * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - rangeY * scale) / 2 - minY * scale;

    const transform = (x: number, y: number) => {
      if (!isFinite(x) || !isFinite(y)) return { x: 0, y: 0 };
      return {
        x: x * scale + offsetX,
        y: y * scale + offsetY,
      };
    };

    // Limpa o canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ===== DESENHA ROTAS =====
    deliveries.forEach((delivery) => {
      if (!delivery || !delivery.orders || delivery.orders.length === 0) return;

      const drone = validDrones.find((d) => d.id === delivery.droneId);
      if (!drone) return;

      const basePos = transform(drone.baseLocation.x, drone.baseLocation.y);
      const isScheduled = delivery.status === "scheduled";
      const isInProgress = delivery.status === "in-progress";
      const isCompleted = delivery.status === "completed";

      // ===== ROTA PLANEJADA (AGENDADA) =====
      if (isScheduled && delivery.route && delivery.route.length >= 2) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const start = transform(delivery.route[0].x, delivery.route[0].y);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < delivery.route.length; i++) {
          const point = transform(delivery.route[i].x, delivery.route[i].y);
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ===== ROTA EM PROGRESSO =====
      if (isInProgress && delivery.route && delivery.route.length >= 2) {
        const dronePos = transform(
          drone.currentLocation.x,
          drone.currentLocation.y
        );

        // Desenha a rota planejada completa em segundo plano
        ctx.strokeStyle = "#e0e7ff";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        const start = transform(delivery.route[0].x, delivery.route[0].y);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < delivery.route.length; i++) {
          const point = transform(delivery.route[i].x, delivery.route[i].y);
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();

        // Desenha a rota já percorrida (do drone até sua posição atual)
        if (
          drone.currentState === "loading" ||
          drone.currentState === "flying"
        ) {
          // Indo buscar o pedido (base → pedido)
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(basePos.x, basePos.y);
          ctx.lineTo(dronePos.x, dronePos.y);
          ctx.stroke();
        } else if (drone.currentState === "delivering") {
          // Está entregando (ja chegou no pedido, mostra rota até o pedido)
          ctx.strokeStyle = "#8b5cf6";
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(basePos.x, basePos.y);
          // Desenha até o destino
          if (delivery.route.length >= 2) {
            const destination = transform(
              delivery.route[1].x,
              delivery.route[1].y
            );
            ctx.lineTo(destination.x, destination.y);
          }
          ctx.stroke();
        } else if (drone.currentState === "returning") {
          // Retornando para base
          const destination =
            delivery.route.length >= 2
              ? transform(delivery.route[1].x, delivery.route[1].y)
              : basePos;

          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          // Caminho já feito: base → destino
          ctx.moveTo(basePos.x, basePos.y);
          ctx.lineTo(destination.x, destination.y);
          // Caminho sendo feito: destino → base (até posição atual)
          ctx.lineTo(dronePos.x, dronePos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // ===== ROTA COMPLETA FINALIZADA =====
      if (isCompleted && delivery.route && delivery.route.length >= 2) {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        const start = transform(delivery.route[0].x, delivery.route[0].y);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < delivery.route.length; i++) {
          const point = transform(delivery.route[i].x, delivery.route[i].y);
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // ===== DESENHA BASES =====
    const baseSet = new Set<string>();
    validDrones.forEach((d) => {
      const key = `${d.baseLocation.x},${d.baseLocation.y}`;
      if (!baseSet.has(key)) {
        baseSet.add(key);
        const pos = transform(d.baseLocation.x, d.baseLocation.y);
        ctx.fillStyle = "#8b5cf6";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("BASE", pos.x, pos.y + 25);
      }
    });

    // ===== DESENHA PEDIDOS PENDENTES E ATRIBUÍDOS =====
    validOrders
      .filter((o) => o.status === "pending" || o.status === "assigned")
      .forEach((order) => {
        const pos = transform(
          order.customerLocation.x,
          order.customerLocation.y
        );
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

    // ===== DESENHA DESTINOS DE ENTREGA (ROSA) =====
    deliveries
      .filter((d) => d.status === "in-progress" || d.status === "scheduled")
      .forEach((delivery) => {
        // Usar o ponto da rota como destino de entrega (geralmente o penúltimo ponto antes de voltar pra base)
        if (delivery.route && delivery.route.length >= 2) {
          // Se houver múltiplos pontos na rota, o destino de entrega é o penúltimo (antes de retornar à base)
          const destinationPoint = delivery.route[delivery.route.length - 2];
          const pos = transform(destinationPoint.x, destinationPoint.y);

          ctx.fillStyle = "#ec4899";
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "white";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      });

    // ===== DESENHA DRONES (por último) =====
    validDrones.forEach((drone) => {
      const pos = transform(drone.currentLocation.x, drone.currentLocation.y);

      // Cor única para drone em movimento, verde para ocioso
      let color = "#10b981"; // Verde - Ocioso/Pronto
      if (drone.currentState !== "idle") {
        color = "#3b82f6"; // Azul - Em Voo (flying, loading, delivering, returning)
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#333";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText(drone.name.slice(0, 8), pos.x, pos.y - 12);
    });
  }, [drones, orders, deliveries]);

  useEffect(() => {
    // Cancela animação anterior se existir
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Usa requestAnimationFrame para suavizar renderização
    const animate = () => {
      drawMap();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawMap]);

  return (
    <div className="map-view">
      <h2>🗺️ Mapa de Entregas</h2>
      <div className="map-legend">
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: "#8b5cf6" }}
          ></div>
          <span>Base</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: "#f59e0b" }}
          ></div>
          <span>Pedido</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: "#3b82f6" }}
          ></div>
          <span>Drone em Voo</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ backgroundColor: "#ec4899" }}
          ></div>
          <span>Destino de Entrega</span>
        </div>
      </div>
      <canvas ref={canvasRef} width={800} height={600} className="map-canvas" />
    </div>
  );
};

export default MapView;
