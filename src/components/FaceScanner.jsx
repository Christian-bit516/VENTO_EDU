import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { X, Loader2, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import * as faceapi from 'face-api.js';

/**
 * FaceScanner — versión optimizada para velocidad
 * Props:
 *   mode         → 'login' | 'register'
 *   modelsLoaded → bool
 *   onResult     → (descriptor: Float32Array) => void
 *   onCancel     → () => void
 *   speak        → (text: string) => void
 */
const FaceScanner = ({ mode = 'login', modelsLoaded, onResult, onCancel, speak }) => {
  const videoRef        = useRef(null);
  const canvasRef       = useRef(null);
  const reqRef          = useRef(null);
  const streamRef       = useRef(null);
  const lastFrameRef    = useRef(0);      // ← para throttle del render loop
  const isCapturingRef  = useRef(false);  // ← evita doble captura

  const { faceLandmarker, mediaPipeLoaded } = useMediaPipe();
  const faceLandmarkerRef = useRef(faceLandmarker);
  useEffect(() => { faceLandmarkerRef.current = faceLandmarker; }, [faceLandmarker]);

  const [camStatus,    setCamStatus]    = useState('INICIANDO');
  const [actionState,  setActionState]  = useState('idle');
  const [actionMsg,    setActionMsg]    = useState('');
  const [faceDetected, setFaceDetected] = useState(false);

  const isLogin = mode === 'login';
  const accent  = isLogin ? '#ce82ff' : '#58cc02';

  /* ─────────────────────────────────────────────────
     RENDER LOOP — throttled a ~20 FPS
     (suficiente para ver los landmarks sin ahogar la CPU)
  ───────────────────────────────────────────────── */
  const renderLoop = useCallback((timestamp) => {
    // Throttle: skip frames para mantener ~20 fps
    const TARGET_FPS = 20;
    const interval   = 1000 / TARGET_FPS;

    if (timestamp - lastFrameRef.current < interval) {
      reqRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    lastFrameRef.current = timestamp;

    const video    = videoRef.current;
    const canvas   = canvasRef.current;
    const detector = faceLandmarkerRef.current;

    if (!detector || !video || video.readyState < 4 || !canvas || isCapturingRef.current) {
      reqRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (canvas.width !== video.videoWidth) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    let results;
    try {
      results = detector.detectForVideo(video, performance.now());
    } catch {
      reqRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (results.faceLandmarks?.length > 0) {
      drawMesh(ctx, results.faceLandmarks[0], canvas.width, canvas.height, isLogin);
      setFaceDetected(true);
      setCamStatus('LISTO');
    } else {
      setFaceDetected(false);
      setCamStatus('BUSCANDO');
    }

    reqRef.current = requestAnimationFrame(renderLoop);
  }, []); // sin dependencias para que la ref sea estable

  /* ─────────────────────────────────────────────────
     DIBUJO DE MALLA
  ───────────────────────────────────────────────── */
  const drawMesh = (ctx, landmarks, w, h, loginMode) => {
    const cx = landmarks.reduce((a, p) => a + p.x, 0) / landmarks.length;
    const pt = (p) => ({
      x: ((p.x - cx) * 1.03 + cx) * w,
      y: p.y * h - 4,
    });

    // Tessellation
    ctx.lineWidth   = 0.8;
    ctx.strokeStyle = loginMode ? 'rgba(206,130,255,0.28)' : 'rgba(88,204,2,0.28)';
    ctx.beginPath();
    for (const conn of (FaceLandmarker.FACE_LANDMARKS_TESSELATION ?? [])) {
      const i1 = conn.start ?? conn[0];
      const i2 = conn.end   ?? conn[1];
      if (!landmarks[i1] || !landmarks[i2]) continue;
      const p1 = pt(landmarks[i1]);
      const p2 = pt(landmarks[i2]);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // Óvalo
    ctx.lineWidth   = 2;
    ctx.strokeStyle = loginMode ? 'rgba(206,130,255,0.9)' : 'rgba(88,204,2,0.9)';
    ctx.beginPath();
    for (const o of (FaceLandmarker.FACE_LANDMARKS_FACE_OVAL ?? [])) {
      const i1 = o.start ?? o[0];
      const i2 = o.end   ?? o[1];
      if (!landmarks[i1] || !landmarks[i2]) continue;
      const p1 = pt(landmarks[i1]);
      const p2 = pt(landmarks[i2]);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // Nodos
    const col = loginMode ? '#ce82ff' : '#58cc02';
    ctx.fillStyle   = col;
    ctx.shadowBlur  = 7;
    ctx.shadowColor = col;
    for (let i = 0; i < landmarks.length; i += 14) {
      const p = pt(landmarks[i]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  };

  /* ─────────────────────────────────────────────────
     CÁMARA
  ───────────────────────────────────────────────── */
  const stopCamera = useCallback(() => {
    if (reqRef.current) cancelAnimationFrame(reqRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // Resolución reducida → menos datos que procesar
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCamStatus('BUSCANDO');
          reqRef.current = requestAnimationFrame(renderLoop);
        };
      }
    } catch {
      setCamStatus('ERROR');
    }
  }, [renderLoop]);

  useEffect(() => {
    if (mediaPipeLoaded) startCamera();
    return stopCamera;
  }, [mediaPipeLoaded, startCamera, stopCamera]);

  /* ─────────────────────────────────────────────────
     CAPTURA OPTIMIZADA
     1) Detener render loop (libera CPU)
     2) Dibujar frame en canvas pequeño 320×240
     3) Correr face-api sobre el canvas pequeño
     4) Reanudar render loop si hay error
  ───────────────────────────────────────────────── */
  const handleCapture = async () => {
    if (!modelsLoaded || !faceDetected || actionState !== 'idle') return;
    if (isCapturingRef.current) return;

    isCapturingRef.current = true;
    setActionState('scanning');
    setActionMsg(isLogin ? 'Verificando identidad…' : 'Capturando tu rostro…');

    // ✅ NO cancelamos el render loop → la malla sigue animada
    try {
      const video = videoRef.current;

      // Canvas pequeño para detección rápida (4x más rápido que 640×480)
      const detectCanvas = document.createElement('canvas');
      detectCanvas.width  = 320;
      detectCanvas.height = 240;
      detectCanvas.getContext('2d').drawImage(video, 0, 0, 320, 240);

      const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 });

      const detection = await faceapi
        .detectSingleFace(detectCanvas, options)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        speak?.('No pude capturar el rostro. Acércate un poco más.');
        setActionState('error');
        setActionMsg('No se detectó un rostro claro. Acércate más.');
        setTimeout(() => {
          setActionState('idle');
          setActionMsg('');
          isCapturingRef.current = false;
        }, 2500);
        return;
      }

      // ✅ Éxito: mostrar overlay verde, luego llamar onResult SIN delay largo
      setActionState('success');
      setActionMsg(isLogin ? '¡Identidad detectada!' : '¡Rostro capturado!');
      isCapturingRef.current = false;

      // Parar cámara DESPUÉS de confirmar éxito
      setTimeout(() => {
        stopCamera();
        onResult(detection.descriptor);
      }, 800);

    } catch (err) {
      console.error('FaceScanner error:', err);
      setActionState('error');
      setActionMsg('Error al procesar. Intenta de nuevo.');
      setTimeout(() => {
        setActionState('idle');
        setActionMsg('');
        isCapturingRef.current = false;
      }, 2500);
    }
  };

  /* ─────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────── */
  const statusColor = {
    INICIANDO: '#aaa',
    BUSCANDO:  '#ffaa00',
    LISTO:     accent,
    ERROR:     '#ff4b4b',
  }[camStatus] ?? '#aaa';

  const statusLabel = {
    INICIANDO: 'Iniciando cámara…',
    BUSCANDO:  'Buscando tu rostro…',
    LISTO:     'Rostro detectado ✓',
    ERROR:     'Cámara no disponible',
  }[camStatus];

  const captureReady = faceDetected && actionState === 'idle' && modelsLoaded;
  const title        = isLogin ? 'Acceder con Face ID' : 'Registrar mi rostro';
  const emoji        = isLogin ? '🔐' : '📸';
  const btnLabel     = isLogin ? 'Verificar identidad' : 'Guardar mi rostro';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={S.overlay}
    >
      <motion.div
        initial={{ scale: 0.88, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        style={S.card}
      >
        {/* Cerrar */}
        <button style={S.closeBtn} onClick={onCancel}>
          <X size={20} />
        </button>

        {/* Header */}
        <div style={S.header}>
          <span style={{ fontSize: '2.2rem' }}>{emoji}</span>
          <h2 style={S.title}>{title}</h2>
          <p style={S.subtitle}>
            {isLogin
              ? 'Mira directo a la cámara y presiona el botón'
              : 'Mira directo a la cámara para registrar tu rostro'}
          </p>
        </div>

        {/* Visor */}
        <div style={{ ...S.viewfinder, borderColor: faceDetected ? accent : '#e0e0e0' }}>
          <video ref={videoRef} autoPlay muted playsInline style={S.video} />
          <canvas ref={canvasRef} style={S.canvas} />

          {/* Esquinas */}
          {['tl','tr','bl','br'].map(pos => (
            <div key={pos} style={{ ...S.corner, ...cornerPos(pos), borderColor: accent }} />
          ))}

          {/* Línea de escaneo buscando */}
          {camStatus === 'BUSCANDO' && (
            <motion.div
              style={{ ...S.scanLine, background: accent }}
              animate={{ top: ['8%', '88%', '8%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* ✅ Overlay PROCESANDO: pulsación sobre la malla (malla sigue viva) */}
          {actionState === 'scanning' && (
            <motion.div
              style={S.scanningOverlay}
              animate={{ opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            >
              <Loader2 size={52} color="#fff" style={{ animation: 'spin360 0.7s linear infinite' }} />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem', marginTop: 8 }}>
                {isLogin ? 'Analizando…' : 'Capturando…'}
              </span>
            </motion.div>
          )}

          {/* Overlay éxito */}
          {actionState === 'success' && (
            <div style={S.successOverlay}>
              <CheckCircle2 size={60} color="#fff" />
            </div>
          )}
        </div>

        {/* Pill de estado */}
        <div style={S.statusRow}>
          <motion.div
            style={{ ...S.statusDot, background: statusColor }}
            animate={{ scale: camStatus === 'LISTO' ? [1, 1.4, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 1.1 }}
          />
          <span style={{ ...S.statusText, color: statusColor }}>{statusLabel}</span>
        </div>

        {/* Mensaje de acción */}
        <AnimatePresence>
          {actionMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                ...S.actionMsg,
                background: actionState === 'success' ? '#e8f9e0'
                          : actionState === 'error'   ? '#ffe5e5' : '#f0f0f0',
                color: actionState === 'success' ? '#2a7a0a'
                     : actionState === 'error'   ? '#aa0000' : '#555',
                border: `2px solid ${
                  actionState === 'success' ? '#58cc02'
                : actionState === 'error'   ? '#ff4b4b' : '#ddd'
                }`,
              }}
            >
              {actionState === 'success'  && <CheckCircle2 size={15} />}
              {actionState === 'error'    && <AlertCircle  size={15} />}
              {actionState === 'scanning' && <Loader2 size={15} style={{ animation: 'spin360 0.8s linear infinite' }} />}
              {actionMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón captura */}
        <button
          style={{
            ...S.captureBtn,
            background: captureReady ? accent : '#d7d7d7',
            boxShadow: captureReady
              ? `0 5px 0 ${isLogin ? '#9c44d4' : '#3d8f00'}`
              : '0 5px 0 #bbb',
            cursor: captureReady ? 'pointer' : 'not-allowed',
            opacity: captureReady ? 1 : 0.65,
            transform: actionState === 'scanning' ? 'translateY(5px)' : 'none',
          }}
          disabled={!captureReady}
          onClick={handleCapture}
        >
          {actionState === 'scanning'
            ? <><Loader2 size={20} style={{ animation: 'spin360 0.8s linear infinite' }} /> Procesando…</>
            : <><Camera size={20} /> {btnLabel}</>
          }
        </button>

        {/* Notas */}
        <p style={S.note}>
          {isLogin
            ? '¿Sin registro? Cierra y usa "Registrar rostro".'
            : '🔒 Tu perfil facial se cifra y guarda en la nube.'}
        </p>
      </motion.div>

      <style>{`
        @keyframes spin360 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

/* ─── Posición de esquinas ─── */
const cornerPos = (pos) => ({
  top:    pos.includes('t') ? -2 : 'auto',
  bottom: pos.includes('b') ? -2 : 'auto',
  left:   pos.includes('l') ? -2 : 'auto',
  right:  pos.includes('r') ? -2 : 'auto',
  borderTopWidth:    pos.includes('t') ? 3 : 0,
  borderBottomWidth: pos.includes('b') ? 3 : 0,
  borderLeftWidth:   pos.includes('l') ? 3 : 0,
  borderRightWidth:  pos.includes('r') ? 3 : 0,
});

/* ─── Estilos ─── */
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Nunito', sans-serif",
  },
  card: {
    position: 'relative',
    width: '100%', maxWidth: '390px',
    background: '#fff',
    borderRadius: '28px',
    border: '2.5px solid #e5e5e5',
    boxShadow: '0 8px 0 #d7d7d7, 0 24px 60px rgba(0,0,0,0.18)',
    padding: '28px 24px 22px',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    background: '#f5f5f5', border: 'none', borderRadius: '12px',
    width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#888',
  },
  header: {
    marginBottom: '14px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
  },
  title:    { margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#3c3c3c' },
  subtitle: { margin: 0, fontSize: '0.8rem', color: '#afafaf', fontWeight: 600 },
  viewfinder: {
    position: 'relative',
    width: '240px', height: '240px',
    margin: '0 auto 12px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '3px solid',
    background: '#111',
    transition: 'border-color 0.4s ease',
  },
  video: {
    width: '100%', height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  canvas: {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%',
    zIndex: 5, pointerEvents: 'none',
    objectFit: 'cover',
    transform: 'scaleX(-1)',
  },
  corner: {
    position: 'absolute', width: 18, height: 18,
    borderStyle: 'solid', zIndex: 10,
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0,
    height: '2px', zIndex: 8, opacity: 0.8, borderRadius: '2px',
  },
  scanningOverlay: {
    position: 'absolute', inset: 0, zIndex: 14,
    background: 'rgba(0,0,0,0.52)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
  },
  successOverlay: {
    position: 'absolute', inset: 0, zIndex: 15,
    background: 'rgba(88,204,2,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
  },
  statusRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    marginBottom: '8px',
  },
  statusDot:  { width: 9, height: 9, borderRadius: '50%', transition: 'background 0.3s' },
  statusText: { fontSize: '0.8rem', fontWeight: 800, transition: 'color 0.3s' },
  actionMsg: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '9px 12px', borderRadius: '13px',
    fontSize: '0.83rem', fontWeight: 700,
    marginBottom: '10px',
  },
  captureBtn: {
    width: '100%', padding: '13px',
    border: 'none', borderRadius: '18px',
    color: '#fff', fontSize: '1rem', fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    fontFamily: "'Nunito', sans-serif",
    transition: 'transform 0.1s, box-shadow 0.1s, background 0.3s, opacity 0.2s',
  },
  note: {
    marginTop: '10px', fontSize: '0.72rem',
    color: '#afafaf', fontWeight: 600, lineHeight: 1.4,
  },
};

export default FaceScanner;