import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const STORAGE_KEY = 'linguasign_session';
const API_URL = 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Persistir sesión en localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  // ── Login ──────────────────────────────────────────────────────────────────
  // Recibe el objeto user del backend (con id, name, email, role, progress)
  const login = useCallback((userData) => {
    const session = {
      ...userData,
      loginTime: new Date().toISOString(),
    };
    setUser(session);

    // Voice greeting — pick best Spanish voice
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const greeting = userData.role === 'admin'
        ? `Bienvenido administrador ${userData.name}. Acceso total concedido.`
        : `¡Hola ${userData.name}! ¡Bienvenido de vuelta a VentoEdu! ¡Es hora de aprender!`;
        
      const speak = () => {
        const utterance = new SpeechSynthesisUtterance(greeting);
        // Prevenir bug de Chrome que corta el audio por Garbage Collection
        window._ventoUtterance = utterance; 
        
        utterance.lang = 'es-ES';
        utterance.pitch = 1.1;
        utterance.rate = 0.95;
        utterance.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferred = ['Google español', 'Microsoft Sabina', 'Paulina', 'Jorge', 'Monica'];
        let best = null;
        for (const name of preferred) {
          best = voices.find(v => v.name.includes(name));
          if (best) break;
        }
        if (!best) best = voices.find(v => v.lang.startsWith('es'));
        if (best) utterance.voice = best;
        window.speechSynthesis.speak(utterance);
      };
      setTimeout(speak, 400);
    }

    return session;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('vento_token');
    localStorage.removeItem('vento_user');
  }, []);

  // ── Guardar progreso (local + Firebase vía Node.js) ────────────────────────
  const updateProgress = useCallback((moduleKey, progressData) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        progress: {
          ...(prev.progress || {}),
          [moduleKey]: {
            ...(prev.progress?.[moduleKey] || {}),
            ...progressData,
          },
        },
      };

      // Guardar en Firebase vía backend Node.js
      if (prev.id) {
        const token = localStorage.getItem('vento_token');
        fetch(`${API_URL}/api/progress/${prev.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            module: moduleKey,
            data: updated.progress[moduleKey],
          }),
        }).catch(err => console.warn('Progress sync error:', err));
      }

      return updated;
    });
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLoading,
    setIsLoading,
    login,
    logout,
    updateProgress,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
