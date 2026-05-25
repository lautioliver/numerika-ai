/**
 * Botón unificado para abrir visualización 3D en componentes EDO.
 */
export function Plot3DTrigger({ onClick, id, className = "" }) {
  return (
    <button
      type="button"
      className={`plot3d-trigger-btn ${className}`.trim()}
      onClick={onClick}
      id={id}
      title="Abrir visualización interactiva en tres dimensiones"
    >
      <span className="plot3d-trigger-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </span>
      <span className="plot3d-trigger-label">Ver en 3D</span>
    </button>
  );
}
