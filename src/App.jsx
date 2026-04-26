import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AppDashboard from './pages/AppDashboard';
import EnglishModule from './pages/EnglishModule';
import AdminPanel from './pages/AdminPanel';

/* ── Ruta protegida — redirige al login si no hay sesión ──
   IMPORTANTE: debe estar DENTRO de AuthProvider en el árbol de render */
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

/* ── Ruta pública — si ya inició sesión, redirige al dashboard ── */
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

/* ── Rutas: viven dentro de AuthProvider y Router ── */
const AppRoutes = () => (
  <Routes>
    {/* Login — página de inicio */}
    <Route path="/" element={
      <PublicRoute><Login /></PublicRoute>
    } />

    {/* Dashboard principal de la plataforma de aprendizaje */}
    <Route path="/dashboard" element={
      <ProtectedRoute><AppDashboard /></ProtectedRoute>
    } />

    {/* Módulo de inglés */}
    <Route path="/english" element={
      <ProtectedRoute><EnglishModule /></ProtectedRoute>
    } />

    {/* Panel de administración */}
    <Route path="/admin" element={
      <ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>
    } />

    {/* Cualquier ruta desconocida → inicio */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;