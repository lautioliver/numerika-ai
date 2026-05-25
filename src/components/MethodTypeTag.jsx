import React from "react";

const TYPE_STYLES = {
  cerrado: {
    color: "var(--teal)",
    background: "rgba(108,189,181,0.1)",
    border: "rgba(108,189,181,0.3)",
    label: "cerrado",
  },
  abierto: {
    color: "#6a8a6a",
    background: "rgba(200,214,191,0.15)",
    border: "rgba(200,214,191,0.4)",
    label: "abierto",
  },
  "lineal-directo": {
    color: "#5a7a9a",
    background: "rgba(90,122,154,0.12)",
    border: "rgba(90,122,154,0.35)",
    label: "directo",
  },
  "lineal-iterativo": {
    color: "#8a6a9a",
    background: "rgba(138,106,154,0.12)",
    border: "rgba(138,106,154,0.35)",
    label: "iterativo",
  },
};

export const MethodTypeTag = ({ type }) => {
  const t = TYPE_STYLES[type] || TYPE_STYLES.abierto;
  const styles = {
    fontSize: "9px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: t.color,
    background: t.background,
    border: `1px solid ${t.border}`,
    padding: "3px 10px",
    borderRadius: "20px",
  };

  return <span style={styles}>{t.label}</span>;
};
