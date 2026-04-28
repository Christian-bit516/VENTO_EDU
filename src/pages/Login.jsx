import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, AlertCircle, CheckCircle2,
  ArrowRight, ShieldCheck, Eye, EyeOff, Loader2,
  ScanFace, UserPlus, Globe
} from 'lucide-react';
import { useVentoVoice } from '../hooks/useVentoVoice';
import * as faceapi from 'face-api.js';
import FaceScanner from '../components/FaceScanner';
import { apiFetch, saveSession, GOOGLE_CLIENT_ID } from '../config/api';
import { useAuth } from '../context/AuthContext';
import './Login.css';

/* ─── Umbral de reconocimiento facial ─── */
const FACE_MATCH_THRESHOLD = 0.45;

const Login = () => {
  /* ── Modos de pantalla ──
     'login'          → pantalla inicial
     'register-email' → registro con correo
     'face-login'     → escáner Face ID login
     'face-register'  → paso 1: pedir nombre/correo
     'face-scan-reg'  → paso 2: escanear y registrar
  */
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [mode, setMode] = useState('login');

  /* ── Iniciar sesión en AuthContext y navegar al dashboard ── */
  const redirectToApp = (user) => {
    authLogin({
      id:       user.id     || user.userId || null,  // id viene del backend vía publicUser()
      name:     user.name   || user.email,
      email:    user.email  || '',
      role:     user.role   || 'student',
      method:   user.method || 'email',
      progress: user.progress || {},
    });
    navigate('/dashboard');
  };

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [name,         setName]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message,      setMessage]      = useState({ text: '', type: '' });
  const [loading,      setLoading]      = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  /* Datos para registro facial */
  const [faceRegName,  setFaceRegName]  = useState('');
  const [faceRegEmail, setFaceRegEmail] = useState('');

  /* Google Identity Services listo */
  const [googleReady, setGoogleReady] = useState(false);

  const { speak } = useVentoVoice();
  const googleBtnRef = useRef(null);

  /* ══════════════════════════════════════════════
     CARGAR MODELOS FACE-API + WARMUP
  ══════════════════════════════════════════════ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        if (cancelled) return;
        /* Warmup: inferencia en blanco para compilar shaders WebGL */
        try {
          const c = document.createElement('canvas');
          c.width = c.height = 64;
          await faceapi.detectSingleFace(c,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.9 }));
        } catch { /* silencioso — canvas en blanco a propósito */ }
        if (!cancelled) setModelsLoaded(true);
      } catch (err) { console.error('Error modelos:', err); }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ══════════════════════════════════════════════
     CARGAR GOOGLE IDENTITY SERVICES + renderButton
  ══════════════════════════════════════════════ */
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback:  handleGoogleCallback,
      });
      setGoogleReady(true);
    };

    if (window.google) { initGoogle(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, []);

  /* Renderizar el botón oficial de Google cuando el modo es login */
  useEffect(() => {
    if (!googleReady || !googleBtnRef.current || mode !== 'login') return;
    try {
      googleBtnRef.current.innerHTML = ''; // limpiar antes de re-renderizar
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size:  'large',
        text:  'signin_with',
        shape: 'rectangular',
        width: googleBtnRef.current.offsetWidth || 360,
        locale: 'es',
      });
    } catch (e) {
      console.warn('Google renderButton error:', e);
    }
  }, [googleReady, mode]);

  /* ── Limpiar mensaje automáticamente ── */
  useEffect(() => {
    if (!message.text) return;
    const t = setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    return () => clearTimeout(t);
  }, [message]);

  /* ── Reset al cambiar modo ── */
  useEffect(() => {
    setPassword('');
    setShowPassword(false);
    setMessage({ text: '', type: '' });
  }, [mode]);

  /* ══════════════════════════════════════════════
     REGISTRO CON CORREO — va a Node.js
  ══════════════════════════════════════════════ */
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al registrar');

      setMessage({ text: '¡Cuenta creada! Ahora inicia sesión', type: 'success' });
      speak('Cuenta creada. Ahora inicia sesión.');
      setTimeout(() => setMode('login'), 2000);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
      speak('Error al crear la cuenta.');
    }
    setLoading(false);
  };

  /* ══════════════════════════════════════════════
     LOGIN CON CORREO — va a Node.js
  ══════════════════════════════════════════════ */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await apiFetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error de autenticación');

      saveSession(data.token, data.user);
      speak('Bienvenido de nuevo.');
      setMessage({ text: `¡Bienvenido ${data.user.name}! Redirigiendo…`, type: 'success' });
      setTimeout(() => redirectToApp(data.user), 1500);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
      speak('Acceso denegado.');
    }
    setLoading(false);
  };

  /* ══════════════════════════════════════════════
     GOOGLE LOGIN — Node.js verifica el token
  ══════════════════════════════════════════════ */
  /* eliminar handleGoogleLogin — ahora usa renderButton */

  const handleGoogleCallback = useCallback(async (response) => {
    setLoading(true);
    try {
      const res  = await apiFetch('/api/google-login', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error con Google');

      saveSession(data.token, data.user);
      speak('Acceso con Google exitoso. ¡Bienvenido!');
      redirectToApp(data.user);
    } catch (err) {
      setMessage({ text: err.message || 'Error con Google', type: 'error' });
    }
    setLoading(false);
  }, [navigate, speak]);

  /* ══════════════════════════════════════════════
     FACE ID LOGIN — Node.js devuelve perfiles y
     la comparación se hace aquí con face-api
  ══════════════════════════════════════════════ */
  const handleFaceLogin = async (descriptor) => {
    setLoading(true);
    try {
      /* Node.js devuelve todos los perfiles faciales */
      const res  = await apiFetch('/api/face-profiles');
      const data = await res.json();

      if (!res.ok || !data.profiles?.length) {
        speak('No hay rostros registrados. Regístrate primero.');
        setMessage({ text: 'Sin perfiles faciales. Registra tu rostro.', type: 'error' });
        setMode('login');
        setLoading(false);
        return;
      }

      /* Comparar localmente con face-api */
      let bestMatch = null;
      let bestDist  = Infinity;
      for (const profile of data.profiles) {
        const saved = new Float32Array(profile.descriptor);
        const dist  = faceapi.euclideanDistance(descriptor, saved);
        if (dist < bestDist) { bestDist = dist; bestMatch = profile; }
      }

      if (bestDist < FACE_MATCH_THRESHOLD && bestMatch) {
        /* ── Obtener datos completos del usuario (con id y progress) ── */
        let fullUser = { name: bestMatch.name, email: bestMatch.email, method: 'face', role: 'student', progress: {} };
        try {
          const uRes  = await apiFetch(`/api/user-by-email?email=${encodeURIComponent(bestMatch.email)}&autoCreateName=${encodeURIComponent(bestMatch.name)}`);
          const uData = await uRes.json();
          if (uRes.ok) fullUser = { ...fullUser, ...uData, method: 'face' };
        } catch { /* si falla, usar datos básicos */ }

        saveSession('face-id-session', fullUser);
        speak(`Identidad confirmada. Bienvenido, ${bestMatch.name}.`);
        setMessage({ text: `¡Hola ${bestMatch.name}! Redirigiendo…`, type: 'success' });
        setMode('login');
        setTimeout(() => redirectToApp(fullUser), 1500);
      } else {
        speak('Rostro no reconocido. Regístrate primero.');
        setMessage({ text: 'Rostro no reconocido. ¿Ya registraste tu cara?', type: 'error' });
        setMode('login');
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error de conexión con el servidor', type: 'error' });
      setMode('login');
    }
    setLoading(false);
  };

  /* ══════════════════════════════════════════════
     FACE ID REGISTRO — va a Node.js
  ══════════════════════════════════════════════ */
  const handleFaceRegister = async (descriptor) => {
    /* Cerrar escáner inmediatamente para no dejar pantalla estática */
    setMode('login');
    setLoading(true);
    try {
      const res  = await apiFetch('/api/face-profile', {
        method: 'POST',
        body: JSON.stringify({
          name:       faceRegName.trim(),
          email:      faceRegEmail.trim().toLowerCase(),
          descriptor: Array.from(descriptor),
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      speak(`¡Perfecto ${faceRegName}! Tu rostro fue registrado.`);
      setMessage({ text: '¡Rostro registrado! Ya puedes usar Face ID 🎉', type: 'success' });
      setFaceRegName('');
      setFaceRegEmail('');
    } catch (err) {
      setMessage({ text: err.message || 'Error al guardar el perfil facial', type: 'error' });
    }
    setLoading(false);
  };

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  const showFaceLoginScanner    = mode === 'face-login';
  const showFaceRegisterScanner = mode === 'face-scan-reg';

  return (
    <div className="login-page">

      {/* ══════ PANEL IZQUIERDO ══════ */}
      <div className="login-left">
        {/* Orbs de luz */}
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        {/* Signos flotantes */}
        <span className="fl-sign s1">🤟</span><span className="fl-sign s2">✋</span>
        <span className="fl-sign s3">👋</span><span className="fl-sign s4">🖐️</span>
        <span className="fl-sign s5">🤙</span>

        <div className="left-brand">
          <span className="left-mascot">🤟</span>
          <h1 className="left-title">VentoEdu</h1>
          <p className="left-tagline">La forma más divertida de aprender<br/>Lengua de Señas Mexicana</p>
        </div>

        <div className="feature-list">
          {[
            { icon:'🎮', title:'Aprende jugando',   desc:'Lecciones interactivas y gamificadas' },
            { icon:'🤟', title:'200+ señas',         desc:'Vocabulario completo de LSM' },
            { icon:'🏆', title:'Gana logros',        desc:'Sistema de puntos y recompensas' },
            { icon:'🔐', title:'Face ID',            desc:'Acceso biométrico seguro con IA' },
          ].map((f,i) => (
            <div key={i} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="stats-row">
          <div className="stat"><div className="stat-num">50K+</div><div className="stat-label">Estudiantes</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-num">200+</div><div className="stat-label">Señas</div></div>
          <div className="stat-divider" />
          <div className="stat"><div className="stat-num">4.9⭐</div><div className="stat-label">Valoración</div></div>
        </div>

        <div className="left-badge"><span />&nbsp;Node.js · Firebase · Face-API</div>
      </div>

      {/* ══════ PANEL DERECHO ══════ */}
      <div className="login-right">

      {/* Escáneres faciales (overlay) */}
      <AnimatePresence>
        {showFaceLoginScanner && (
          <FaceScanner key="face-login" mode="login" modelsLoaded={modelsLoaded}
            onResult={handleFaceLogin} onCancel={() => setMode('login')} speak={speak} />
        )}
        {showFaceRegisterScanner && (
          <FaceScanner key="face-register" mode="register" modelsLoaded={modelsLoaded}
            onResult={handleFaceRegister} onCancel={() => setMode('face-register')} speak={speak} />
        )}
      </AnimatePresence>

      <div className="login-card">
        <span className="login-mascot">🤟</span>
        <h1 className="login-title">Vento<span>Edu</span></h1>
        <p className="login-subtitle">Aprende lengua de señas jugando</p>


        {/* Alerta */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              {message.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ── MODO: LOGIN ── */}
          {mode === 'login' && (
            <motion.div key="login"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <form className="login-form" onSubmit={handleLogin}>
                <div>
                  <label className="form-label">Correo electrónico</label>
                  <div className="input-wrap">
                    <Mail size={18} className="input-icon"/>
                    <input className="field" type="email" placeholder="tu@correo.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="form-label">Contraseña</label>
                  <div className="input-wrap">
                    <Lock size={18} className="input-icon"/>
                    <input className="field" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" className="input-eye" onClick={() => setShowPassword(s => !s)}>
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-green" disabled={loading}>
                  {loading ? <Loader2 size={20} className="spin"/> : <ArrowRight size={20}/>}
                  {loading ? 'Verificando…' : 'Iniciar sesión'}
                </button>
              </form>

              <div className="divider">
                <div className="divider-line"/> <span>o continúa con</span> <div className="divider-line"/>
              </div>

              <div className="social-row">
                {GOOGLE_CLIENT_ID ? (
                  <div className="google-btn-wrapper">
                    <div ref={googleBtnRef} style={{ width:'100%' }} />
                    {!googleReady && (
                      <button className="btn btn-outline" disabled>
                        <Loader2 size={18} className="spin" /> Cargando Google…
                      </button>
                    )}
                  </div>
                ) : (
                  <button className="btn btn-outline" disabled title="Configura GOOGLE_CLIENT_ID en .env">
                    <Globe size={18} /> Google (sin configurar)
                  </button>
                )}
              </div>

              {/* Sección Face ID */}
              <div className="faceid-section">
                <span className="faceid-label"><ScanFace size={16}/> Reconocimiento Facial</span>
                {!modelsLoaded && (
                  <span className="models-badge">
                    <Loader2 size={12} className="spin"/> Cargando modelos IA…
                  </span>
                )}
                <div className="faceid-buttons">
                  <button className="btn btn-purple" disabled={!modelsLoaded || loading}
                    onClick={() => setMode('face-login')}>
                    <ScanFace size={18}/> Entrar con Face ID
                  </button>
                  <button className="btn btn-outline" disabled={!modelsLoaded || loading}
                    onClick={() => setMode('face-register')}>
                    <UserPlus size={18}/> Registrar rostro
                  </button>
                </div>
              </div>

              <button className="toggle-link" onClick={() => setMode('register-email')}>
                ¿Eres nuevo? ¡Crea una cuenta!
              </button>
            </motion.div>
          )}

          {/* ── MODO: REGISTRO CON EMAIL ── */}
          {mode === 'register-email' && (
            <motion.div key="register"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <form className="login-form" onSubmit={handleRegister}>
                <div>
                  <label className="form-label">Tu nombre</label>
                  <div className="input-wrap">
                    <User size={18} className="input-icon"/>
                    <input className="field" type="text" placeholder="¿Cómo te llamas?"
                      value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="form-label">Correo electrónico</label>
                  <div className="input-wrap">
                    <Mail size={18} className="input-icon"/>
                    <input className="field" type="email" placeholder="tu@correo.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="form-label">Contraseña</label>
                  <div className="input-wrap">
                    <Lock size={18} className="input-icon"/>
                    <input className="field" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                      value={password} onChange={e => setPassword(e.target.value)} required minLength={6}/>
                    <button type="button" className="input-eye" onClick={() => setShowPassword(s => !s)}>
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-green" disabled={loading}>
                  {loading ? <Loader2 size={20} className="spin"/> : <UserPlus size={20}/>}
                  {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
              </form>
              <button className="toggle-link" onClick={() => setMode('login')}>
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </motion.div>
          )}

          {/* ── MODO: REGISTRO FACIAL paso 1 (datos) ── */}
          {mode === 'face-register' && (
            <motion.div key="face-reg"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="face-reg-step">
                <span style={{ fontSize: '2.5rem', textAlign: 'center' }}>📸</span>
                <h3>Registrar tu rostro</h3>
                <p>Ingresa tus datos y luego escanearemos tu cara para que puedas entrar sin contraseña.</p>

                <div>
                  <label className="form-label">Tu nombre</label>
                  <div className="input-wrap">
                    <User size={18} className="input-icon"/>
                    <input className="field" type="text" placeholder="¿Cómo te llamas?"
                      value={faceRegName} onChange={e => setFaceRegName(e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label className="form-label">Tu correo electrónico</label>
                  <div className="input-wrap">
                    <Mail size={18} className="input-icon"/>
                    <input className="field" type="email" placeholder="tu@correo.com"
                      value={faceRegEmail} onChange={e => setFaceRegEmail(e.target.value)}/>
                  </div>
                </div>

                <button className="btn btn-purple"
                  disabled={!faceRegName.trim() || !faceRegEmail.trim() || !modelsLoaded}
                  onClick={() => setMode('face-scan-reg')}>
                  <ScanFace size={20}/> Escanear mi rostro
                </button>
                <button className="btn btn-outline" onClick={() => setMode('login')}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <div className="login-footer">
          <ShieldCheck size={13}/> Node.js + Firebase · VentoEdu
        </div>
      </div>{/* /login-card */}
      </div>{/* /login-right */}
    </div>
  );
};

export default Login;