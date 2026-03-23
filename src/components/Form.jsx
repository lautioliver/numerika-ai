import React, { useState } from "react";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTES REUTILIZABLES PARA FORMULARIOS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * FormField - Campo de formulario genérico
 * @param {string} label - Etiqueta del campo
 * @param {string} name - Nombre del input
 * @param {string} type - Tipo de input
 * @param {string} value - Valor actual
 * @param {function} onChange - Callback al cambiar
 * @param {string} placeholder - Placeholder
 * @param {string} error - Mensaje de error
 * @param {string} hint - Hint informativo
 * @param {boolean} required - Es requerido
 */
export const FormField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  icon = null,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`form-field ${error ? "has-error" : ""} ${icon ? "has-icon" : ""}`}>
      <label className="form-label">
        {label}
        {required && <span style={{ color: "var(--teal)" }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          name={name}
          className={`form-input ${error ? "invalid" : focused ? "valid" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
        />
        {icon && <span className="field-icon">{icon}</span>}
      </div>
      {error && <div className="form-hint error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
};

/**
 * FormCheckbox - Checkbox personalizado
 */
export const FormCheckbox = ({
  id,
  name,
  label,
  checked,
  onChange,
  required = false,
}) => (
  <div className="checkbox-item">
    <input
      type="checkbox"
      id={id || name}
      name={name}
      checked={checked}
      onChange={onChange}
    />
    <label htmlFor={id || name}>
      {label}
      {required && <span style={{ color: "var(--teal)" }}>*</span>}
    </label>
  </div>
);

/**
 * FormSelect - Select personalizado
 */
export const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  hint,
  required = false,
  disabled = false,
}) => (
  <div className="form-field">
    <label className="form-label">
      {label}
      {required && <span style={{ color: "var(--teal)" }}>*</span>}
    </label>
    <select
      name={name}
      className="form-select"
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <div className="form-hint error">{error}</div>}
    {hint && !error && <div className="form-hint">{hint}</div>}
  </div>
);

/**
 * PasswordStrength - Indicador de fortaleza de contraseña
 */
export const PasswordStrength = ({ password }) => {
  const checkStrength = (pwd) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*]/.test(pwd)) strength++;
    return strength;
  };

  const strength = checkStrength(password);

  const getLabel = () => {
    if (strength === 0) return "";
    if (strength === 1) return "Débil";
    if (strength <= 2) return "Media";
    return "Fuerte";
  };

  const getClass = () => {
    if (strength === 0) return "";
    if (strength === 1) return "weak";
    if (strength <= 2) return "medium";
    return "strong";
  };

  if (!password) return null;

  return (
    <>
      <div className="password-strength">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`strength-bar ${i <= strength ? getClass() : ""}`}
          />
        ))}
      </div>
      <div className={`password-strength-label ${getClass()}`}>
        Fortaleza: {getLabel()}
      </div>
    </>
  );
};

/**
 * StatusMessage - Mensaje de estado (error, success, info)
 */
export const StatusMessage = ({ type = "info", message, icon = null }) => {
  const iconMap = {
    error: "⚠",
    success: "✓",
    info: "ℹ",
  };

  return (
    <div className={`status-message ${type}`}>
      <div className="status-message-icon">
        {icon || iconMap[type]}
      </div>
      <div>{message}</div>
    </div>
  );
};

/**
 * FormSection - Sección del formulario con título
 */
export const FormSection = ({ title, children }) => (
  <div className="form-section">
    {title && <div className="form-section-title">{title}</div>}
    {children}
  </div>
);

/**
 * FormRow - Dos campos lado a lado
 */
export const FormRow = ({ children }) => (
  <div className="form-row">
    {children}
  </div>
);

/**
 * TermsBox - Caja de términos y condiciones
 */
export const TermsBox = ({ children }) => (
  <div className="terms-box">
    {children}
  </div>
);

/**
 * SocialAuthButtons - Botones de autenticación social
 */
export const SocialAuthButtons = () => (
  <>
    <div className="form-divider">
      <span>o registrate con</span>
    </div>
    <div className="social-auth">
      <button type="button" className="social-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
        Google
      </button>
      <button type="button" className="social-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V21" />
        </svg>
        Github
      </button>
    </div>
  </>
);

/**
 * SuccessState - Estado de éxito
 */
export const SuccessState = ({ title, message, onContinue, buttonText = "Continuar" }) => (
  <div className="register-success">
    <div className="success-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h2 className="success-title">{title}</h2>
    <p className="success-message">{message}</p>
    <button
      className="btn-cta"
      onClick={onContinue}
      style={{ margin: "0 auto" }}
    >
      {buttonText}
    </button>
  </div>
);

/**
 * FormHeader - Header del formulario
 */
export const FormHeader = ({ eyebrow, title, subtitle }) => (
  <div className="register-header">
    <div className="register-eyebrow">{eyebrow}</div>
    <h1 className="register-title">{title}</h1>
    {subtitle && <p className="register-subtitle">{subtitle}</p>}
  </div>
);

/**
 * FormFooter - Footer del formulario (links)
 */
export const FormFooter = ({ text, linkText, onLinkClick }) => (
  <div className="form-footer">
    <span>{text}</span>
    <a href="#" onClick={(e) => {
      e.preventDefault();
      onLinkClick();
    }}>
      {linkText}
    </a>
  </div>
);

/**
 * PasswordInput - Input de contraseña con toggle
 */
export const PasswordInput = ({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required = false,
  showStrength = true,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="form-field has-icon">
        <label className="form-label">
          {label}
          {required && <span style={{ color: "var(--teal)" }}>*</span>}
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            name={name}
            className={`form-input ${error ? "invalid" : ""}`}
            placeholder="••••••••"
            value={value}
            onChange={onChange}
          />
          <button
            type="button"
            className="field-icon"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "14px",
              right: "10px",
              top: "32px",
            }}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
        {showStrength && <PasswordStrength password={value} />}
        {error && <div className="form-hint error">{error}</div>}
        {hint && !error && <div className="form-hint">{hint}</div>}
      </div>
    </>
  );
};

/**
 * EmailInput - Input de email con validación visual
 */
export const EmailInput = ({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required = false,
}) => {
  const isValid = value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  return (
    <FormField
      label={label}
      name={name}
      type="email"
      value={value}
      onChange={onChange}
      error={error}
      hint={hint}
      required={required}
      icon={isValid ? "✓" : null}
    />
  );
};

/**
 * Ejemplo de uso:
 * 
 * import {
 *   FormField,
 *   FormCheckbox,
 *   FormSelect,
 *   PasswordStrength,
 *   StatusMessage,
 *   FormSection,
 *   SuccessState,
 *   FormHeader,
 *   SocialAuthButtons,
 * } from "./components/FormComponents";
 * 
 * export const MyForm = () => {
 *   const [formData, setFormData] = useState({...});
 *   const [errors, setErrors] = useState({});
 * 
 *   return (
 *     <div className="register">
 *       <FormHeader
 *         eyebrow="Crear cuenta"
 *         title="Únete a nosotros"
 *         subtitle="Acceso gratuito a todas las herramientas"
 *       />
 * 
 *       <form className="form-container">
 *         <FormSection title="Datos Personales">
 *           <FormRow>
 *             <FormField
 *               label="Nombre"
 *               name="firstName"
 *               value={formData.firstName}
 *               onChange={handleChange}
 *               error={errors.firstName}
 *             />
 *             <FormField
 *               label="Apellido"
 *               name="lastName"
 *               value={formData.lastName}
 *               onChange={handleChange}
 *             />
 *           </FormRow>
 *         </FormSection>
 * 
 *         <FormSection title="Seguridad">
 *           <PasswordInput
 *             label="Contraseña"
 *             name="password"
 *             value={formData.password}
 *             onChange={handleChange}
 *             showStrength={true}
 *           />
 *         </FormSection>
 * 
 *         <button type="submit" className="btn-submit">
 *           Enviar
 *         </button>
 *       </form>
 * 
 *       <SocialAuthButtons />
 *     </div>
 *   );
 * };
 */