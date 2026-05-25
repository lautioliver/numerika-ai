/**
 * Base URL del API Express.
 * - Local: VITE_API_URL=http://localhost:3000
 * - Vercel (prod): dejar vacío → fetch a /api/* same-origin vía vercel.json rewrites
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
