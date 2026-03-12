import { useState, useEffect } from "react";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/HomePage";
import { SolverPage } from "./pages/SolverPage";
import { MethodsPage } from "./pages/MethodsPage";

// Import styles
import "./styles/globals.css";
import "./styles/nav.css";
import "./styles/cards.css";
import "./styles/buttons.css";
import "./styles/home.css";
import "./styles/solver.css";
import "./styles/footer.css";

export default function NumerikaApp() {
  const [page, setPage] = useState("home");
  const [activeMethod, setActiveMethod] = useState("biseccion");
  const [calculated, setCalculated] = useState(false);
  const [funcExpr, setFuncExpr] = useState("x^2 - x - 2"); // ← AGREGAR

  useEffect(() => {
    const handleMethodChange = (e) => {
      setActiveMethod(e.detail.methodId);
    };

    window.addEventListener("methodChange", handleMethodChange);
    return () => window.removeEventListener("methodChange", handleMethodChange);
  }, []);

  return (
    <div className="app">
      <Navigation currentPage={page} onPageChange={setPage} />

      {page === "home" && <HomePage onPageChange={setPage} />}

      {page === "solver" && (
        <SolverPage
          activeMethod={activeMethod}
          setActiveMethod={setActiveMethod}
          calculated={calculated}
          onCalculate={() => setCalculated(true)}
          funcExpr={funcExpr}           // ← Agregado 12/03
          onFuncChange={setFuncExpr}    // ← Agregado 12/03
        />
      )}

      {page === "metodos" && (
        <MethodsPage
          onMethodSelect={setActiveMethod}
          onPageChange={setPage}
          funcExpr={funcExpr}    // ← Agregado 12/03
        />
      )}

      <Footer />
    </div>
  );
}