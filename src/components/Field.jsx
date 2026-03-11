import { useState } from "react";

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

export function Field({ label, value, onChange, placeholder, hint }) {
  const [f, setF] = useState(false);

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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
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
        <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
