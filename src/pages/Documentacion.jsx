import React from "react";
import { Card } from "../components/Card";
import { DOCS_CARDS, HOME_CARDS } from "../constants/data";

export function Docs({ onPageChange, onMethodSelect }) {
    return (console.log("Renderizando Docs src/docs.jsx")), (
      <div className="home fade-up">
        <h1 className="home-title">
            Documentación<br />
            <em>Próximamente...</em>
        </h1>
        <div className="cards">
        {DOCS_CARDS.map((card, idx) => (
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
        <button className="btn-cta" onClick={() => onPageChange("solver")}>
          Abrir Solver
        </button>
        <button className="btn-cta outline" onClick={() => onPageChange("metodos")}>
          Ver métodos
        </button>
        </div>
              <div className="home-empty">
            <p>
                    
            </p>
            
        </div>
        
        </div>
    )
};