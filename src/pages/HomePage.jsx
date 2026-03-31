import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { HOME_CARDS } from "../constants/data";

export const HomePage = () => {
  const navigate = useNavigate();

  const methodsList = [
    ["Bisección", "cerrado"],
    ["Regla Falsa", "cerrado"],
    ["Newton-Raphson", "abierto"],
    ["Secante", "abierto"],
    ["Punto Fijo", "abierto"],
  ];

  return (
    <div className="home fade-up">
      <div className="home-eyebrow">Análisis numérico · IA</div>
      <h1 className="home-title">
        Métodos numéricos<br />
        <em>que se entienden.</em>
      </h1>

      <div className="cards">
        {HOME_CARDS.map((card) => (
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

      <div className="methods-strip">
        <span className="methods-label">Métodos</span>
        {methodsList.map(([n, t]) => (
          <span key={n} className={`method-chip ${t}`}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
};
