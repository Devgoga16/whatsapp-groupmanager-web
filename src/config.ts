declare global {
  interface Window {
    APP_CONFIG?: { API_BASE_URL?: string }
  }
}

export const API_BASE =
  window.APP_CONFIG?.API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:3000'
