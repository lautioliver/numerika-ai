import React from "react";
import { Card } from "../components/Card";
import { METHODS_DETAILS } from "../constants/data";

export const MethodsPage = ({ onMethodSelect, onPageChange }) => {
  return (
    <div className="home fade-up">
      <div className="home-eyebrow">Métodos disponibles</div>
      <h1 className="home-title" style={{ fontSize: "36px", marginBottom: "32px" }}>
        Cerrados <em>& abiertos.</em>
      </h1>
      <div className="cards">
        {METHODS_DETAILS.map((m) => (
          <Card
            key={m.id}
            type={m.type === "cerrado" ? "vision" : "mision"}
            tag={m.type}
            title={m.name}
            body={m.desc}
          >
            <button
              className="btn-cta outline"
              style={{ marginTop: "16px", padding: "8px 18px", fontSize: "9px" }}
              onClick={() => {
                onMethodSelect(m.id);
                onPageChange("solver");
              }}
            >
              Usar método
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};
