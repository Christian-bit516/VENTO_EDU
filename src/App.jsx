import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AppDashboard from './pages/AppDashboard';
import EnglishModule from './pages/EnglishModule';
import MusicModule from './pages/MusicModule';
import MathModule from './pages/MathModule';
import ChessModule from './pages/ChessModule';
import AdminPanel from './pages/AdminPanel';
import SignLanguageModule from './pages/SignLanguageModule';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/dashboard" element={<ProtectedRoute><AppDashboard /></ProtectedRoute>} />
    <Route path="/english" element={<ProtectedRoute><EnglishModule /></ProtectedRoute>} />
    <Route path="/music"   element={<ProtectedRoute><MusicModule /></ProtectedRoute>} />
    <Route path="/math"    element={<ProtectedRoute><MathModule /></ProtectedRoute>} />
    <Route path="/chess"   element={<ProtectedRoute><ChessModule /></ProtectedRoute>} />
    <Route path="/admin"   element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
    <Route path="/signlanguage" element={<ProtectedRoute><SignLanguageModule /></ProtectedRoute>} />
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