import { Routes, Route, Navigate } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { HomePage } from "./pages/HomePage";
import { SolverPage } from "./pages/SolverPage";
import { ComparisonPage } from "./pages/ComparisonPage";
import { MethodsPage } from "./pages/MethodsPage";
import { Amn } from "./pages/Amn";
// import { Documentacion } from "./pages/Documentacion"; // Ruta deshabilitada
import { RegisterPage } from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import { useAuth } from "./context/AuthContext";
import { IkaWidget } from "./components/IkaWidget";

// Import styles
import "./styles/globals.css";
import "./styles/nav.css";
import "./styles/cards.css";
import "./styles/buttons.css";
import "./styles/home.css";
import "./styles/solver.css";
import "./styles/simulators.css";
import "./styles/comparison.css";
import "./styles/footer.css";
import "./styles/auth.css";
import "./styles/ika.css";

export default function NumerikaApp() {
  const { loading } = useAuth();

  // Mostrar nada mientras se valida el token
  // (evita flash de UI no-autenticada si el usuario ya tiene sesión)
  if (loading) {
    return (
      <div className="app" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh"
      }}>
        <div style={{
          fontSize: "10px",
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: "var(--muted)"
        }}>
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Navigation />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/solver" element={<SolverPage />} />
          <Route path="/solver/:methodId" element={<SolverPage />} />

          <Route path="/comparar" element={<ComparisonPage />} />

          <Route path="/metodos" element={<MethodsPage />} />

          <Route path="/aplicaciones" element={<Amn />} />
          <Route path="/aplicaciones/:appId" element={<Amn />} />

          {/* <Route path="/docs" element={<Documentacion />} /> */}

          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Redirigir rutas desconocidas al home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <IkaWidget />
    </div>
  );
}