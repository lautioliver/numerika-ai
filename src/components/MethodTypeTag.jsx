import React from "react";

export const MethodTypeTag = ({ type }) => {
  const styles = {
    fontSize: "9px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: type === "cerrado" ? "var(--teal)" : "#6a8a6a",
    background: type === "cerrado" ? "rgba(108,189,181,0.1)" : "rgba(200,214,191,0.15)",
    border: `1px solid ${type === "cerrado" ? "rgba(108,189,181,0.3)" : "rgba(200,214,191,0.4)"}`,
    padding: "3px 10px",
    borderRadius: "20px",
  };

  return <span style={styles}>{type}</span>;
};
