import React from "react";
import { Card } from "../components/Card";
import { ALPLICATION_METHODS, AMN_CARDS, DOCS_CARDS, HOME_CARDS} from "../constants/data";

export const Amn = ({ onPageChange, onMethodSelect }) => { 
    return (console.log("Renderizando AMN src/Amn.jsx")), (
    <div className="home fade-up">
        <h1 className="home-title">
            Aplicación de Métodos Numéricos<br />
        </h1>
    <div className="cards">
    {AMN_CARDS.map((card, idx) => (
        <Card
            key={card.id}
            type={card.type}
            tag={card.tag}
            title={card.title}
            body={card.body}
        >
            <button
                className="btn-cta run"            
                style={{ marginTop: "16px", padding: "8px 18px", fontSize: "9px" }}
                onClick={() => {
                onMethodSelect(m.id);
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
