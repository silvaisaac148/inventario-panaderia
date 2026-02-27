/**
 * App — Router principal con rutas protegidas.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Ingredientes from './pages/Ingredientes';
import Productos from './pages/Productos';
import Recetas from './pages/Recetas';
import Produccion from './pages/Produccion';
import Ventas from './pages/Ventas';
import Excel from './pages/Excel';
import Login from './pages/Login';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="ingredientes" element={<Ingredientes />} />
        <Route path="productos" element={<Productos />} />
        <Route path="recetas" element={<Recetas />} />
        <Route path="produccion" element={<Produccion />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="excel" element={<Excel />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
