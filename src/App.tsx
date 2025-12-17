import React, { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [serverStatus, setServerStatus] = useState("Verificando...");

  useEffect(() => {
    fetch("http://localhost:3001/health")
      .then((r) => r.json())
      .then(() => setServerStatus("✅ Servidor OK"))
      .catch(() => setServerStatus("❌ Servidor offline"));
  }, []);

  return (
    <div>
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          padding: "10px",
          background: "#333",
          color: "#fff",
          zIndex: 9999,
        }}
      >
        {serverStatus}
      </div>
      <Dashboard />
    </div>
  );
}

export default App;
