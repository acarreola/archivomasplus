import axios from 'axios';

// Obtener la URL base del API desde variables de entorno o usar localhost por defecto
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Configurar axios globalmente para enviar cookies de sesión
axios.defaults.withCredentials = true;
axios.defaults.baseURL = API_BASE_URL;

// Interceptor para manejar errores de autenticación
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 || error.response?.status === 401) {
      // Si hay error de autenticación, redirigir al login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper function para construir URLs de media (archivos estáticos)
export const getMediaUrl = (path) => {
  if (!path) return null;
  // Si path ya es una URL completa, devolverla tal cual
  if (path.startsWith('http')) return path;
  // Si path no empieza con /, agregarlo
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Si cleanPath ya tiene /media/, no duplicarlo
  if (cleanPath.startsWith('/media/')) {
    return `${API_BASE_URL}${cleanPath}`;
  }
  return `${API_BASE_URL}/media${cleanPath}`;
};

// Helper function para construir URLs de API
export const getApiUrl = (endpoint) => {
  if (!endpoint) return API_BASE_URL;
  // Si endpoint ya es una URL completa, devolverla tal cual
  if (endpoint.startsWith('http')) return endpoint;
  // Si endpoint no empieza con /, agregarlo
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// Exportar la URL base para uso directo si es necesario
export const BASE_URL = API_BASE_URL;

export default axios;
