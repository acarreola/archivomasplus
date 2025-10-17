import axios from 'axios';

// Configurar axios globalmente para enviar cookies de sesión
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8000';

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

export default axios;
