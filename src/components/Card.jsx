import React from "react";

/**
 * Card — Componente reutilizable para tarjetas informativas.
 * 
 * Utilizado para mostrar visión, misión, propuesta de valor y usuario objetivo.
 * Soporta diferentes estilos (vision, mision, valor, usuario).
 * 
 * @param {Object} props
 * @param {string} props.type - Tipo de tarjeta (vision, mision, valor, usuario)
 * @param {string} props.tag - Etiqueta pequeña (ej: "Visión")
 * @param {string} props.title - Título principal
 * @param {string} props.body - Contenido descriptivo
 * @param {React.ReactNode} [props.children] - Elementos adicionales (ej: botón)
 * 
 * @example
 * <Card 
 *   type="vision"
 *   tag="Visión"
 *   title="Referente latinoamericano"
 *   body="Ser la plataforma de referencia..."
 * />
 */
export const Card = ({ type, tag, title, body, children }) => {
  return (
    <div className={`card ${type}`}>
      <div className="card-tag">{tag}</div>
      <div className="card-title">{title}</div>
      <p className="card-body">{body}</p>
      {children}
    </div>
  );
};
