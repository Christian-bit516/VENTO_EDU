import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // <--- 1. Importa el Dashboard

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* 2. Agrega la ruta del Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Próximamente: /learning y /admin */}
      </Routes>
    </Router>
  );
}

export default App;