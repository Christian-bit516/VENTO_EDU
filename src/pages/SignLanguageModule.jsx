// src/pages/SignLanguageModule.jsx
// Módulo de Lenguaje de Señas — conserva el diseño original VentoSign
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDetector } from '../hooks/useDetector.js';
import { LETRA_ES } from '../detectorLogica.js';
import './SignLanguageModule.css';

// ── Constantes ───────────────────────────────────────────────
const MAX_HISTORY   = 30;
const STABLE_FRAMES = 5;
const CONFIRM_FRAMES = 40;

const GUIDE = {
  "A": { hint: "Haz un puño. El pulgar descansa al costado del índice.", fingers: ["✊ pulgar al lado"] },
  "B": { hint: "Abre los 4 dedos juntos hacia arriba. El pulgar cruzado sobre la palma.", fingers: ["todos arriba", "pulgar cruzado"] },
  "C": { hint: "Curva todos los dedos como si agarraras un vaso. Forma de 'C'.", fingers: ["todos curvados", "espacio frontal"] },
  "D": { hint: "Sube solo el índice. El pulgar toca el medio y el anular formando un círculo.", fingers: ["índice arriba", "círculo con pulgar"] },
  "E": { hint: "Dobla todos los dedos muy hacia adentro, puntas sobre la palma.", fingers: ["todos muy doblados"] },
  "F": { hint: "Toca el pulgar con el índice formando un círculo. Los otros 3 dedos arriba.", fingers: ["pulgar+índice = círculo", "medio/anular/meñique arriba"] },
  "G": { hint: "El índice y el pulgar apuntan hacia un lado, como una pistola horizontal.", fingers: ["índice horizontal", "pulgar paralelo"] },
  "H": { hint: "El índice y el medio apuntan juntos hacia un lado.", fingers: ["2 dedos horizontales"] },
  "I": { hint: "Solo sube el meñique. El resto permanece cerrado.", fingers: ["solo meñique arriba"] },
  "K": { hint: "Índice y medio arriba. El pulgar toca el lado del medio.", fingers: ["índice y medio arriba", "pulgar al medio"] },
  "L": { hint: "El índice apunta hacia arriba y el pulgar apunta hacia afuera. Forma de 'L'.", fingers: ["índice arriba", "pulgar lateral"] },
  "M": { hint: "Dobla índice, medio y anular sobre el pulgar.", fingers: ["3 dedos sobre pulgar"] },
  "N": { hint: "Dobla índice y medio sobre el pulgar.", fingers: ["2 dedos sobre pulgar"] },
  "O": { hint: "Junta el pulgar con el índice y curva todos los dedos formando un círculo.", fingers: ["todos curvados", "pulgar toca índice"] },
  "P": { hint: "Como la K pero inclina la mano hacia abajo.", fingers: ["como K", "pero hacia abajo"] },
  "Q": { hint: "Índice y pulgar apuntando hacia abajo, como una G inclinada.", fingers: ["índice hacia abajo", "pulgar paralelo"] },
  "R": { hint: "Sube el índice y el medio y crúzalos uno sobre el otro.", fingers: ["índice y medio cruzados"] },
  "S": { hint: "Haz un puño y cruza el pulgar por encima de los dedos cerrados.", fingers: ["puño", "pulgar encima"] },
  "T": { hint: "El pulgar asoma entre el índice y el medio, todos los dedos cerrados.", fingers: ["puño", "pulgar entre índice y medio"] },
  "U": { hint: "Sube el índice y el medio juntos, pegados.", fingers: ["índice y medio juntos arriba"] },
  "V": { hint: "Sube el índice y el medio separados formando una 'V'.", fingers: ["índice y medio separados"] },
  "W": { hint: "Sube el índice, el medio y el anular.", fingers: ["3 dedos arriba"] },
  "X": { hint: "El índice forma un gancho (dobla solo la punta).", fingers: ["índice en gancho"] },
  "Y": { hint: "El pulgar y el meñique extendidos hacia afuera. Shaka 🤙", fingers: ["pulgar + meñique afuera"] },
};

const LESSON_LETTERS = {
  vocales: ["A", "E", "I", "O", "U"],
  abc:     ["A","B","C","D","E","F","G","H","I","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y"],
};

// ── Pantalla de inicio (diseño original VentoSign) ───────────
const SignHome = ({ onSelect, onBack }) => {
  const MODES = [
    {
      id: "detect", icon: "🤖",
      title: "Detector Libre",
      desc: "Muestra cualquier seña frente a la cámara y el sistema la identifica en tiempo real con IA.",
      color: "#00f2ff", badge: "KNN · TIEMPO REAL",
    },
    {
      id: "vocales", icon: "🅰️",
      title: "Aprende las Vocales",
      desc: "Aprende a hacer las señas de A, E, I, O, U paso a paso con retroalimentación inmediata.",
      color: "#a855f7", badge: "5 LETRAS · GUIADO",
      letters: ["A","E","I","O","U"],
    },
    {
      id: "abc", icon: "📚",
      title: "Aprende el Abecedario",
      desc: "Recorre todo el alfabeto del lenguaje de señas desde la A hasta la Y a tu propio ritmo.",
      color: "#22c55e", badge: "24 LETRAS · COMPLETO",
      letters: ["A","B","C","D","E","F","G","H","I","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y"],
    },
  ];

  return (
    <div className="sl-home">
      <div className="sl-bg-orbs">
        <div className="sl-orb sl-orb1" /><div className="sl-orb sl-orb2" /><div className="sl-orb sl-orb3" />
      </div>
      <div className="sl-home-inner">
        <header className="sl-home-header">
          <button className="sl-back-btn" onClick={onBack}>← Dashboard</button>
          <div className="sl-brand">
            <span className="sl-brand-icon">✋</span>
            <h1 className="sl-brand-name">Vento<span className="sl-brand-accent">Sign</span></h1>
          </div>
          <div style={{width:'120px'}} />
        </header>

        <section className="sl-hero">
          <div className="sl-hero-floating-hands">
            {[["✋","A"],["🤟","Y"],["🤙","Shaka"],["✌️","V"],["👌","F"]].map(([emoji, letter]) => (
              <div key={letter+emoji} className="sl-float-hand">
                <span>{emoji}</span>
                <span className="sl-hand-letter">{letter}</span>
              </div>
            ))}
          </div>
          <p className="sl-tagline">Aprende Lenguaje de Señas con Inteligencia Artificial</p>
          <div className="sl-hero-stats">
            <div className="sl-hero-stat">
              <span className="sl-hero-stat-value">24</span>
              <span className="sl-hero-stat-label">Letras del ABC</span>
            </div>
            <div className="sl-hero-stat">
              <span className="sl-hero-stat-value">🧠</span>
              <span className="sl-hero-stat-label">IA en tiempo real</span>
            </div>
            <div className="sl-hero-stat">
              <span className="sl-hero-stat-value">3</span>
              <span className="sl-hero-stat-label">Modos de estudio</span>
            </div>
          </div>
        </section>

        <p className="sl-section-title">Elige un modo para empezar</p>

        <div className="sl-modes-grid">
          {MODES.map(mode => (
            <button
              key={mode.id}
              className="sl-mode-card"
              style={{ '--card-accent': mode.color }}
              onClick={() => onSelect(mode.id)}
            >
              <div className="sl-card-top-bar" />
              <div className="sl-mc-icon-wrap">
                <span>{mode.icon}</span>
              </div>
              <div className="sl-mc-badge" style={{ color: mode.color, borderColor: mode.color }}>{mode.badge}</div>
              <h2 className="sl-mc-title">{mode.title}</h2>
              <p className="sl-mc-desc">{mode.desc}</p>
              {mode.letters && (
                <div className="sl-mc-letters">
                  {mode.letters.slice(0, 8).map(l => (
                    <span key={l} className="sl-letter-chip">{l}</span>
                  ))}
                  {mode.letters.length > 8 && (
                    <span className="sl-letter-chip sl-chip-more">+{mode.letters.length - 8}</span>
                  )}
                </div>
              )}
              <div className="sl-mc-footer">
                <span className="sl-mc-cta">Comenzar ahora</span>
                <span className="sl-mc-arrow">→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="sl-footer-text">Powered by MediaPipe · Clasificador KNN personalizado</p>
      </div>
    </div>
  );
};

// ── Detector libre ───────────────────────────────────────────
const SignDetector = ({ onBack }) => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const bufferRef = useRef({ val: null, count: 0 });

  const [letra,       setLetra]       = useState("—");
  const [confidence,  setConfidence]  = useState(0);
  const [history,     setHistory]     = useState([]);
  const [handVisible, setHandVisible] = useState(false);

  const handleResult = useCallback(({ letter, confidence: conf, hasHand }) => {
    setHandVisible(hasHand);
    const buf = bufferRef.current;
    if (letter === buf.val) {
      buf.count++;
      if (buf.count === STABLE_FRAMES) {
        setLetra(letter);
        setConfidence(conf);
        if (letter !== "—") {
          setHistory(prev => {
            const next = [...prev, letter];
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
          });
        }
      }
    } else {
      buf.val   = letter;
      buf.count = 1;
    }
  }, []);

  const { status, msg } = useDetector({ videoRef, canvasRef, onResult: handleResult });
  const isLoaded   = status === "ready";
  const isError    = status === "error";
  const traduccion = LETRA_ES[letra] || "";

  return (
    <div className="sl-detector">
      <div className="sl-bg-orbs">
        <div className="sl-orb sl-orb1" /><div className="sl-orb sl-orb2" /><div className="sl-orb sl-orb3" />
      </div>
      <div className="sl-layout">
        <header className="sl-header">
          <div className="sl-header-left">
            <button className="sl-back-btn" onClick={onBack}>← Inicio</button>
            <span className="sl-header-emoji">🤖</span>
            <h1 className="sl-header-title">Detector<span className="sl-brand-accent"> Libre</span></h1>
          </div>
          <div className={`sl-status-pill ${isLoaded ? "online" : isError ? "error" : "loading"}`}>
            <span className="sl-status-dot" />
            <span>{isLoaded ? "🧠 KNN Activo" : isError ? "Error" : msg}</span>
          </div>
        </header>

        <main className="sl-main-grid">
          <div className="sl-camera-section">
            <div className={`sl-vision-box ${handVisible ? "hand-on" : ""}`}>
              {!isLoaded && !isError && (
                <div className="sl-overlay"><div className="sl-spinner" /><p>{msg}</p></div>
              )}
              {isError && (
                <div className="sl-overlay"><span className="sl-err-icon">⚠️</span><p>{msg}</p></div>
              )}
              <video ref={videoRef} autoPlay playsInline muted className="sl-webcam" />
              <canvas ref={canvasRef} className="sl-canvas" />
              <div className="sl-corners">
                <div className="slc tl" /><div className="slc tr" />
                <div className="slc bl" /><div className="slc br" />
              </div>
              <div className="sl-live"><span className="sl-live-dot" />LIVE</div>
            </div>
          </div>

          <div className="sl-side-panel">
            <div className="sl-card sl-card-result">
              <p className="sl-card-label">Seña Detectada</p>
              <div className={`sl-big-letter ${handVisible ? "lit" : ""}`}>{letra}</div>
              {handVisible && confidence > 0 && (
                <>
                  <div className="sl-conf-track"><div className="sl-conf-fill" style={{ width: `${confidence}%` }} /></div>
                  <span className="sl-conf-pct">{confidence}% confianza</span>
                </>
              )}
              {traduccion && <p className="sl-traduccion">{traduccion}</p>}
              <p className="sl-card-hint">{handVisible ? "Mano detectada ✓" : "Coloca tu mano frente a la cámara"}</p>
            </div>

            <div className="sl-card">
              <p className="sl-card-label">Leyenda de colores</p>
              <div className="sl-legend">
                {[
                  { color: "#ff6b6b", name: "Pulgar" },
                  { color: "#00f2ff", name: "Índice" },
                  { color: "#a855f7", name: "Medio" },
                  { color: "#22c55e", name: "Anular" },
                  { color: "#f59e0b", name: "Meñique" },
                ].map(({ color, name }) => (
                  <div key={name} className="sl-legend-row">
                    <span className="sl-legend-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sl-card sl-card-history">
              <div className="sl-history-header">
                <p className="sl-card-label">Historial</p>
                <button className="sl-clear-btn" onClick={() => setHistory([])}>Limpiar</button>
              </div>
              <div className="sl-history-text">
                {history.length === 0
                  ? <span className="sl-history-empty">Las letras aparecerán aquí…</span>
                  : history.join("")}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// ── XP por letra según modo
const XP_PER_LETTER = { vocales: 15, abc: 20 };

// ── Modo Aprendizaje ─────────────────────────────────────────
const SignLearn = ({ type, onBack }) => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const { user, updateProgress } = useAuth();

  const letters = LESSON_LETTERS[type];
  // Siempre guardamos bajo 'signlanguage' — la clave que lee el dashboard
  const MODULE_KEY = 'signlanguage';
  const completedField = type === 'vocales' ? 'completedVocales' : 'completedAbc';
  const xpPerLetter = XP_PER_LETTER[type] || 15;

  const [index,       setIndex]       = useState(0);
  const [matched,     setMatched]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [detected,    setDetected]    = useState("—");
  const [hasHand,     setHasHand]     = useState(false);
  const [totalXp,     setTotalXp]     = useState(() => user?.progress?.[MODULE_KEY]?.xp || 0);
  const [sessionXp,   setSessionXp]   = useState(0);
  const [streak,      setStreak]      = useState(() => user?.progress?.[MODULE_KEY]?.streak || 0);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpGained,    setXpGained]    = useState(0);
  const [completedArr,setCompletedArr]= useState(() => user?.progress?.[MODULE_KEY]?.[completedField] || []);
  const matchCountRef = useRef(0);

  const currentLetter    = letters[index];
  const guide            = GUIDE[currentLetter] || { hint: "", fingers: [] };
  const currentLetterRef = useRef(currentLetter);
  const matchedRef       = useRef(false);

  useEffect(() => { currentLetterRef.current = currentLetter; }, [currentLetter]);
  useEffect(() => { matchedRef.current = matched; }, [matched]);

  const handleResult = useCallback(({ letter, hasHand: hand }) => {
    setDetected(letter);
    setHasHand(hand);
    if (matchedRef.current) return;
    if (letter === currentLetterRef.current && hand) {
      matchCountRef.current++;
      const pct = Math.min((matchCountRef.current / CONFIRM_FRAMES) * 100, 100);
      setProgress(pct);
      if (matchCountRef.current >= CONFIRM_FRAMES) {
        setMatched(true);
        matchedRef.current = true;
        setProgress(100);
        // Award XP for this letter
        const earned = xpPerLetter;
        setXpGained(earned);
        setShowXpPopup(true);
        setTimeout(() => setShowXpPopup(false), 1500);
        setSessionXp(prev => prev + earned);
        setTotalXp(prev => prev + earned);
        setCompletedArr(prev => [...new Set([...prev, currentLetterRef.current])]);
      }
    } else {
      matchCountRef.current = Math.max(0, matchCountRef.current - 2);
      setProgress(Math.max(0, (matchCountRef.current / CONFIRM_FRAMES) * 100));
    }
  }, [xpPerLetter]);

  const { status, msg } = useDetector({ videoRef, canvasRef, onResult: handleResult });

  const next = () => {
    if (index + 1 >= letters.length) {
      // Guardar bajo 'signlanguage' — clave que el dashboard ya lee
      const newStreak = streak + 1;
      const newXp = totalXp; // ya está actualizado con la última letra
      setStreak(newStreak);
      setDone(true);
      updateProgress(MODULE_KEY, {
        xp: newXp,
        level: Math.floor(newXp / 100) + 1,
        streak: newStreak,
        [completedField]: completedArr,
        lastCompleted: new Date().toISOString(),
      });
    } else {
      setIndex(i => i + 1);
      setMatched(false); matchedRef.current = false;
      setProgress(0); matchCountRef.current = 0;
    }
  };

  const skipLetter = () => {
    if (index + 1 >= letters.length) { setDone(true); }
    else {
      setIndex(i => i + 1);
      setMatched(false); matchedRef.current = false;
      setProgress(0); matchCountRef.current = 0;
    }
  };

  const restart = () => {
    setIndex(0); setMatched(false); matchedRef.current = false;
    setDone(false); setProgress(0); matchCountRef.current = 0;
    setSessionXp(0);
  };

  const title = type === "vocales" ? "Aprende las Vocales" : "Aprende el Abecedario";

  if (done) {
    return (
      <div className="sl-done-screen">
        <div className="sl-bg-orbs"><div className="sl-orb sl-orb1" /><div className="sl-orb sl-orb2" /></div>
        <div className="sl-done-inner">
          <div className="sl-done-emoji">🎉</div>
          <h1 className="sl-done-title">¡Completado!</h1>
          <p className="sl-done-sub">
            Terminaste {type === "vocales" ? "las 5 vocales" : "las 24 letras del abecedario"}. ¡Excelente trabajo!
          </p>
          {/* Stats de sesión */}
          <div className="sl-done-stats">
            <div className="sl-done-stat">
              <span className="sl-done-stat-val sl-stat-xp">+{sessionXp}</span>
              <span className="sl-done-stat-lbl">XP Ganado</span>
            </div>
            <div className="sl-done-stat">
              <span className="sl-done-stat-val sl-stat-streak">🔥 {streak}</span>
              <span className="sl-done-stat-lbl">Racha</span>
            </div>
            <div className="sl-done-stat">
              <span className="sl-done-stat-val sl-stat-total">⚡ {totalXp}</span>
              <span className="sl-done-stat-lbl">XP Total</span>
            </div>
          </div>
          <div className="sl-done-chips">
            {letters.map(l => <span key={l} className="sl-done-chip">{l}</span>)}
          </div>
          <div className="sl-done-actions">
            <button className="sl-done-btn primary" onClick={restart}>🔄 Repetir lección</button>
            <button className="sl-done-btn secondary" onClick={onBack}>🏠 Inicio</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sl-learn">
      <div className="sl-bg-orbs"><div className="sl-orb sl-orb1" /><div className="sl-orb sl-orb2" /></div>

      {/* XP Popup */}
      {showXpPopup && (
        <div className="sl-xp-popup">
          <div className="sl-xp-popup-val">+{xpGained}</div>
          <div className="sl-xp-popup-lbl">XP</div>
        </div>
      )}

      <header className="sl-learn-header">
        <button className="sl-back-btn" onClick={onBack}>← Inicio</button>
        <h1 className="sl-learn-title">{title}</h1>
        {/* XP / Streak en header */}
        <div className="sl-learn-topstats">
          <span className="sl-topstat">⚡ {totalXp} XP</span>
          <span className="sl-topstat">🔥 {streak}</span>
        </div>
      </header>
      {/* Pill progress */}
      <div className="sl-progress-pills-wrap">
        <div className="sl-progress-pills">
          {letters.map((l, i) => (
            <div key={l} className={`sl-pp ${i < index ? "done" : i === index ? "current" : ""}`}>
              {i < index ? "✓" : l}
            </div>
          ))}
        </div>
      </div>

      <main className="sl-learn-body">
        <div className="sl-learn-cam-col">
          <div className={`sl-vision-box ${hasHand ? "hand-on" : ""} ${matched ? "matched" : ""}`}>
            {status === "loading" && (
              <div className="sl-overlay"><div className="sl-spinner" /><p>{msg}</p></div>
            )}
            <video ref={videoRef} autoPlay playsInline muted className="sl-webcam" />
            <canvas ref={canvasRef} className="sl-canvas" />
            <div className="sl-corners">
              <div className="slc tl" /><div className="slc tr" />
              <div className="slc bl" /><div className="slc br" />
            </div>
            <div className={`sl-detect-bubble ${detected === currentLetter ? "correct" : ""}`}>{detected}</div>
            {matched && (
              <div className="sl-success-overlay">
                <div className="sl-success-check">✓</div><p>¡Perfecto!</p>
              </div>
            )}
          </div>

          <div className="sl-fill-bar">
            <div className="sl-fill-inner" style={{
              width: `${progress}%`,
              background: matched ? "#22c55e" : "linear-gradient(90deg, #a855f7, #00f2ff)",
            }} />
          </div>
          <p className="sl-fill-hint">
            {matched
              ? "¡Muy bien! Haz clic en Siguiente →"
              : hasHand
                ? detected === currentLetter
                  ? `Mantén la posición… ${Math.round(progress)}%`
                  : "Ajusta tu mano para que coincida con la letra"
                : "Coloca tu mano frente a la cámara"}
          </p>
        </div>

        <div className="sl-guide-col">
          <div className="sl-card sl-guide-letter-card">
            <p className="sl-card-label">Letra a aprender</p>
            <div className="sl-guide-big-letter">{currentLetter}</div>
            <div className="sl-guide-counter">{index + 1} de {letters.length}</div>
          </div>

          <div className="sl-card">
            <p className="sl-card-label">¿Cómo hacerla?</p>
            <p className="sl-guide-hint">{guide.hint}</p>
            <div className="sl-guide-fingers">
              {guide.fingers.map((f, i) => (
                <span key={i} className="sl-finger-chip">{f}</span>
              ))}
            </div>
          </div>

          <div className="sl-guide-actions">
            <button className={`sl-next-btn ${matched ? "ready" : ""}`} onClick={next} disabled={!matched}>
              {index + 1 === letters.length ? "🎉 Finalizar" : "Siguiente →"}
            </button>
            {!matched && (
              <button className="sl-skip-btn" onClick={skipLetter}>Saltar esta letra</button>
            )}
          </div>

          <div className="sl-mini-map">
            {letters.map((l, i) => (
              <div key={l} className={`sl-mm ${i < index ? "mm-done" : i === index ? "mm-current" : "mm-pending"}`}>
                {i < index ? "✓" : l}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────
const SignLanguageModule = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("home");
  const [mode,   setMode]   = useState(null);

  const handleSelect = (id) => {
    if (id === "detect") { setScreen("detect"); }
    else { setMode(id); setScreen("learn"); }
  };

  const goHome = () => setScreen("home");
  const goBack = () => navigate("/dashboard");

  if (screen === "detect") return <SignDetector onBack={goHome} />;
  if (screen === "learn")  return <SignLearn type={mode} onBack={goHome} />;
  return <SignHome onSelect={handleSelect} onBack={goBack} />;
};

export default SignLanguageModule;
