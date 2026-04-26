import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../hooks/useSounds';
import './AppDashboard.css';

/* ── Floating particles ───────────────────────────────────────────────────── */
const FloatingParticles = () => {
  const particles = useMemo(() => {
    const emojis = ['⭐', '✨', '💫', '🌟', '🔥', '⚡', '🎯', '🏆', '🎓', '📚', '🗣️', '🎤', '💎', '🌈', '🦋'];
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      emoji: emojis[i % emojis.length],
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 15,
      size: 0.6 + Math.random() * 0.8,
    }));
  }, []);

  return (
    <div className="floating-particles" aria-hidden="true">
      {particles.map(p => (
        <span key={p.id} className="particle" style={{
          left: `${p.left}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
          fontSize: `${p.size}rem`,
        }}>{p.emoji}</span>
      ))}
    </div>
  );
};

/* ── SVG Level Ring ───────────────────────────────────────────────────────── */
const LevelRing = ({ level, percent, xpCurrent, xpNeeded }) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="level-ring-wrap">
      <svg className="level-ring-svg" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#58cc02" />
            <stop offset="50%" stopColor="#1cb0f6" />
            <stop offset="100%" stopColor="#ce82ff" />
          </linearGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle className="ring-bg" cx="60" cy="60" r={radius} />
        <circle className="ring-fill" cx="60" cy="60" r={radius}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
          filter="url(#ringGlow)" />
      </svg>
      <div className="ring-center">
        <span className="ring-crown">👑</span>
        <span className="ring-level">{level}</span>
        <span className="ring-label">NIVEL</span>
      </div>
      <div className="ring-xp-badge">{xpCurrent}/{xpNeeded} XP</div>
    </div>
  );
};

/* ── Stat Card ────────────────────────────────────────────────────────────── */
const StatCard = ({ icon, value, label, color, delay = 0 }) => (
  <div className={`dash-stat-card stat-${color}`}
    style={{ animationDelay: `${delay}s` }}
    onMouseEnter={() => sounds.hover()}>
    <div className="stat-icon-wrap">
      <span className="stat-icon">{icon}</span>
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

/* ── Achievement Mini Card ────────────────────────────────────────────────── */
const achievements = [
  { icon: '🏅', title: 'Primera Lección', desc: 'Completa tu primera lección', unlockAt: 1 },
  { icon: '🔥', title: 'En Racha', desc: 'Mantén una racha de 3 días', unlockAt: 3 },
  { icon: '💎', title: 'Coleccionista', desc: 'Acumula 100 XP', unlockAt: 100 },
  { icon: '🏆', title: 'Maestro', desc: 'Completa 5 lecciones', unlockAt: 5 },
  { icon: '⭐', title: 'Estrella', desc: 'Obtén 200 XP', unlockAt: 200 },
  { icon: '🦸', title: 'Imparable', desc: 'Racha de 7 días', unlockAt: 7 },
];

/* ── Motivations ──────────────────────────────────────────────────────────── */
const MOTIVATIONS = [
  { text: '¡Cada día más cerca de la fluidez!', icon: '🚀' },
  { text: '¡Practica hoy, domina mañana!', icon: '💪' },
  { text: '¡Tu racha de aprendizaje crece!', icon: '🔥' },
  { text: '¡Sigue así, vas increíble!', icon: '⭐' },
  { text: '¡El inglés es tu superpoder!', icon: '🦸' },
  { text: '¡Cada ejercicio te hace más fuerte!', icon: '💎' },
];

/* ═══ DASHBOARD COMPONENT ═══════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [motivation] = useState(() => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  /* ── Time-of-day greeting ── */
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Buenos días', emoji: '🌅' };
    if (h < 18) return { text: 'Buenas tardes', emoji: '☀️' };
    return { text: 'Buenas noches', emoji: '🌙' };
  });

  const progress = user?.progress?.english || { xp: 0, level: 1, streak: 0, completedLessons: [] };
  const totalLessons = 8;
  const completedCount = progress.completedLessons?.length || 0;
  const progressPercent = Math.round((completedCount / totalLessons) * 100);
  const level = Math.floor((progress.xp || 0) / 100) + 1;
  const xpInLevel = (progress.xp || 0) % 100;

  const handleLogout = () => { sounds.navigate(); logout(); navigate('/login'); };
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  /* ── Check achievements ── */
  const unlockedAchievements = achievements.filter(a => {
    if (a.title.includes('Lección') || a.title.includes('Maestro')) return completedCount >= a.unlockAt;
    if (a.title.includes('Racha') || a.title.includes('Imparable')) return (progress.streak || 0) >= a.unlockAt;
    return (progress.xp || 0) >= a.unlockAt;
  });

  return (
    <div className={`dashboard-page ${mounted ? 'mounted' : ''}`}>
      <FloatingParticles />

      {/* ── Navbar ── */}
      <nav className="dash-navbar">
        <div className="dash-navbar-inner">
          <div className="dash-brand" onClick={() => sounds.click()}>
            <span className="dash-brand-icon">🤟</span>
            <span className="dash-brand-text">Vento<span>Edu</span></span>
          </div>

          <div className="dash-nav-pills">
            <div className="nav-pill xp" onMouseEnter={() => sounds.hover()}>
              <span className="pill-icon">⚡</span>
              <span className="pill-value">{progress.xp || 0}</span>
            </div>
            <div className="nav-pill streak" onMouseEnter={() => sounds.hover()}>
              <span className="pill-icon">🔥</span>
              <span className="pill-value">{progress.streak || 0}</span>
            </div>
            <div className="nav-pill level" onMouseEnter={() => sounds.hover()}>
              <span className="pill-icon">👑</span>
              <span className="pill-value">Nv.{level}</span>
            </div>
          </div>

          <div className="dash-dropdown">
            <button className="dash-user-btn" onClick={() => { sounds.click(); setShowMenu(!showMenu); }}>
              <div className="dash-user-avatar">{initial}</div>
              <span>{user?.name || 'Usuario'}</span>
              <span className="chevron">{showMenu ? '▲' : '▼'}</span>
            </button>
            {showMenu && (
              <div className="dash-dropdown-menu">
                <button className="dash-dropdown-item" onClick={() => sounds.click()}>
                  <span>👤</span> Mi perfil
                </button>
                <button className="dash-dropdown-item" onClick={() => sounds.click()}>
                  <span>⚙️</span> Configuración
                </button>
                <div className="dropdown-divider" />
                <button className="dash-dropdown-item danger" onClick={handleLogout}>
                  <span>🚪</span> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="dash-content">
        {/* ── Hero Section ── */}
        <div className="dash-hero">
          <div className="dash-hero-left">
            <div className="greeting-badge">
              <span>{greeting.emoji}</span> {greeting.text}
            </div>
            <h1 className="dash-hero-title">
              ¡Hola, <span className="gradient-text">{user?.name || 'Estudiante'}</span>!
            </h1>
            <p className="dash-hero-sub">¿Listo para seguir dominando el inglés?</p>

            {/* Motivation */}
            <div className="motivation-pill">
              <span className="motivation-emoji">{motivation.icon}</span>
              <span>{motivation.text}</span>
            </div>
          </div>

          <div className="dash-hero-right">
            <LevelRing level={level} percent={xpInLevel} xpCurrent={xpInLevel} xpNeeded={100} />
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="dash-stats-grid">
          <StatCard icon="⚡" value={progress.xp || 0} label="XP Total" color="orange" delay={0.05} />
          <StatCard icon="🔥" value={progress.streak || 0} label="Racha" color="red" delay={0.1} />
          <StatCard icon="📚" value={completedCount} label="Lecciones" color="green" delay={0.15} />
          <StatCard icon="❤️" value="5" label="Vidas" color="pink" delay={0.2} />
        </div>

        {/* ── Course Card ── */}
        <div className="section-header">
          <span className="section-icon">📖</span>
          <h3>Tu Curso</h3>
        </div>
        <div className="course-card" onClick={() => { sounds.buttonPress(); navigate('/english'); }}
          onMouseEnter={() => sounds.hover()}>
          <div className="course-card-glow" />
          <div className="course-card-content">
            <div className="course-header">
              <div className="course-icon-wrap">
                <span className="course-icon">🗣️</span>
              </div>
              <div className="course-info">
                <h3 className="course-title">Inglés · Curso Completo</h3>
                <p className="course-desc">Voz, ejercicios interactivos y gamificación avanzada</p>
              </div>
              <div className="course-level-badge">Nv.{level}</div>
            </div>

            <div className="course-tags">
              <span className="tag tag-green">🎤 Pronunciación</span>
              <span className="tag tag-blue">✍️ Traducción</span>
              <span className="tag tag-orange">🔊 Escucha</span>
              <span className="tag tag-purple">📝 Completar</span>
            </div>

            <div className="course-progress-section">
              <div className="course-progress-info">
                <span>{completedCount}/{totalLessons} lecciones</span>
                <span className="course-progress-pct">{progressPercent}%</span>
              </div>
              <div className="progress-bar-fancy">
                <div className="progress-fill-fancy" style={{ width: `${progressPercent}%` }}>
                  <div className="progress-shimmer" />
                </div>
              </div>
            </div>

            <button className="course-cta" onClick={e => { e.stopPropagation(); sounds.buttonPress(); navigate('/english'); }}>
              {completedCount > 0 ? '🚀 CONTINUAR APRENDIENDO' : '🚀 COMENZAR CURSO'}
              <span className="cta-arrow">→</span>
            </button>
          </div>
        </div>

        {/* ── Daily Challenge ── */}
        <div className="daily-card" onMouseEnter={() => sounds.hover()}>
          <div className="daily-glow" />
          <div className="daily-content">
            <div className="daily-icon-wrap">
              <span className="daily-icon">🎯</span>
            </div>
            <div className="daily-info">
              <h4 className="daily-title">Reto Diario</h4>
              <p className="daily-desc">Completa 3 ejercicios para ganar +50 XP bonus</p>
            </div>
            <div className="daily-counter">
              <div className="daily-count">{Math.min(completedCount, 3)}</div>
              <div className="daily-total">/3</div>
            </div>
          </div>
          <div className="daily-progress-track">
            <div className="daily-progress-fill" style={{ width: `${Math.min(completedCount / 3, 1) * 100}%` }} />
          </div>
        </div>

        {/* ── Achievements ── */}
        <div className="section-header">
          <span className="section-icon">🏆</span>
          <h3>Logros</h3>
          <span className="section-count">{unlockedAchievements.length}/{achievements.length}</span>
        </div>
        <div className="achievements-grid">
          {achievements.map((a, i) => {
            const unlocked = unlockedAchievements.includes(a);
            return (
              <div key={i} className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}
                onMouseEnter={() => unlocked && sounds.hover()}
                style={{ animationDelay: `${i * 0.06}s` }}>
                <span className="achievement-icon">{a.icon}</span>
                <span className="achievement-title">{a.title}</span>
                {!unlocked && <div className="achievement-lock">🔒</div>}
              </div>
            );
          })}
        </div>

        {/* ── XP to Next Level ── */}
        <div className="next-level-card">
          <div className="nlc-content">
            <span className="nlc-icon">🎖️</span>
            <div className="nlc-info">
              <span className="nlc-label">Siguiente nivel</span>
              <span className="nlc-value">Faltan <strong>{100 - xpInLevel} XP</strong> para Nivel {level + 1}</span>
            </div>
          </div>
          <div className="nlc-bar">
            <div className="nlc-fill" style={{ width: `${xpInLevel}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
