import { useState, useCallback } from "react";

const C = {
  cream: "#E3DFBA",
  sage: "#C8D6BF",
  tealLt: "#93CCC6",
  teal: "#6CBDB5",
  dark: "#1A1F1E",
  bg: "#f5f3e8",
  surface: "#faf9f2",
  border: "#dddbc8",
  muted: "#7a8a82",
  text: "#1A1F1E",
};

/**
 * Field — Input validado para expresiones matemáticas.
 * 
 * Características:
 * - Máximo 200 caracteres
 * - Whitelist de caracteres permitidos: x, números, operadores, funciones math
 * - Visual feedback (border color) en focus
 * - Hint text opcional
 * 
 * @param {Object} props
 * @param {string} props.label - Etiqueta del input
 * @param {string} props.value - Valor actual
 * @param {Function} props.onChange - Callback cuando cambia el valor
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.hint] - Texto de ayuda debajo
 */
export function Field({ label, value, onChange, placeholder, hint }) {
  const [f, setF] = useState(false);

  // Validar input - solo permitir caracteres seguros
  const validateInput = useCallback((newValue) => {
    if (!newValue || newValue.length > 200) return false;
    // Permitir: x, dígitos, operadores, paréntesis, espacios, letras (para funciones)
    return /^[x\d\+\-\*\/\(\)\^\.\s\w]*$/.test(newValue);
  }, []);

  // Handle cambio con validación
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    if (validateInput(newValue)) {
      onChange(newValue);
    }
  }, [onChange, validateInput]);

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 9,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        maxLength={200}
        style={{
          width: "100%",
          background: C.bg,
          border: `1px solid ${f ? C.teal : C.border}`,
          borderRadius: 8,
          padding: "9px 12px",
          fontFamily: "'DM Mono',monospace",
          fontSize: 13,
          color: C.dark,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
      />
      {hint && (
        <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }} title={hint}>
          {hint}
        </div>
      )}
    </div>
  );
}
