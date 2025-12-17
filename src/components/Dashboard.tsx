import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Drone, Order, Delivery, DeliveryStats } from "../types";
import DroneList from "./DroneList";
import OrderList from "./OrderList";
import DeliveryList from "./DeliveryList";
import StatsPanel from "./StatsPanel";
import MapView from "./MapView";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  console.log(" Dashboard renderizando...");
  const [drones, setDrones] = useState<Drone[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [hasDeliveries, setHasDeliveries] = useState(false);
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "drones" | "orders" | "deliveries" | "map"
  >("overview");

  const loadData = async () => {
    console.log("🔄 Carregando dados...");
    try {
      console.log(" Fazendo requisições para:", "http://localhost:3001/api");
      const [dronesData, ordersData, deliveriesData, statsData] =
        await Promise.all([
          api.getDrones(),
          api.getOrders(),
          api.getDeliveries(),
          api.getStats(),
        ]);
      console.log("✅ Dados carregados:", {
        drones: Array.isArray(dronesData) ? dronesData.length : 0,
        orders: Array.isArray(ordersData) ? ordersData.length : 0,
        deliveries: Array.isArray(deliveriesData) ? deliveriesData.length : 0,
        stats: statsData,
      });
      console.log("Drones detalhados:", JSON.stringify(dronesData, null, 2));
      console.log("Orders detalhados:", JSON.stringify(ordersData, null, 2));

      if (!Array.isArray(dronesData)) {
        console.error("❌ dronesData não é um array:", dronesData);
        setDrones([]);
      } else {
        const validDrones = dronesData.filter((drone: any) => {
          const isValid =
            drone &&
            typeof drone.id === "string" &&
            typeof drone.name === "string" &&
            typeof drone.currentState === "string";
          if (!isValid) {
            console.warn("⚠️ Drone inválido ignorado:", drone);
          }
          return isValid;
        });
        console.log(
          `✅ ${validDrones.length} drones válidos de ${dronesData.length} total`
        );
        setDrones(validDrones);
      }

      if (!Array.isArray(ordersData)) {
        console.error("❌ ordersData não é um array:", ordersData);
        setOrders([]);
      } else {
        const validOrders = ordersData.filter((order: any) => {
          const isValid =
            order &&
            typeof order.id === "string" &&
            typeof order.status === "string" &&
            order.customerLocation &&
            typeof order.customerLocation.x === "number";
          if (!isValid) {
            console.warn("⚠️ Pedido inválido ignorado:", order);
          }
          return isValid;
        });
        console.log(
          `✅ ${validOrders.length} pedidos válidos de ${ordersData.length} total`
        );
        setOrders(validOrders);
      }

      if (!Array.isArray(deliveriesData)) {
        console.error("❌ deliveriesData não é um array:", deliveriesData);
        setDeliveries([]);
        setHasDeliveries(false);
      } else {
        const deliveriesCount = deliveriesData.length;
        setDeliveries(deliveriesData);
        setHasDeliveries(deliveriesCount > 0);
        console.log(
          `📦 Entregas carregadas: ${deliveriesCount}, hasDeliveries atualizado: ${
            deliveriesCount > 0
          }`
        );
      }

      setStats(statsData);
    } catch (error: any) {
      console.error("❌ Erro ao carregar dados:", error);
      console.error("Erro completo:", JSON.stringify(error, null, 2));
      if (
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("NetworkError") ||
        error.message?.includes("conectar")
      ) {
        console.error(
          "⚠️ Backend não está respondendo. Verifique se o servidor está rodando na porta 3001"
        );
        console.error("Teste manualmente: http://localhost:3001/health");
      }
    }
  };

  useEffect(() => {
    console.log("🚀 Dashboard montado, iniciando carregamento...");
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 1000); // Atualizar a cada 1 segundo para ver o movimento dos drones
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleAssignDeliveries = async () => {
    try {
      console.log("📦 Atribuindo entregas...");
      const result = await api.optimizeDeliveries();
      console.log("✅ Entregas atribuídas:", result);

      await new Promise((resolve) => setTimeout(resolve, 300));

      await loadData();

      const deliveriesCheck = await api.getDeliveries();
      const hasDeliveriesNow =
        Array.isArray(deliveriesCheck) && deliveriesCheck.length > 0;
      setHasDeliveries(hasDeliveriesNow);

      console.log(
        `📦 Entregas criadas: ${deliveriesCheck.length}, hasDeliveries: ${hasDeliveriesNow}`
      );

      if (hasDeliveriesNow) {
        alert(
          `✅ ${deliveriesCheck.length} entrega(s) atribuída(s) aos drones! Agora você pode iniciar a simulação.`
        );
      } else {
        alert(
          "⚠️ Nenhuma entrega foi criada. Verifique se há drones disponíveis e pedidos pendentes."
        );
      }
    } catch (error: any) {
      console.error("❌ Erro ao atribuir entregas:", error);
      alert(`Erro ao atribuir entregas: ${error.message}`);
      setHasDeliveries(false);
    }
  };

  const handleSimulation = async () => {
    try {
      if (isSimulating) {
        await api.stopSimulation();
        setIsSimulating(false);
      } else {
        await api.startSimulation(1000); // Simulação mais rápida (1 segundo)
        setIsSimulating(true);
      }
    } catch (error: any) {
      alert(`Erro ao controlar simulação: ${error.message}`);
    }
  };

  return (
    <div className="dashboard">
      <div
        style={{
          position: "fixed",
          top: "50px",
          right: 0,
          padding: "10px",
          background: "#222",
          color: "#0f0",
          zIndex: 9998,
          fontFamily: "monospace",
          fontSize: "12px",
          maxWidth: "300px",
          pointerEvents: "none",
        }}
      >
        <div>Drones: {drones.length}</div>
        <div>Pedidos: {orders.length}</div>
        <div>Entregas: {deliveries.length}</div>
        <div>Stats: {stats ? "OK" : "nulo"}</div>
      </div>
      <header className="dashboard-header">
        <h1>🚁 Sistema de Entregas por Drones</h1>
        <div className="header-actions">
          <button onClick={handleAssignDeliveries} className="btn btn-primary">
            Atribuir Entregas
          </button>
          <button
            onClick={handleSimulation}
            className={`btn ${isSimulating ? "btn-danger" : "btn-success"}`}
            disabled={!hasDeliveries && !isSimulating}
            title={
              !hasDeliveries && !isSimulating
                ? `Primeiro atribua entregas (Entregas: ${deliveries.length})`
                : ""
            }
          >
            {isSimulating ? "Parar Simulação" : "Iniciar Simulação"}
          </button>
          <button
            onClick={async () => {
              if (
                window.confirm(
                  "Tem certeza que deseja resetar todo o sistema? Isso irá remover todos os drones, pedidos e entregas."
                )
              ) {
                try {
                  await api.resetAll();
                  await loadData();
                  alert("Sistema resetado com sucesso!");
                } catch (error: any) {
                  alert(`Erro ao resetar: ${error.message}`);
                }
              }
            }}
            className="btn btn-secondary"
          >
            Reset
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button
          className={selectedTab === "overview" ? "active" : ""}
          onClick={() => setSelectedTab("overview")}
        >
          Visão Geral
        </button>
        <button
          className={selectedTab === "drones" ? "active" : ""}
          onClick={() => setSelectedTab("drones")}
        >
          Drones ({drones.length})
        </button>
        <button
          className={selectedTab === "orders" ? "active" : ""}
          onClick={() => setSelectedTab("orders")}
        >
          Pedidos ({orders.filter((o) => o.status === "pending").length})
        </button>
        <button
          className={selectedTab === "deliveries" ? "active" : ""}
          onClick={() => setSelectedTab("deliveries")}
        >
          Entregas ({deliveries.length})
        </button>
        <button
          className={selectedTab === "map" ? "active" : ""}
          onClick={() => setSelectedTab("map")}
        >
          Mapa
        </button>
      </nav>

      <main className="dashboard-content">
        {selectedTab === "overview" && (
          <div className="overview">
            <StatsPanel stats={stats} />
            <div className="overview-grid">
              <DroneList drones={drones} compact onDroneCreated={loadData} />
              <OrderList orders={orders} compact onOrderCreated={loadData} />
            </div>
          </div>
        )}
        {selectedTab === "drones" && (
          <DroneList drones={drones} onDroneCreated={loadData} />
        )}
        {selectedTab === "orders" && (
          <OrderList orders={orders} onOrderCreated={loadData} />
        )}
        {selectedTab === "deliveries" && (
          <DeliveryList deliveries={deliveries} />
        )}
        {selectedTab === "map" && (
          <MapView drones={drones} orders={orders} deliveries={deliveries} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
