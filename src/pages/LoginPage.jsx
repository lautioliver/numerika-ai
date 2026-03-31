import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(formData.email, formData.password);
      navigate("/");
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register fade-up">
      <div className="register-header">
        <div className="register-eyebrow">Bienvenido de vuelta</div>
        <h1 className="register-title">Inicia <em>sesión</em></h1>
        <p className="register-subtitle">Ingresá a tu cuenta de NumérikaAI.</p>
      </div>

      <form onSubmit={handleSubmit} className={`form-container ${loading ? "loading" : ""}`}>
        <div className="form-section">
          <div className="form-field">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              name="email" 
              className="form-input" 
              placeholder="tu@email.com" 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div className="form-field">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              name="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={formData.password} 
              onChange={handleChange} 
              required 
            />
          </div>

          {error && <div className="form-hint error" style={{ textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        </div>

        <button type="submit" className="btn-submit" disabled={loading}>
          {loading ? <span className="spinner"></span> : "Entrar"}
        </button>

        <div className="form-footer">
          <span>¿No tenés cuenta?</span>
          <a href="/register" onClick={(e) => { e.preventDefault(); navigate("/register"); }}>Regístrate</a>
        </div>
      </form>
    </div>
  );
};