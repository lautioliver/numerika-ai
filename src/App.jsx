import { useState, useEffect } from "react";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/HomePage";
import { SolverPage } from "./pages/SolverPage";
import { MethodsPage } from "./pages/MethodsPage";
import { Amn } from "./pages/Amn";
import { Documentacion } from "./pages/Documentacion";
import { RegisterPage } from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage"; // Chequeá si es loginPage o LoginPage

// Import styles
import "./styles/globals.css";
import "./styles/nav.css";
import "./styles/cards.css";
import "./styles/buttons.css";
import "./styles/home.css";
import "./styles/solver.css";
import "./styles/footer.css";
import "./styles/auth.css";

export default function NumerikaApp() {
  // 1. ESTADOS
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null); // <-- AGREGAMOS ESTADO DE USUARIO
  const [activeMethod, setActiveMethod] = useState("biseccion");
  const [calculated, setCalculated] = useState(false);
  const [funcExpr, setFuncExpr] = useState("x^2 - x - 2");

  // PERSISTENCIA: Revisar si hay usuario al cargar la app
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 2. FUNCIONES DE MANEJO
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    setPage("home");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setPage("home");
  };

  // 3. RENDERIZADO
  return (
    <div className="app">
      {/* Pasamos el usuario a la Navigation para que pueda saludarlo */}
      <Navigation 
        currentPage={page} 
        onPageChange={handlePageChange} 
        user={user} 
        onLogout={handleLogout}
      />

      <main>
        {page === "home" && <HomePage onPageChange={handlePageChange} />}

        {page === "solver" && (
          <SolverPage
            activeMethod={activeMethod}
            setActiveMethod={setActiveMethod}
            calculated={calculated}
            onCalculate={() => setCalculated(true)}
            funcExpr={funcExpr}
            onFuncChange={(expr) => { setFuncExpr(expr); setCalculated(false); }}
            
          />
        )}

        {page === "metodos" && (
          <MethodsPage
            onMethodSelect={setActiveMethod}
            onPageChange={handlePageChange}
            funcExpr={funcExpr}
          />
        )}

        {page === "amn" && 
          <Amn 
            
          />
        }
        {page === "docs" && 
        <Documentacion 
          onPageChange={setPage} 
        />
        }

        {/* --- CORRECCIÓN DE RUTAS --- */}
        {page === "register" && (
          <RegisterPage 
          onPageChange={handlePageChange} 
          id="Register"
          />
        )}

        {page === "login" && (
          <LoginPage 
            onPageChange={handlePageChange} 
            onLoginSuccess={handleLoginSuccess}
            
          />
        )}
      </main>  
  
    </div>
  );
}