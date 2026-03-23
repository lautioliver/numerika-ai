import React, { useState } from "react";
import { Card } from "../components/Card";
import { AMN_CARDS } from "../constants/data";
import SimuladorMultas from "../utils/aplicationNumericalMethods"; 

// 🚀 MAPEO DE APLICACIONES: Aquí registras tus nuevos métodos
// La clave (key) debe ser igual al ID que pongas en data.js
const APLICATION_MAP = {
  "semaforo": <SimuladorMultas />,
  // "termodinamica": <SimuladorCalor />, <-- Así de fácil agregarás otros
};

export const Amn = () => { 
  const [subPage, setSubPage] = useState("list"); 
  const [selectedMethod, setSelectedMethod] = useState(null);

  const handleSelect = (id) => {
    setSelectedMethod(id);
    setSubPage("detalle");
  };

  // --- VISTA DETALLE ---
  if (subPage === "detalle") {
    return (
      <section className="fade-up" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
        <div className="register-header">
          <div className="register-eyebrow">Aplicación Práctica</div>
          <h1 className="register-title">Configuración del <em>Método</em></h1>
        </div>
        
        <div className="form-container">
          {/* 🧠 Lógica Escalable: Busca en el mapa si existe el componente */}
          {APLICATION_MAP[selectedMethod] ? (
            APLICATION_MAP[selectedMethod]
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
               <p className="register-subtitle">
                 El motor para "<strong>{selectedMethod}</strong>" todavía está en el taller de ingeniería. 🛠️
               </p>
            </div>
          )}
        </div>

        <button 
          className="btn-submit" 
          onClick={() => setSubPage("list")}
          style={{ marginTop: "30px", maxWidth: "200px", margin: "30px auto 0" }}
        >
          ← Volver al listado
        </button>
      </section>
    );
  }

  // --- VISTA LISTA ---
  return (
    <div className="home fade-up">
      <div className="register-header">
        <div className="register-eyebrow">Ingeniería Urbana</div>
        <h1 className="home-title">Aplicación de <em>Métodos Numéricos</em></h1>
      </div>

      <div className="cards">
        {AMN_CARDS.map((card) => (
          <Card key={card.id} {...card}>
            <button
              className="btn-cta run"            
              style={{ marginTop: "16px", padding: "8px 18px", fontSize: "10px" }}
              onClick={() => handleSelect(card.id)}
            >
              Usar método
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};