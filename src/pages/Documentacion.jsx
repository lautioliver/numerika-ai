import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { DOCS_CARDS } from "../constants/data";

export function Documentacion() {
  const navigate = useNavigate();

  return (
    <div className="home fade-up">
      <h1 className="home-title">
        Documentación<br />
        <em>Próximamente...</em>
      </h1>
      <div className="cards">
        {DOCS_CARDS.map((card) => (
          <Card
            key={card.id}
            type={card.type}
            tag={card.tag}
            title={card.title}
            body={card.body}
          />
        ))}
      </div>
      <div className="cta-row">
        <button className="btn-cta" onClick={() => navigate("/solver")}>
          Abrir Solver
        </button>
        <button className="btn-cta outline" onClick={() => navigate("/metodos")}>
          Ver métodos
        </button>
      </div>
    </div>
  );
}