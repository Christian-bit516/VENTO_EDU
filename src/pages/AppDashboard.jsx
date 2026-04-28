import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../hooks/useSounds';
import { useVentoVoice } from '../hooks/useVentoVoice';
import './AppDashboard.css';
import './CourseCardV3.css';

/* ── Floating Particles ── */
const FloatingParticles = () => {
  const particles = useMemo(() => {
    const emojis = ['⭐','✨','💫','🌟','🔥','⚡','🎯','🏆','🎓','📚','🎵','♟️','🔢','💎','🌈'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i, emoji: emojis[i % emojis.length],
      left: Math.random() * 100, delay: Math.random() * 10,
      duration: 12 + Math.random() * 15, size: 0.6 + Math.random() * 0.8,
    }));
  }, []);
  return (
    <div className="floating-particles" aria-hidden="true">
      {particles.map(p => (
        <span key={p.id} className="particle" style={{
          left:`${p.left}%`, animationDelay:`${p.delay}s`,
          animationDuration:`${p.duration}s`, fontSize:`${p.size}rem`
        }}>{p.emoji}</span>
      ))}
    </div>
  );
};

/* ── Level Ring ── */
const LevelRing = ({ level, percent, xpCurrent, xpNeeded }) => {
  const radius = 52, circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;
  return (
    <div className="level-ring-wrap">
      <svg className="level-ring-svg" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#58cc02" /><stop offset="50%" stopColor="#1cb0f6" /><stop offset="100%" stopColor="#ce82ff" />
          </linearGradient>
          <filter id="ringGlow"><feGaussianBlur stdDeviation="3" result="glow" /><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <circle className="ring-bg" cx="60" cy="60" r={radius} />
        <circle className="ring-fill" cx="60" cy="60" r={radius}
          style={{ strokeDasharray:circ, strokeDashoffset:offset }} filter="url(#ringGlow)" />
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

/* ── Stat Card ── */
const StatCard = ({ icon, value, label, color, delay=0 }) => (
  <div className={`dash-stat-card stat-${color}`} style={{ animationDelay:`${delay}s` }} onMouseEnter={()=>sounds.hover()}>
    <div className="stat-icon-wrap"><span className="stat-icon">{icon}</span></div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
  </div>
);

/* ── Courses Config ── */
const COURSE_BANNERS = {
  english: { icons:['🗣️','📖','✍️','🌍','💬'], cls:'banner-english' },
  music:   { icons:['🎵','🎹','🎸','🎼','🥁'], cls:'banner-music'   },
  math:    { icons:['🔢','➕','✖️','📐','💡'], cls:'banner-math'     },
  chess:   { icons:['♟️','♛','♜','♞','🏆'],   cls:'banner-chess'   },
  signlanguage: { icons:['✋','🤖','🅰️','📚','🤟'], cls:'banner-sign' },
};
const COURSES = [
  {
    id: 'english', route: '/english',
    name: 'Inglés', subtitle: 'Speaking, Listening & Grammar',
    emoji: '🗣️', color: '#58cc02', colorRgb: '88,204,2',
    bg: 'linear-gradient(135deg,#0d2818 0%,#1a3d1f 50%,#0f1e10 100%)',
    tags: ['🎤 Pronunciación','✍️ Traducción','🔊 Escucha','📝 Completar'],
    tagColors: ['green','blue','orange','purple'],
    units: 5, difficulty: 'Principiante → Avanzado', duration: '40h',
    desc: 'Habla y entiende inglés con ejercicios interactivos y voz.',
    active: true,
  },
  {
    id: 'music', route: '/music',
    name: 'Música', subtitle: 'Leer y Tocar Canciones',
    emoji: '🎵', color: '#ff6b9d', colorRgb: '255,107,157',
    bg: 'linear-gradient(135deg,#2d0a1e 0%,#3d1a2e 50%,#1e0d18 100%)',
    tags: ['🎼 Notas','🥁 Ritmo','🎹 Piano','🎸 Canciones'],
    tagColors: ['pink','purple','blue','orange'],
    units: 3, difficulty: 'Principiante', duration: '30h',
    desc: 'Aprende a leer partituras y toca tus primeras canciones.',
    active: true,
  },
  {
    id: 'math', route: '/math',
    name: 'Matemáticas', subtitle: 'Básicas y Divertidas',
    emoji: '🔢', color: '#00b894', colorRgb: '0,184,148',
    bg: 'linear-gradient(135deg,#012018 0%,#012e22 50%,#010f0e 100%)',
    tags: ['➕ Suma','➖ Resta','✖️ Multiplicar','➗ Dividir'],
    tagColors: ['green','blue','orange','purple'],
    units: 3, difficulty: 'Básico', duration: '25h',
    desc: 'Domina las operaciones básicas con ejercicios dinámicos.',
    active: true,
  },
  {
    id: 'chess', route: '/chess',
    name: 'Ajedrez', subtitle: 'Piensa como Campeón',
    emoji: '♟️', color: '#fdcb6e', colorRgb: '253,203,110',
    bg: 'linear-gradient(135deg,#1a1400 0%,#2a2000 50%,#100d00 100%)',
    tags: ['♚ Piezas','♜ Movimientos','🧠 Estrategia','🏆 Jaque Mate'],
    tagColors: ['orange','blue','purple','green'],
    units: 3, difficulty: 'Principiante', duration: '35h',
    desc: 'Aprende ajedrez desde cero hasta hacer jaque mate.',
    active: true,
  },
  {
    id: 'signlanguage', route: '/signlanguage',
    name: 'Lenguaje de Señas', subtitle: 'Detector IA · KNN en Tiempo Real',
    emoji: '✋', color: '#00f2ff', colorRgb: '0,242,255',
    bg: 'linear-gradient(135deg,#00111a 0%,#001e2b 50%,#000d14 100%)',
    tags: ['🤖 Detector IA','🅰️ Vocales','📚 Abecedario','✨ Tiempo Real'],
    tagColors: ['blue','purple','green','orange'],
    units: 3, difficulty: 'Principiante', duration: '20h',
    desc: 'Aprende el lenguaje de señas con reconocimiento de manos en tiempo real.',
    active: true,
  },
];

/* ── Achievements ── */
const ACHIEVEMENTS = [
  { icon:'🏅', title:'Primera Lección', unlockAt:1, type:'lessons' },
  { icon:'🔥', title:'En Racha', unlockAt:3, type:'streak' },
  { icon:'💎', title:'Coleccionista', unlockAt:100, type:'xp' },
  { icon:'🏆', title:'Maestro', unlockAt:5, type:'lessons' },
  { icon:'⭐', title:'Estrella', unlockAt:200, type:'xp' },
  { icon:'🦸', title:'Imparable', unlockAt:7, type:'streak' },
  { icon:'🎓', title:'Graduado', unlockAt:8, type:'lessons' },
  { icon:'🚀', title:'Cohete XP', unlockAt:500, type:'xp' },
];

const MOTIVATIONS = [
  {text:'¡Cada día más cerca del éxito!',icon:'🚀'},
  {text:'¡Practica hoy, domina mañana!',icon:'💪'},
  {text:'¡Tu racha de aprendizaje crece!',icon:'🔥'},
  {text:'¡Sigue así, vas increíble!',icon:'⭐'},
  {text:'¡El conocimiento es tu superpoder!',icon:'🦸'},
  {text:'¡Cada ejercicio te hace más fuerte!',icon:'💎'},
];

/* ── Settings Modal ── */
const SettingsModal = ({ user, onClose }) => {
  const [soundOn,setSoundOn] = useState(()=>localStorage.getItem('vento_sound')!=='false');
  const [voiceOn,setVoiceOn] = useState(()=>localStorage.getItem('vento_voice')!=='false');
  const [notifOn,setNotifOn] = useState(()=>localStorage.getItem('vento_notif')!=='false');
  const toggle = (key,val,setter) => { setter(val); localStorage.setItem(key,String(val)); };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-icon">⚙️</span><h2>Configuración</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="settings-section">
            <span className="settings-section-title">🔊 Audio</span>
            <div className="settings-row"><div className="settings-row-info"><span className="settings-row-label">Efectos de sonido</span><span className="settings-row-desc">Sonidos al interactuar</span></div><button className={`toggle-btn ${soundOn?'on':''}`} onClick={()=>toggle('vento_sound',!soundOn,setSoundOn)}><span className="toggle-knob"/></button></div>
            <div className="settings-row"><div className="settings-row-info"><span className="settings-row-label">Voz del asistente</span><span className="settings-row-desc">Saludo de voz al iniciar sesión</span></div><button className={`toggle-btn ${voiceOn?'on':''}`} onClick={()=>toggle('vento_voice',!voiceOn,setVoiceOn)}><span className="toggle-knob"/></button></div>
          </div>
          <div className="settings-section">
            <span className="settings-section-title">🔔 Notificaciones</span>
            <div className="settings-row"><div className="settings-row-info"><span className="settings-row-label">Recordatorios de estudio</span><span className="settings-row-desc">Avisos para mantener tu racha</span></div><button className={`toggle-btn ${notifOn?'on':''}`} onClick={()=>toggle('vento_notif',!notifOn,setNotifOn)}><span className="toggle-knob"/></button></div>
          </div>
          <div className="settings-section">
            <span className="settings-section-title">👤 Cuenta</span>
            <div className="settings-account-info"><span>{user?.email||'Sin correo'}</span><span className="settings-method">{user?.method==='face'?'🔐 Face ID':user?.method==='google'?'🌐 Google':'✉️ Correo'}</span></div>
          </div>
          <div className="settings-save-note">Los cambios se guardan automáticamente ✅</div>
        </div>
      </div>
    </div>
  );
};

/* ── Course Card ── */
const CourseCard = ({ course, completedCount, totalLessons, progressPercent, level, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div className={`course-card-v3 ${hov?'hov':''}`}
      style={{ '--cc': course.color, '--ccrgb': course.colorRgb, '--ccbg': course.bg }}
      onMouseEnter={()=>{setHov(true);sounds.hover();}} onMouseLeave={()=>setHov(false)}
      onClick={onClick}>
      {/* Decorative bg */}
      <div className="ccv3-bg" />
      <div className="ccv3-glow" />
      {/* Real image banner */}
      <div className="ccv3-banner">
        <img
          src={`/course-images/${course.id}.png`}
          alt={course.name}
          className="ccv3-banner-img"
          onError={e => { e.target.style.display='none'; }}
        />
        <div className="ccv3-banner-overlay" />
        <div className="ccv3-banner-emoji-float">{course.emoji}</div>
      </div>
      {/* Emoji hero */}
      <div className="ccv3-emoji-hero">
        <div className="ccv3-emoji-ring"><span className="ccv3-emoji">{course.emoji}</span></div>
        <div className="ccv3-badge-row">
          <span className="ccv3-difficulty">{course.difficulty}</span>
          <span className="ccv3-duration">⏱ {course.duration}</span>
        </div>
      </div>
      {/* Content */}
      <div className="ccv3-content">
        <h3 className="ccv3-name">{course.name}</h3>
        <p className="ccv3-subtitle">{course.subtitle}</p>
        <p className="ccv3-desc">{course.desc}</p>
        <div className="ccv3-tags">
          {course.tags.map((t,i)=>(
            <span key={i} className={`tag tag-${course.tagColors[i]}`}>{t}</span>
          ))}
        </div>
        <div className="ccv3-stats">
          <span className="ccv3-stat">📚 {course.units} unidades</span>
          <span className="ccv3-stat">🎯 Nv.{level}</span>
        </div>
        {/* Progress */}
        <div className="ccv3-progress">
          <div className="ccv3-prog-info">
            <span>{completedCount}/{totalLessons} lecciones</span>
            <span style={{color:course.color}}>{progressPercent}%</span>
          </div>
          <div className="ccv3-prog-bar">
            <div className="ccv3-prog-fill" style={{width:`${progressPercent}%`,background:`linear-gradient(90deg,${course.color},${course.color}99)`}}>
              <div className="ccv3-prog-shimmer"/>
            </div>
          </div>
        </div>
        <button className="ccv3-cta" onClick={e=>{e.stopPropagation();onClick&&onClick();}}>
          {completedCount>0 ? '🚀 Continuar' : '🚀 Comenzar'}
          <span className="ccv3-arrow">→</span>
        </button>
      </div>
    </div>
  );
};

/* ═══ DASHBOARD ═══ */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMenu,     setShowMenu]     = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [motivation]   = useState(()=>MOTIVATIONS[Math.floor(Math.random()*MOTIVATIONS.length)]);
  const [mounted,      setMounted]      = useState(false);
  const [avatar,       setAvatar]       = useState(() => localStorage.getItem('vento_avatar') || null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target.result; setAvatar(url); localStorage.setItem('vento_avatar', url); };
    reader.readAsDataURL(file);
  };

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  const { speak } = useVentoVoice();
  useEffect(()=>{
    const voiceEnabled = localStorage.getItem('vento_voice')!=='false';
    const alreadyGreeted = sessionStorage.getItem('vento_greeted');
    if (!voiceEnabled||alreadyGreeted) return;
    const h=new Date().getHours();
    const saludo = h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches';
    const nombre = user?.name?.split(' ')[0]||'estudiante';
    const t=setTimeout(()=>{
      speak(`${saludo}, ${nombre}. ¡Bienvenido a VentoEdu! Tienes ${COURSES.length} cursos disponibles.`);
      sessionStorage.setItem('vento_greeted','1');
    },800);
    return ()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const [greeting]=useState(()=>{
    const h=new Date().getHours();
    if(h<12) return{text:'Buenos días',emoji:'🌅'};
    if(h<18) return{text:'Buenas tardes',emoji:'☀️'};
    return{text:'Buenas noches',emoji:'🌙'};
  });

  // Progress for each course
  const engP = user?.progress?.english        || {xp:0,streak:0,completedLessons:[]};
  const musP = user?.progress?.music          || {xp:0,streak:0,completedLessons:[]};
  const matP = user?.progress?.math           || {xp:0,streak:0,completedLessons:[]};
  const cheP = user?.progress?.chess          || {xp:0,streak:0,completedLessons:[]};
  const slP  = user?.progress?.signlanguage   || {xp:0,streak:0,completedVocales:[],completedAbc:[]};

  // XP total suma TODOS los módulos incluyendo señas
  const totalXp = (engP.xp||0)+(musP.xp||0)+(matP.xp||0)+(cheP.xp||0)+(slP.xp||0);
  // Lecciones completadas: señas cuenta vocales + abecedario como unidades separadas
  const slLessonsCompleted = ((slP.completedVocales?.length||0) > 0 ? 1 : 0)
                           + ((slP.completedAbc?.length||0) > 0 ? 1 : 0);
  const totalCompleted = (engP.completedLessons?.length||0)+(musP.completedLessons?.length||0)+(matP.completedLessons?.length||0)+(cheP.completedLessons?.length||0)+slLessonsCompleted;
  const bestStreak = Math.max(engP.streak||0, musP.streak||0, matP.streak||0, cheP.streak||0, slP.streak||0);
  const level = Math.floor(totalXp/200)+1;
  const xpInLevel = totalXp%200;

  const courseProgress = {
    english: { completed: engP.completedLessons?.length||0, total:8,  pct: Math.round(((engP.completedLessons?.length||0)/8)*100) },
    music:   { completed: musP.completedLessons?.length||0, total:6,  pct: Math.round(((musP.completedLessons?.length||0)/6)*100) },
    math:    { completed: matP.completedLessons?.length||0, total:6,  pct: Math.round(((matP.completedLessons?.length||0)/6)*100) },
    chess:   { completed: cheP.completedLessons?.length||0, total:6,  pct: Math.round(((cheP.completedLessons?.length||0)/6)*100) },
    // Señas: 2 lecciones (vocales + abc), el progreso es letras completadas / total
    signlanguage: { completed: slLessonsCompleted, total:2, pct: Math.round((slLessonsCompleted/2)*100) },
  };

  const unlockedAch = ACHIEVEMENTS.filter(a=>{
    if(a.type==='lessons') return totalCompleted>=a.unlockAt;
    if(a.type==='streak')  return bestStreak>=a.unlockAt;
    return totalXp>=a.unlockAt;
  });

  const handleLogout=()=>{sounds.navigate();logout();navigate('/login');};
  const initial=user?.name?.charAt(0)?.toUpperCase()||'?';

  return (
    <div className={`dashboard-page ${mounted?'mounted':''}`}>
      <FloatingParticles/>

      {/* Navbar */}
      <nav className="dash-navbar">
        <div className="dash-navbar-inner">
          <div className="dash-brand" onClick={()=>sounds.click()}>
            <span className="dash-brand-icon">🤟</span>
            <span className="dash-brand-text">Vento<span>Edu</span></span>
          </div>
          <div className="dash-nav-pills">
            <div className="nav-pill xp" onMouseEnter={()=>sounds.hover()}><span className="pill-icon">⚡</span><span className="pill-value">{totalXp}</span></div>
            <div className="nav-pill streak" onMouseEnter={()=>sounds.hover()}><span className="pill-icon">🔥</span><span className="pill-value">{bestStreak}</span></div>
            <div className="nav-pill level" onMouseEnter={()=>sounds.hover()}><span className="pill-icon">👑</span><span className="pill-value">Nv.{level}</span></div>
          </div>
          <div className="dash-dropdown">
            <button className="dash-user-btn" onClick={()=>{sounds.click();setShowMenu(!showMenu);}}>
              <div className="dash-user-avatar">
                {avatar
                  ? <img src={avatar} alt="avatar" className="dash-user-photo"/>
                  : <span>{initial}</span>}
              </div>
              <span>{user?.name||'Usuario'}</span>
              <span className="chevron">{showMenu?'▲':'▼'}</span>
            </button>
            {showMenu&&(
              <div className="dash-dropdown-menu">
                <button className="dash-dropdown-item" onClick={()=>{sounds.click();setShowMenu(false);setShowProfile(true);}}><span>👤</span> Mi perfil</button>
                <button className="dash-dropdown-item" onClick={()=>{sounds.click();setShowMenu(false);setShowSettings(true);}}><span>⚙️</span> Configuración</button>
                <div className="dropdown-divider"/>
                <button className="dash-dropdown-item danger" onClick={handleLogout}><span>🚪</span> Cerrar sesión</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="dash-content">
        {/* Hero */}
        <div className="dash-hero">
          <div className="dash-hero-left">
            <div className="greeting-badge"><span>{greeting.emoji}</span> {greeting.text}</div>
            <h1 className="dash-hero-title">¡Hola, <span className="gradient-text">{user?.name||'Estudiante'}</span>!</h1>
            <p className="dash-hero-sub">Tienes <strong>{COURSES.length} cursos</strong> disponibles hoy 🎓</p>
            <div className="motivation-pill"><span className="motivation-emoji">{motivation.icon}</span><span>{motivation.text}</span></div>
          </div>
          <div className="dash-hero-right">
            <LevelRing level={level} percent={(xpInLevel/200)*100} xpCurrent={xpInLevel} xpNeeded={200}/>
          </div>
        </div>

        {/* Stats */}
        <div className="dash-stats-grid">
          <StatCard icon="⚡" value={totalXp}        label="XP Total"   color="orange" delay={0.05}/>
          <StatCard icon="🔥" value={bestStreak}      label="Mejor Racha" color="red"   delay={0.1}/>
          <StatCard icon="📚" value={totalCompleted}  label="Lecciones"  color="green"  delay={0.15}/>
          <StatCard icon="🎓" value={COURSES.length}  label="Cursos"     color="pink"   delay={0.2}/>
        </div>

        {/* Daily Challenge */}
        <div className="daily-card" onMouseEnter={()=>sounds.hover()}>
          <div className="daily-glow"/>
          <div className="daily-content">
            <div className="daily-icon-wrap"><span className="daily-icon">🎯</span></div>
            <div className="daily-info">
              <h4 className="daily-title">Reto Diario</h4>
              <p className="daily-desc">Completa 3 lecciones hoy para ganar +100 XP bonus</p>
            </div>
            <div className="daily-counter">
              <div className="daily-count">{Math.min(totalCompleted,3)}</div>
              <div className="daily-total">/3</div>
            </div>
          </div>
          <div className="daily-progress-track">
            <div className="daily-progress-fill" style={{width:`${Math.min(totalCompleted/3,1)*100}%`}}/>
          </div>
        </div>

        {/* Courses */}
        <div className="section-header">
          <span className="section-icon">🎓</span>
          <h3>Mis Cursos</h3>
          <span className="section-count">{COURSES.length} cursos activos</span>
        </div>

        <div className="courses-grid-v3">
          {COURSES.map(course=>{
            const cp=courseProgress[course.id];
            return(
              <CourseCard
                key={course.id}
                course={course}
                completedCount={cp.completed}
                totalLessons={cp.total}
                progressPercent={cp.pct}
                level={level}
                onClick={()=>{sounds.buttonPress();navigate(course.route);}}
              />
            );
          })}
        </div>

        {/* Achievements */}
        <div className="section-header">
          <span className="section-icon">🏆</span>
          <h3>Logros</h3>
          <span className="section-count">{unlockedAch.length}/{ACHIEVEMENTS.length}</span>
        </div>
        <div className="achievements-grid">
          {ACHIEVEMENTS.map((a,i)=>{
            const unlocked=unlockedAch.includes(a);
            return(
              <div key={i} className={`achievement-card ${unlocked?'unlocked':'locked'}`}
                onMouseEnter={()=>unlocked&&sounds.hover()}
                style={{animationDelay:`${i*0.06}s`}}>
                <span className="achievement-icon">{a.icon}</span>
                <span className="achievement-title">{a.title}</span>
                {!unlocked&&<div className="achievement-lock">🔒</div>}
              </div>
            );
          })}
        </div>

        {/* Next Level */}
        <div className="next-level-card">
          <div className="nlc-content">
            <span className="nlc-icon">🎖️</span>
            <div className="nlc-info">
              <span className="nlc-label">Siguiente nivel</span>
              <span className="nlc-value">Faltan <strong>{200-xpInLevel} XP</strong> para Nivel {level+1}</span>
            </div>
          </div>
          <div className="nlc-bar"><div className="nlc-fill" style={{width:`${(xpInLevel/200)*100}%`}}/></div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile&&(
        <div className="modal-overlay" onClick={()=>setShowProfile(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-icon">👤</span><h2>Mi Perfil</h2><button className="modal-close" onClick={()=>setShowProfile(false)}>✕</button></div>
            <div className="modal-body">
              {/* Avatar with photo upload */}
              <div className="profile-avatar-section">
                <div className="profile-avatar-big">
                  {avatar
                    ? <img src={avatar} alt="avatar" className="profile-avatar-photo"/>
                    : <span>{user?.name?.charAt(0)?.toUpperCase()||'?'}</span>}
                </div>
                <label className="profile-change-photo-btn">
                  📷 Cambiar Foto
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarChange}/>
                </label>
                {avatar && <button className="profile-remove-photo-btn" onClick={()=>{setAvatar(null);localStorage.removeItem('vento_avatar');}}>✕ Quitar foto</button>}
              </div>
              <div className="profile-info-grid">
                <div className="profile-info-item"><span className="profile-info-label">Nombre</span><span className="profile-info-value">{user?.name||'—'}</span></div>
                <div className="profile-info-item"><span className="profile-info-label">Correo</span><span className="profile-info-value">{user?.email||'—'}</span></div>
                <div className="profile-info-item"><span className="profile-info-label">Acceso</span><span className="profile-info-value profile-method">{user?.method==='face'?'🔐 Face ID':user?.method==='google'?'🌐 Google':'✉️ Correo'}</span></div>
              </div>
              <div className="profile-stats-row">
                <div className="profile-stat"><span className="ps-num">{totalXp}</span><span className="ps-lbl">XP Total</span></div>
                <div className="profile-stat"><span className="ps-num">{bestStreak}</span><span className="ps-lbl">Racha</span></div>
                <div className="profile-stat"><span className="ps-num">{totalCompleted}</span><span className="ps-lbl">Lecciones</span></div>
                <div className="profile-stat"><span className="ps-num">{level}</span><span className="ps-lbl">Nivel</span></div>
              </div>
              <div className="profile-joined">Miembro desde: {user?.loginTime?new Date(user.loginTime).toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'}):'Hoy'}</div>
            </div>
          </div>
        </div>
      )}

      {showSettings&&<SettingsModal user={user} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
};

export default Dashboard;
