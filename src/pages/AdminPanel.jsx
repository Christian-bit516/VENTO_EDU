import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminPanel.css';

const API_BASE = 'http://localhost:3001';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [announcement, setAnnouncement] = useState('');
  const [announcementSaved, setAnnouncementSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, adminsRes] = await Promise.all([
          fetch(`${API_BASE}/api/users`).then(r => r.json()),
          fetch(`${API_BASE}/api/admins`).then(r => r.json()),
        ]);
        if (usersRes.success) setUsers(usersRes.users);
        if (adminsRes.success) setAdmins(adminsRes.admins);
      } catch { /* server offline */ }
    };
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSaveAnnouncement = () => {
    localStorage.setItem('ventoedu_announcement', announcement);
    setAnnouncementSaved(true);
    setTimeout(() => setAnnouncementSaved(false), 2000);
  };

  const totalXp = users.reduce((sum, u) => sum + (u.progress?.english?.xp || 0), 0);
  const avgLevel = users.length
    ? Math.round(users.reduce((sum, u) => sum + (u.progress?.english?.level || 1), 0) / users.length)
    : 0;

  return (
    <div className="admin-page">
      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="sidebar-logo">
            <span style={{ fontSize: '1.3rem' }}>🤟</span>
            <span className="sidebar-logo-text">Vento<span className="text-green">Edu</span></span>
            <span className="badge badge-red">ADMIN</span>
          </div>

          <div className="sidebar-section">Panel</div>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <span className="nav-icon">📊</span> Resumen
            </button>
            <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <span className="nav-icon">👥</span> Usuarios
            </button>
            <button className={`nav-item ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
              <span className="nav-icon">📝</span> Contenido
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="admin-pill">
              <span className="admin-dot" />
              <span className="admin-pill-text">{user?.name || 'Admin'}</span>
            </div>
            <button className="admin-logout-btn" onClick={handleLogout}>
              🚪 CERRAR SESIÓN
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="admin-main">
          {activeTab === 'overview' && (
            <div className="animate-fadeInUp">
              <h1 className="admin-page-title">Panel de Administración</h1>
              <p className="admin-page-desc">Gestiona usuarios, contenido y monitorea el progreso de la plataforma.</p>

              <div className="admin-stats-grid">
                <div className="admin-stat-card card">
                  <div className="admin-stat-icon">👥</div>
                  <div className="admin-stat-value text-green">{users.length}</div>
                  <div className="admin-stat-label">Usuarios</div>
                </div>
                <div className="admin-stat-card card">
                  <div className="admin-stat-icon">🔐</div>
                  <div className="admin-stat-value text-red">{admins.length}</div>
                  <div className="admin-stat-label">Admins</div>
                </div>
                <div className="admin-stat-card card">
                  <div className="admin-stat-icon">⚡</div>
                  <div className="admin-stat-value text-orange">{totalXp}</div>
                  <div className="admin-stat-label">XP Total</div>
                </div>
                <div className="admin-stat-card card">
                  <div className="admin-stat-icon">📊</div>
                  <div className="admin-stat-value text-blue">{avgLevel}</div>
                  <div className="admin-stat-label">Niv. Promedio</div>
                </div>
              </div>

              <h3 style={{ marginBottom: '1rem' }}>Actividad Reciente</h3>
              <div className="users-table-wrap card">
                <table className="users-table">
                  <thead>
                    <tr><th>Nombre</th><th>Método</th><th>XP</th><th>Nivel</th><th>Último Acceso</th></tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 10).map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</td>
                        <td>
                          <span className={`badge ${u.method === 'face' ? 'badge-blue' : u.method === 'google' ? 'badge-green' : 'badge-purple'}`}>
                            {u.method === 'face' ? '👤 FACIAL' : u.method === 'google' ? '🌐 GOOGLE' : '✉️ EMAIL'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--orange-400)' }}>{u.progress?.english?.xp || 0}</td>
                        <td style={{ fontWeight: 800, color: 'var(--blue-500)' }}>{u.progress?.english?.level || 1}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString('es') : '—'}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay usuarios aún</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-fadeInUp">
              <h1 className="admin-page-title">Gestión de Usuarios</h1>
              <p className="admin-page-desc">Todos los usuarios registrados en VentoEdu.</p>

              <div className="users-table-wrap card">
                <table className="users-table">
                  <thead>
                    <tr><th>Nombre</th><th>Email</th><th>Método</th><th>Registrado</th><th>Logins</th><th>XP</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{u.email || '—'}</td>
                        <td>
                          <span className={`badge ${u.method === 'face' ? 'badge-blue' : u.method === 'google' ? 'badge-green' : 'badge-purple'}`}>
                            {u.method?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('es') : '—'}</td>
                        <td style={{ fontWeight: 800 }}>{u.loginCount || 0}</td>
                        <td style={{ fontWeight: 800, color: 'var(--orange-400)' }}>{u.progress?.english?.xp || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="animate-fadeInUp content-editor">
              <h1 className="admin-page-title">Editor de Contenido</h1>
              <p className="admin-page-desc">Personaliza el contenido visible para los usuarios.</p>

              <div className="editor-section">
                <div className="editor-section-title">
                  <h3>📢 Anuncio para Usuarios</h3>
                  <button className="btn btn-green btn-sm" onClick={handleSaveAnnouncement}>
                    {announcementSaved ? '✅ GUARDADO' : 'GUARDAR'}
                  </button>
                </div>
                <div className="announcement-box card">
                  <textarea
                    className="announcement-input"
                    placeholder="Escribe un anuncio que verán todos los usuarios..."
                    value={announcement}
                    onChange={e => setAnnouncement(e.target.value)}
                  />
                </div>
              </div>

              <div className="editor-section">
                <h3 style={{ marginBottom: '1rem' }}>🎯 Módulos del Curso</h3>
                <div className="card" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>🗣️ Inglés · Curso Completo</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    5 unidades • 8 lecciones • 48+ ejercicios
                  </p>
                  <span className="badge badge-green">ACTIVO</span>
                </div>
              </div>

              <div className="editor-section">
                <h3 style={{ marginBottom: '1rem' }}>📊 Resumen</h3>
                <div className="card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    VentoEdu cuenta con <strong style={{ color: 'var(--green-500)' }}>{users.length}</strong> usuarios y <strong style={{ color: 'var(--red-400)' }}>{admins.length}</strong> admins.
                    XP total: <strong style={{ color: 'var(--orange-400)' }}>{totalXp}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
