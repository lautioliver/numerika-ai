import js from "@eslint/js";
import json from "@eslint/json";
import css from "@eslint/css";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  {
    // 1. ARCHIVOS A IGNORAR (Esto quitará el error del package-lock)
    ignores: [
      "node_modules/", 
      "dist/", 
      "build/", 
      "package-lock.json", 
      "*.min.js"
    ]
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
  { 
    files: ["**/*.json"], 
    plugins: { json }, 
    language: "json/json", 
    // Quitamos la recomendación estricta para evitar errores en archivos generados
    rules: { "json/no-empty-keys": "off" } 
  },
  { 
    files: ["**/*.css"], 
    plugins: { css }, 
    language: "css/css", 
    rules: {
      // Desactivamos la validación de variables para que no moleste con --dark, --teal, etc.
      "css/no-invalid-properties": "off",
      "css/font-family-fallbacks": "warn" // Que solo avise, no que sea un error
    } 
  }
]);