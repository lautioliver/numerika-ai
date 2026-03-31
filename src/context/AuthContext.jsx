import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL;

/**
 * AuthProvider — Maneja el estado de autenticación de toda la app.
 * 
 * Flujo:
 * 1. Al montar, busca un token JWT en localStorage
 * 2. Si existe, lo valida contra /api/auth/me
 * 3. Si es válido, guarda el usuario en el estado
 * 4. Si no es válido (expirado, etc.), limpia el token
 * 
 * Expone: user, token, loading, login(), register(), logout()
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // ── Al montar: validar token existente ───────────────────────────────────
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    validateToken(token);
  }, []);

  async function validateToken(savedToken) {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
      } else {
        // Token inválido o expirado
        clearAuth();
      }
    } catch {
      // Error de red — mantener el token por si vuelve la conexión
      // pero no setear user para que no se muestre info incorrecta
      console.warn("No se pudo validar el token. Verificá la conexión.");
    } finally {
      setLoading(false);
    }
  }

  // ── Login ────────────────────────────────────────────────────────────────
  async function login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Credenciales incorrectas");
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("token", data.token);

    return data;
  }

  // ── Register ─────────────────────────────────────────────────────────────
  async function register(formData) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Error al registrar");
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("token", data.token);

    return data;
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  function logout() {
    clearAuth();
  }

  function clearAuth() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  }

  // ── Helper para hacer fetch autenticados ─────────────────────────────────
  /** 
   * Wrapper de fetch que agrega el header Authorization automáticamente.
   * Usalo para endpoints protegidos: authFetch('/api/calculations')
   */
  async function authFetch(url, options = {}) {
    if (!token) throw new Error("No hay sesión activa");

    const res = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    // Si el token expiró, limpiar sesión
    if (res.status === 401) {
      clearAuth();
      throw new Error("Sesión expirada. Iniciá sesión nuevamente.");
    }

    return res;
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    authFetch,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de autenticación.
 * @example
 * const { user, login, logout, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
