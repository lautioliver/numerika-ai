import React, { useState } from "react";
import { Card } from "../components/Card";
import { AMN_CARDS } from "../constants/data";
import SimuladorMultas from "../utils/aplicationNumericalMethods";
import AnalizadorEstructura from "../utils/StructuralAnalysis"

// 🚀 MAPEO DE APLICACIONES
// La clave debe coincidir con el id en AMN_CARDS (data.js)
const APLICATION_MAP = {
  "semaforo":    <SimuladorMultas />,
  "estructura":  <AnalizadorEstructura />,
  // "termodinamica": <SimuladorCalor />,  <-- próxima aplicación
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
    const card = AMN_CARDS.find(c => c.id === selectedMethod);

    return (
      <section className="fade-up" style={{ padding: "40px", maxWidth: "940px", margin: "0 auto" }}>
        <div className="register-header">
          <div className="register-eyebrow">Aplicación Práctica · {card?.tag}</div>
          <h1 className="home-title" style={{ fontSize: "36px", marginBottom: "8px" }}>
            {card?.title} <em style={{ color: "var(--teal)" }}>— {card?.type}</em>
          </h1>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 32 }}>
            {card?.body}
          </p>
        </div>

        {APLICATION_MAP[selectedMethod] ? (
          APLICATION_MAP[selectedMethod]
        ) : (
          <div style={{
            textAlign: "center", padding: "48px 20px",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 14,
          }}>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8 }}>
              El motor para <strong>{selectedMethod}</strong> está en desarrollo. 🛠️
            </p>
          </div>
        )}

        <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
          <button
            className="btn-cta outline"
            onClick={() => setSubPage("list")}
          >
            ← Volver al listado
          </button>
        </div>
      </section>
    );
  }

  // --- VISTA LISTA ---
  return (
    <div className="home fade-up">
      <div className="home-eyebrow">Ingeniería Aplicada</div>
      <h1 className="home-title">
        Aplicaciones de <em>Métodos Numéricos</em>
      </h1>
      <div className="cards">
        {AMN_CARDS.map((card) => (
          <Card key={card.id} {...card}>
            <button
              className="btn-cta outline"
              style={{ marginTop: "16px", padding: "8px 18px", fontSize: "9px" }}
              onClick={() => handleSelect(card.id)}
            >
              {APLICATION_MAP[card.id] ? "Abrir simulador →" : "Próximamente"}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};