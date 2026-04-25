import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, AlertCircle, CheckCircle2,
  ArrowRight, ShieldCheck, Eye, EyeOff, Loader2,
  ScanFace, UserPlus, Globe
} from 'lucide-react';
import { auth, googleProvider, db } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useVentoVoice } from '../hooks/useVentoVoice';
import * as faceapi from 'face-api.js';
import FaceScanner from '../components/FaceScanner';
import './Login.css';

/* ─── Umbrales de reconocimiento ─── */
const FACE_MATCH_THRESHOLD = 0.45;

/* ─────────────────────────────────────────────────────── */
const Login = () => {
  /* ── Modos de pantalla ──
     'login'         → pantalla inicial
     'register-email'→ registro con correo
     'face-login'    → abrir escáner en modo login
     'face-register' → paso 1: pedir nombre/correo
     'face-scan-reg' → paso 2: escanear rostro para registrar
  */
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [name, setName]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage]     = useState({ text: '', type: '' });
  const [loading, setLoading]     = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  /* Para el paso de registro facial */
  const [faceRegName, setFaceRegName]   = useState('');
  const [faceRegEmail, setFaceRegEmail] = useState('');

  const { speak } = useVentoVoice();

  /* ── Cargar modelos face-api.js y hacer warmup ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Cargar los tres modelos en paralelo
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);
        if (cancelled) return;

        // Warmup: hacer una inferencia en blanco para que WebGL compile shaders
        // así la primera detección real es instantánea
        try {
          const warmupCanvas = document.createElement('canvas');
          warmupCanvas.width  = 64;
          warmupCanvas.height = 64;
          await faceapi.detectSingleFace(
            warmupCanvas,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.9 })
          );
        } catch { /* silenciar — el canvas está en blanco a propósito */ }

        if (!cancelled) setModelsLoaded(true);
      } catch (err) {
        console.error('Error al cargar modelos:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);


  /* ── Limpiar mensaje automáticamente ── */
  useEffect(() => {
    if (!message.text) return;
    const t = setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    return () => clearTimeout(t);
  }, [message]);

  /* ── Reset campos al cambiar modo ── */
  useEffect(() => {
    setPassword('');
    setShowPassword(false);
    setMessage({ text: '', type: '' });
  }, [mode]);

  /* ══════════════════════════════════════════════════════
     LÓGICA EMAIL / CONTRASEÑA
  ══════════════════════════════════════════════════════ */
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      if (mode === 'register-email') {
        /* Registro con Firebase client SDK */
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        setMessage({ text: '¡Cuenta creada! Ya puedes iniciar sesión', type: 'success' });
        speak('Cuenta creada exitosamente. Ahora inicia sesión.');
        setTimeout(() => setMode('login'), 2500);
      } else {
        /* Login con correo */
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const u = cred.user;
        localStorage.setItem('vento_user', JSON.stringify({
          uid: u.uid, name: u.displayName || name || 'Estudiante', email: u.email,
        }));
        speak('Bienvenido de nuevo.');
        setMessage({ text: '¡Bienvenido! Redirigiendo…', type: 'success' });
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (err) {
      const msg = err.code === 'auth/user-not-found' ? 'Usuario no encontrado'
                : err.code === 'auth/wrong-password'  ? 'Contraseña incorrecta'
                : err.code === 'auth/email-already-in-use' ? 'El correo ya está registrado'
                : 'Error de autenticación';
      setMessage({ text: msg, type: 'error' });
      speak('Acceso denegado.');
    }
    setLoading(false);
  };

  /* ══════════════════════════════════════════════════════
     GOOGLE
  ══════════════════════════════════════════════════════ */
  const handleGoogle = async () => {
    setLoading(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, googleProvider);
      localStorage.setItem('vento_user', JSON.stringify({
        uid: res.user.uid, name: res.user.displayName, email: res.user.email,
      }));
      speak('Acceso con Google exitoso. ¡Bienvenido!');
      navigate('/dashboard');
    } catch (err) {
      setMessage({ text: 'Error con Google', type: 'error' });
    }
    setLoading(false);
  };

  /* ══════════════════════════════════════════════════════
     FACE ID – LOGIN
  ══════════════════════════════════════════════════════ */
  const handleFaceLogin = async (descriptor) => {
    setLoading(true);
    try {
      /* Descargar perfiles desde Firestore */
      const snap = await getDocs(collection(db, 'face_profiles'));
      if (snap.empty) {
        speak('No hay rostros registrados. Regístrate primero.');
        setMessage({ text: 'Sin perfiles faciales registrados', type: 'error' });
        setMode('login');
        setLoading(false);
        return;
      }

      let bestMatch = null;
      let bestDist  = Infinity;

      snap.forEach((doc) => {
        const data = doc.data();
        const saved = new Float32Array(data.descriptor);
        const dist  = faceapi.euclideanDistance(descriptor, saved);
        if (dist < bestDist) {
          bestDist  = dist;
          bestMatch = data;
        }
      });

      if (bestDist < FACE_MATCH_THRESHOLD && bestMatch) {
        localStorage.setItem('vento_user', JSON.stringify({
          uid: bestMatch.uid || 'face-user',
          name: bestMatch.name,
          email: bestMatch.email,
        }));
        speak(`Identidad confirmada. Bienvenido, ${bestMatch.name}.`);
        setMessage({ text: `¡Hola ${bestMatch.name}! Redirigiendo…`, type: 'success' });
        setMode('login');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        speak('Rostro no reconocido. Regístrate primero o intenta de nuevo.');
        setMessage({ text: 'Rostro no reconocido. ¿Ya registraste tu cara?', type: 'error' });
        setMode('login');
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error al verificar identidad', type: 'error' });
      setMode('login');
    }
    setLoading(false);
  };

  /* ══════════════════════════════════════════════════════
     FACE ID – REGISTRO
  ══════════════════════════════════════════════════════ */
  const handleFaceRegister = async (descriptor) => {
    // ✅ Cerrar el escáner INMEDIATAMENTE antes del await
    setMode('login');
    setLoading(true);
    try {
      await addDoc(collection(db, 'face_profiles'), {
        name: faceRegName.trim(),
        email: faceRegEmail.trim().toLowerCase(),
        descriptor: Array.from(descriptor),
        createdAt: new Date().toISOString(),
      });
      speak(`¡Perfecto, ${faceRegName}! Tu rostro fue registrado.`);
      setMessage({ text: `¡Rostro registrado! Ya puedes usar Face ID 🎉`, type: 'success' });
      setFaceRegName('');
      setFaceRegEmail('');
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Error al guardar el perfil facial', type: 'error' });
    }
    setLoading(false);
  };

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */

  /* Escáneres de cara (renderizados fuera del card) */
  const showFaceLoginScanner    = mode === 'face-login';
  const showFaceRegisterScanner = mode === 'face-scan-reg';

  return (
    <div className="login-page">
      {/* Blobs decorativos */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      {/* ── Escáneres (overlay) ── */}
      <AnimatePresence>
        {showFaceLoginScanner && (
          <FaceScanner
            key="scanner-login"
            mode="login"
            modelsLoaded={modelsLoaded}
            onResult={handleFaceLogin}
            onCancel={() => setMode('login')}
            speak={speak}
          />
        )}
        {showFaceRegisterScanner && (
          <FaceScanner
            key="scanner-register"
            mode="register"
            modelsLoaded={modelsLoaded}
            onResult={handleFaceRegister}
            onCancel={() => setMode('face-register')}
            speak={speak}
          />
        )}
      </AnimatePresence>

      {/* ── Card principal ── */}
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Mascota / logo */}
        <span className="login-mascot">🤟</span>
        <h1 className="login-title">
          Vento<span>Edu</span>
        </h1>
        <p className="login-subtitle">Aprende lengua de señas jugando</p>

        {/* Alerta */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {message.type === 'success'
                ? <CheckCircle2 size={18} />
                : <AlertCircle size={18} />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════════
            MODO: LOGIN
        ════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {mode === 'login' && (
            <motion.div key="login"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <form className="login-form" onSubmit={handleEmailAuth}>
                <div>
                  <label className="form-label">Correo electrónico</label>
                  <div className="input-wrap">
                    <Mail size={18} className="input-icon" />
                    <input className="field" type="email" placeholder="tu@correo.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="form-label">Contraseña</label>
                  <div className="input-wrap">
                    <Lock size={18} className="input-icon" />
                    <input className="field" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" className="input-eye" onClick={() => setShowPassword(s => !s)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-green" disabled={loading}>
                  {loading ? <Loader2 size={20} className="spin" /> : <ArrowRight size={20} />}
                  {loading ? 'Verificando…' : 'Iniciar sesión'}
                </button>
              </form>

              <div className="divider">
                <div className="divider-line" />
                <span>o continúa con</span>
                <div className="divider-line" />
              </div>

              <div className="social-row">
                <button className="btn btn-outline" onClick={handleGoogle} disabled={loading}>
                  <Globe size={20} /> Google
                </button>
              </div>

              {/* Sección Face ID */}
              <div className="faceid-section">
                <span className="faceid-label">
                  <ScanFace size={16} /> Reconocimiento Facial
                </span>
                {!modelsLoaded && (
                  <span className="models-badge">
                    <Loader2 size={12} className="spin" /> Cargando modelos IA…
                  </span>
                )}
                <div className="faceid-buttons">
                  <button
                    className="btn btn-purple"
                    disabled={!modelsLoaded || loading}
                    onClick={() => setMode('face-login')}
                  >
                    <ScanFace size={18} /> Entrar con Face ID
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={!modelsLoaded || loading}
                    onClick={() => setMode('face-register')}
                  >
                    <UserPlus size={18} /> Registrar rostro
                  </button>
                </div>
              </div>

              <button className="toggle-link" onClick={() => setMode('register-email')}>
                ¿Eres nuevo? ¡Crea una cuenta!
              </button>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════
              MODO: REGISTRO CON EMAIL
          ════════════════════════════════════════════════ */}
          {mode === 'register-email' && (
            <motion.div key="register"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <form className="login-form" onSubmit={handleEmailAuth}>
                <div>
                  <label className="form-label">Tu nombre</label>
                  <div className="input-wrap">
                    <User size={18} className="input-icon" />
                    <input className="field" type="text" placeholder="¿Cómo te llamas?"
                      value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="form-label">Correo electrónico</label>
                  <div className="input-wrap">
                    <Mail size={18} className="input-icon" />
                    <input className="field" type="email" placeholder="tu@correo.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="form-label">Contraseña</label>
                  <div className="input-wrap">
                    <Lock size={18} className="input-icon" />
                    <input className="field" type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres"
                      value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    <button type="button" className="input-eye" onClick={() => setShowPassword(s => !s)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-green" disabled={loading}>
                  {loading ? <Loader2 size={20} className="spin" /> : <UserPlus size={20} />}
                  {loading ? 'Creando cuenta…' : 'Crear cuenta'}
                </button>
              </form>

              <button className="toggle-link" onClick={() => setMode('login')}>
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════
              MODO: REGISTRO DE ROSTRO – paso 1 (datos)
          ════════════════════════════════════════════════ */}
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
                    <User size={18} className="input-icon" />
                    <input className="field" type="text" placeholder="¿Cómo te llamas?"
                      value={faceRegName} onChange={e => setFaceRegName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Tu correo electrónico</label>
                  <div className="input-wrap">
                    <Mail size={18} className="input-icon" />
                    <input className="field" type="email" placeholder="tu@correo.com"
                      value={faceRegEmail} onChange={e => setFaceRegEmail(e.target.value)} />
                  </div>
                </div>

                <button
                  className="btn btn-purple"
                  disabled={!faceRegName.trim() || !faceRegEmail.trim() || !modelsLoaded}
                  onClick={() => setMode('face-scan-reg')}
                >
                  <ScanFace size={20} /> Escanear mi rostro
                </button>

                <button className="btn btn-outline" onClick={() => setMode('login')}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="login-footer">
          <ShieldCheck size={13} />
          Cifrado con Firebase · VentoEdu
        </div>
      </motion.div>
    </div>
  );
};

export default Login;