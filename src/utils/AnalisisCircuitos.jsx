import React, { useState, useEffect } from "react";
import { resolverGauss } from './systemEquation.js';

// ─── Componente Principal ─────────────────────────────────────────────────────
// Modelo: Análisis de Circuitos por Método de Mallas usando Eliminación de Gauss.
export default function SimuladorCircuitos() {
  // Estado para un sistema de 3 mallas (3x3)
  const [matrix, setMatrix] = useState([
    [10, -5, 0],
    [-5, 20, -5],
    [0, -5, 15]
  ]);
  const [vector, setVector] = useState([12, 0, -6]);

  const [result, setResult] = useState(null);

  const handleMatrixChange = (r, c, val) => {
    setMatrix(prev => {
      const newMat = prev.map(row => [...row]);
      newMat[r][c] = val;
      return newMat;
    });
  };

  const handleVectorChange = (r, val) => {
    setVector(prev => {
      const newVec = [...prev];
      newVec[r] = val;
      return newVec;
    });
  };

  const calcularCorrientes = () => {
    // Validar entradas: si hay algun NaN, no calculamos
    if (matrix.flat().some(isNaN) || vector.some(isNaN)) {
      setResult(null);
      return;
    }

    try {
      // Clonar para evitar mutar el estado en resolverGauss 
      // (aunque resolverGauss hace su propia copia internamente)
      const matCopy = matrix.map(row => [...row]);
      const vecCopy = [...vector];

      const corrientes = resolverGauss(matCopy, vecCopy);

      const reporte = corrientes.map((corriente, index) => {
        return {
          malla: `I${index + 1}`,
          corriente: corriente,
          direccion: corriente >= 0 ? "Horaria" : "Antihoraria"
        };
      });

      setResult({ corrientes: reporte });
    } catch (error) {
      setResult(null);
    }
  };

  useEffect(() => {
    calcularCorrientes();
  }, [matrix, vector]);

  return (
    <div className="sim-container">

      {/* ── Descripción del Método ─────────────────────────────────────────── */}
      <div className="sim-desc-box teal">
        <div className="sim-desc-header">
          <span className="sim-eyebrow">Modelo Matemático</span>
          <span className="sim-tag" style={{ background: "rgba(108,189,181,0.15)", color: "var(--teal)" }}>
            Eliminación de Gauss
          </span>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.8, margin: "10px 0 6px" }}>
          El método de análisis de mallas aplica la <strong>Ley de Voltajes de Kirchhoff (LVK)</strong> a cada trayectoria cerrada del circuito. Esto genera un sistema de ecuaciones lineales de la forma:
        </p>
        <div className="sim-formula-box">
          [R] · [I] = [V]
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7, marginTop: 10 }}>
          Donde <strong>[R]</strong> es la matriz de resistencias (con la diagonal principal positiva y los elementos compartidos negativos), <strong>[I]</strong> es el vector de corrientes de malla (incógnitas) y <strong>[V]</strong> es el vector de fuentes de voltaje independientes. Se resuelve de manera exacta usando <strong>Eliminación de Gauss</strong>.
        </p>
      </div>

      {/* ── Grid Principal ────────────────────────────────────────────────── */}
      <div className="sim-grid">

        {/* ── Panel de Configuración ── */}
        <div className="sim-panel">
          <div className="sim-panel-header">
            <span className="sim-eyebrow">Matriz de Resistencias [R] y Vector [V]</span>
            <span className="sim-tag" style={{ background: "rgba(108,189,181,0.15)", color: "var(--teal)" }}>
              3 Mallas
            </span>
          </div>
          <div style={{ padding: 20 }}>

            {/* Fila 1 */}
            <SectionLabel text="Ecuación Malla 1" />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
              <MatrixInput val={matrix[0][0]} onChange={v => handleMatrixChange(0, 0, v)} varName="I₁" />
              <MatrixInput val={matrix[0][1]} onChange={v => handleMatrixChange(0, 1, v)} varName="I₂" />
              <MatrixInput val={matrix[0][2]} onChange={v => handleMatrixChange(0, 2, v)} varName="I₃" />
              <span style={{ color: "var(--muted)", margin: "0 4px" }}>=</span>
              <MatrixInput val={vector[0]} onChange={v => handleVectorChange(0, v)} varName="V" isResult />
            </div>

            {/* Fila 2 */}
            <SectionLabel text="Ecuación Malla 2" />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
              <MatrixInput val={matrix[1][0]} onChange={v => handleMatrixChange(1, 0, v)} varName="I₁" />
              <MatrixInput val={matrix[1][1]} onChange={v => handleMatrixChange(1, 1, v)} varName="I₂" />
              <MatrixInput val={matrix[1][2]} onChange={v => handleMatrixChange(1, 2, v)} varName="I₃" />
              <span style={{ color: "var(--muted)", margin: "0 4px" }}>=</span>
              <MatrixInput val={vector[1]} onChange={v => handleVectorChange(1, v)} varName="V" isResult />
            </div>

            {/* Fila 3 */}
            <SectionLabel text="Ecuación Malla 3" />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
              <MatrixInput val={matrix[2][0]} onChange={v => handleMatrixChange(2, 0, v)} varName="I₁" />
              <MatrixInput val={matrix[2][1]} onChange={v => handleMatrixChange(2, 1, v)} varName="I₂" />
              <MatrixInput val={matrix[2][2]} onChange={v => handleMatrixChange(2, 2, v)} varName="I₃" />
              <span style={{ color: "var(--muted)", margin: "0 4px" }}>=</span>
              <MatrixInput val={vector[2]} onChange={v => handleVectorChange(2, v)} varName="V" isResult />
            </div>

          </div>
        </div>

        {/* ── Panel de Resultados ── */}
        <div className="sim-panel">
          <div className="sim-panel-header">
            <span className="sim-eyebrow">Corrientes Halladas [I]</span>
            {result && (
              <span style={{ fontSize: 9, color: "var(--muted)", letterSpacing: "1px" }}>
                Gauss · Exacto
              </span>
            )}
          </div>
          <div style={{ padding: 20 }}>
            {!result ? (
              <div className="sim-placeholder">
                <p className="sim-placeholder-text">
                  Completá el sistema para ver las corrientes
                </p>
              </div>
            ) : (
              <>
                {/* Status */}
                <div className="sim-status" style={{
                  background: "rgba(108,189,181,0.1)",
                  border: "1px solid rgba(108,189,181,0.3)",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", flexShrink: 0 }} />
                  <span style={{ color: "var(--teal)", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase" }}>
                    Sistema resuelto con éxito
                  </span>
                </div>

                {/* Métricas de Corrientes */}
                <div className="sim-metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {result.corrientes.map((item, i) => (
                    <Metric
                      key={i}
                      label={`Corriente ${item.malla}`}
                      value={isNaN(item.corriente) ? "NaN" : `${item.corriente.toFixed(4)} A`}
                      highlight={i === 0}
                    />
                  ))}
                </div>

                <div className="sim-divider" style={{ margin: "24px 0" }} />

                {/* Tabla Detallada */}
                <div style={{ marginBottom: 10 }}>
                  <span className="sim-eyebrow">Interpretación Física</span>
                </div>
                <div className="sim-table-wrap">
                  <table className="sim-table">
                    <thead>
                      <tr>
                        <th>Malla</th>
                        <th>Corriente (A)</th>
                        <th>Dirección Efectiva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.corrientes.map((item, i) => (
                        <tr key={i} style={{ background: "transparent" }}>
                          <td style={{ fontWeight: 500 }}>{item.malla}</td>
                          <td>{isNaN(item.corriente) ? "Indefinida" : `${item.corriente} A`}</td>
                          <td style={{ color: item.corriente >= 0 ? "var(--teal)" : "#d4a84b" }}>
                            {isNaN(item.corriente) ? "—" : item.direccion}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Insight */}
                <div className="sim-ai-box" style={{ marginTop: 24 }}>
                  <div className="sim-ai-label">
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--teal)", display: "inline-block", marginRight: 6 }} />
                    Conclusión Circuital
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
                    Las corrientes con signo negativo (<strong>Antihoraria</strong>) indican que el sentido real del flujo de electrones es opuesto al asumido originalmente al trazar las mallas.
                    El método de <strong>Eliminación de Gauss</strong> nos permite deducir la magnitud y fase exacta de todo el sistema en un solo pase.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────
function SectionLabel({ text }) {
  return (
    <div className="sim-section-label" style={{ marginBottom: "12px", color: "var(--text)" }}>
      {text}
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`sim-metric ${highlight ? 'highlight' : ''}`} style={{
      background: highlight ? "rgba(108,189,181,0.05)" : "var(--surface-hover)",
      padding: "16px",
      borderRadius: "12px",
      border: highlight ? "1px solid rgba(108,189,181,0.2)" : "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    }}>
      <div className="sim-metric-label" style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div className="sim-metric-val" style={{ fontSize: "20px", fontWeight: "600", fontFamily: "'DM Mono', monospace", color: highlight ? "var(--teal)" : "var(--text)" }}>{value}</div>
    </div>
  );
}

function MatrixInput({ val, onChange, varName, isResult }) {
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <input
        type="number"
        className="sim-field-input"
        value={val === '' || isNaN(val) ? '' : val}
        style={{
          width: '100%',
          padding: '8px 12px',
          paddingRight: '28px',
          textAlign: 'right',
          background: isResult ? "rgba(220,180,100,0.05)" : "var(--surface)",
          border: isResult ? "1px solid rgba(220,180,100,0.3)" : "1px solid var(--border)",
        }}
        onChange={e => {
          const raw = e.target.value;
          onChange(raw === '' ? '' : Number(raw));
        }}
      />
      <span style={{
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '11px',
        color: isResult ? "#d4a84b" : "var(--muted)",
        pointerEvents: 'none'
      }}>
        {varName}
      </span>
    </div>
  );
}