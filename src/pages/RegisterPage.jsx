import React, { useState } from "react";

export const RegisterPage = ({ onPageChange, onMethodSelect }) => {
  // 1. ESTADOS
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    institution: "",
    role: "student",
    acceptTerms: false,
    newsEmail: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false); // ✅ CORREGIDO: useState

  // 2. FUNCIONES AUXILIARES DE CONTRASEÑA
  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength === 1) return "Débil";
    if (passwordStrength <= 2) return "Media";
    return "Fuerte";
  };

  const getPasswordStrengthClass = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength === 1) return "weak";
    if (passwordStrength <= 2) return "medium";
    return "strong";
  };

  // 3. MANEJO DE CAMBIOS
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // 4. VALIDACIÓN
  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "El nombre es requerido";
    if (!formData.lastName.trim()) newErrors.lastName = "El apellido es requerido";
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 8) {
      newErrors.password = "Mínimo 8 caracteres";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "Debes aceptar los términos";
    }
    return newErrors;
  };

  // 5. ENVÍO REAL A LA BASE DE DATOS
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('https://numerika-ai.vercel.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setLoading(false);
        setSuccess(true);
      } else {
        setLoading(false);
        alert(data.error || "Error al registrar");
      }
    } catch (error) {
      setLoading(false);
      console.error("Error de conexión:", error);
      alert("No se pudo conectar con el servidor backend.");
    }
  };

  // 6. RENDERIZADO DE ÉXITO
  if (success) {
    return (
      <div className="register fade-up">
        <div className="register-success">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className="success-title">¡Bienvenido a NumérikaAI!</h2>
          <p className="success-message">
            Tu cuenta ha sido creada exitosamente.
          </p>
          <button className="btn-cta" onClick={() => onPageChange("home")} style={{ margin: "0 auto" }}>
            Ir a Inicio
          </button>
        </div>
      </div>
    );
  }

  // 7. RENDERIZADO DEL FORMULARIO
  return (
    <>
      {/* CAPA 1: El contenido de la página (Registro) */}
      <div className="register fade-up">
        <div className="register-header">
          <div className="register-eyebrow">Únete a la comunidad</div>
          <h1 className="register-title">Crear <em>cuenta</em></h1>
          <p className="register-subtitle">Disfruta de una experiencia distinta para aprender.</p>
        </div>

        <form onSubmit={handleSubmit} className={`form-container ${loading ? "loading" : ""}`}>
          <div className="form-section">
            <div className="form-section-title">Datos Personales</div>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Nombre</label>
                <input type="text" name="firstName" className="form-input" placeholder="Juan" value={formData.firstName} onChange={handleChange} />
                {errors.firstName && <div className="form-hint error">{errors.firstName}</div>}
              </div>
              <div className="form-field">
                <label className="form-label">Apellido</label>
                <input type="text" name="lastName" className="form-input" placeholder="Pérez" value={formData.lastName} onChange={handleChange} />
                {errors.lastName && <div className="form-hint error">{errors.lastName}</div>}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Email</label>
              <input type="email" name="email" className="form-input" placeholder="juan@example.com" value={formData.email} onChange={handleChange} />
              {errors.email && <div className="form-hint error">{errors.email}</div>}
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Institución</div>
            <div className="form-field">
              <label className="form-label">Universidad / Institución</label>
              <input type="text" name="institution" className="form-input" placeholder="Ej: UCASAL" value={formData.institution} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label">¿Cuál es tu rol?</label>
              <select name="role" className="form-select" value={formData.role} onChange={handleChange}>
                <option value="student">Estudiante</option>
                <option value="teacher">Docente</option>
                <option value="professional">Profesional</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Seguridad</div>
            <div className="form-field">
              <label className="form-label">Contraseña</label>
              <input type="password" name="password" className="form-input" placeholder="••••••••" value={formData.password} onChange={handleChange} />
              {formData.password && (
                <>
                  <div className="password-strength">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`strength-bar ${i <= passwordStrength ? getPasswordStrengthClass() : ""}`} />
                    ))}
                  </div>
                  <div className={`password-strength-label ${getPasswordStrengthClass()}`}>
                    Fortaleza: {getPasswordStrengthLabel()}
                  </div>
                </>
              )}
              {errors.password && <div className="form-hint error">{errors.password}</div>}
            </div>
            <div className="form-field">
              <label className="form-label">Confirmar Contraseña</label>
              <input type="password" name="confirmPassword" className="form-input" placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
              {errors.confirmPassword && <div className="form-hint error">{errors.confirmPassword}</div>}
            </div>
          </div>

          <div className="checkbox-group">
            <div className="checkbox-item">
              <input type="checkbox" id="acceptTerms" name="acceptTerms" checked={formData.acceptTerms} onChange={handleChange} />
              <label htmlFor="acceptTerms">
                Acepto los <span 
                  onClick={() => setShowTermsModal(true)} 
                  style={{ color: "var(--teal)", cursor: "pointer", textDecoration: "underline" }}
                >
                  términos y condiciones
                </span>
              </label>
            </div>
            {errors.acceptTerms && <div className="form-hint error">{errors.acceptTerms}</div>}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? <span className="spinner"></span> : "Crear Cuenta"}
          </button>

          <div className="form-footer">
            <span>¿Ya tenés cuenta?</span>
            <a href="#login" onClick={(e) => { e.preventDefault(); onPageChange("login"); }}>Inicia sesión</a>
          </div>
        </form>
      </div>

      {/* CAPA 2: El Modal (Afuera del div .register para que el blur sea total) */}
      {showTermsModal && (
        <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Términos y Condiciones</h3>
              <button className="close-modal" onClick={() => setShowTermsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <h4>1. Propósito Educativo</h4>
              <p>NumérikaAI es una herramienta diseñada con fines académicos. Los resultados deben ser verificados por el usuario.</p>
              <h4>2. Privacidad</h4>
              <p>Tus datos se utilizan únicamente para mejorar la plataforma. No compartimos información con terceros.</p>
              <h4>3. Responsabilidad</h4>
              <p>El uso de los resultados en entornos profesionales o exámenes es responsabilidad exclusiva del usuario.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-submit" 
                onClick={() => {
                  setFormData(prev => ({ ...prev, acceptTerms: true })); // Marcamos el check automáticamente
                  setShowTermsModal(false);
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RegisterPage;