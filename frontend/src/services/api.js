/**
 * API Service — Centralized HTTP client for backend communication.
 */

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: agregar token JWT a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: manejar errores 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ---- Ingredientes ----
export const ingredientesAPI = {
  listar: () => api.get('/ingredientes/'),
  obtener: (id) => api.get(`/ingredientes/${id}`),
  crear: (data) => api.post('/ingredientes/', data),
  actualizar: (id, data) => api.put(`/ingredientes/${id}`, data),
  eliminar: (id) => api.delete(`/ingredientes/${id}`),
  compra: (id, data) => api.post(`/ingredientes/${id}/compra`, data),
  alertas: () => api.get('/ingredientes/alertas'),
};

// ---- Productos ----
export const productosAPI = {
  listar: () => api.get('/productos/'),
  obtener: (id) => api.get(`/productos/${id}`),
  crear: (data) => api.post('/productos/', data),
  actualizar: (id, data) => api.put(`/productos/${id}`, data),
  eliminar: (id) => api.delete(`/productos/${id}`),
};

// ---- Recetas ----
export const recetasAPI = {
  listar: () => api.get('/recetas'),
  obtener: (id) => api.get(`/recetas/${id}`),
  crear: (data) => api.post('/recetas/', data),
  actualizar: (id, data) => api.put(`/recetas/${id}`, data),
  eliminar: (id) => api.delete(`/recetas/${id}`),
  costo: (id) => api.get(`/recetas/${id}/costo`),
};

// ---- Producción ----
export const produccionAPI = {
  verificar: (data) => api.post('/produccion/verificar', data),
  producir: (data) => api.post('/produccion', data),
  historial: () => api.get('/produccion/historial'),
};

// ---- Ventas ----
export const ventasAPI = {
  registrar: (data) => api.post('/ventas', data),
  historial: () => api.get('/ventas/historial'),
};

// ---- Excel ----
export const excelAPI = {
  importarIngredientes: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/excel/importar/ingredientes', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importarRecetas: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/excel/importar/recetas', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  exportarStock: () => api.get('/excel/exportar/stock', { responseType: 'blob' }),
  exportarMovimientos: () => api.get('/excel/exportar/movimientos', { responseType: 'blob' }),
};

// ---- Reportes ----
export const reportesAPI = {
  dashboard: () => api.get('/reportes/dashboard'),
};

// ---- Auth ----
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  registro: (data) => api.post('/auth/registro', data),
  me: () => api.get('/auth/me'),
};

// ---- Utilidades ----
export const descargarExcel = (blobData, filename) => {
  // Crear un File (no Blob) para que el navegador respete el nombre
  const file = new File([blobData], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  // Esperar 1s antes de limpiar para que el navegador inicie la descarga
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
};

export default api;
