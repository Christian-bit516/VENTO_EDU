import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';
import { ShieldCheck, Camera, LogOut, RefreshCw, UserCheck } from 'lucide-react';
import { useVentoVoice } from "../hooks/useVentoVoice";

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [scanStatus, setScanStatus] = useState('IDLE'); // IDLE, SCANNING, MATCHED
    const videoRef = useRef();
    const { speak } = useVentoVoice();

    useEffect(() => {
        const token = localStorage.getItem('vento_token');
        const savedUser = localStorage.getItem('vento_user');

        // Sin datos de sesión → redirigir al login
        if (!savedUser) {
            window.location.href = '/';
            return;
        }

        // Si es sesión de Face ID (no tiene JWT real), solo verificar localStorage
        if (token === 'face-id-session') {
            setUser(JSON.parse(savedUser));
            loadModels();
            return;
        }

        // Verificar JWT con Node.js — si no responde o el token expiró, al login
        if (token) {
            fetch('http://localhost:5000/api/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.valid) {
                    setUser(JSON.parse(savedUser));
                    loadModels();
                } else {
                    localStorage.removeItem('vento_token');
                    localStorage.removeItem('vento_user');
                    window.location.href = '/';
                }
            })
            .catch(() => {
                // Node.js no está corriendo → no dejar entrar
                alert('⚠️ El servidor Node.js no está activo. Inicia el backend primero.');
                window.location.href = '/';
            });
        } else {
            window.location.href = '/';
        }
    }, []);

    const loadModels = async () => {
        try {
            // Cargamos los modelos que mostraste en tu imagen
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/models')
            ]);
            setModelsLoaded(true);
            console.log("Modelos Biométricos Cargados");
        } catch (err) {
            console.error("Error cargando modelos:", err);
        }
    };

    const startVideo = () => {
        setScanning(true);
        setScanStatus('SCANNING');
        speak("Iniciando escaneo biométrico. Por favor, mire fijamente a la cámara.");

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => console.error(err));
    };

    const handleFaceCheck = async () => {
        if (!videoRef.current) return;

        const detection = await faceapi.detectSingleFace(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detection) {
            setScanStatus('MATCHED');
            speak("Identidad confirmada. Acceso total concedido.");
            setTimeout(() => {
                setScanning(false);
                setScanStatus('IDLE');
            }, 3000);
        } else {
            speak("No se detecta rostro. Intente de nuevo.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('vento_user');
        window.location.href = "/";
    };

    if (!user) return null;

    return (
        <div style={styles.container}>
            <div style={styles.bgGlow}></div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.glassCard}>
                {/* Header */}
                <div style={styles.header}>
                    <ShieldCheck color="#00ffff" size={24} />
                    <span style={styles.brand}>VENTO <span style={{ color: '#444' }}>SYSTEM</span></span>
                    <button onClick={handleLogout} style={styles.logoutIcon}><LogOut size={18} /></button>
                </div>

                {!scanning ? (
                    <div style={styles.mainContent}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                            <h2 style={styles.welcome}>HOLA, <span style={{ color: '#00ffff' }}>{user.name?.toUpperCase()}</span></h2>
                            <p style={styles.statusText}>ESTADO: SESIÓN INICIADA</p>
                        </motion.div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startVideo}
                            disabled={!modelsLoaded}
                            style={{ ...styles.actionBtn, opacity: modelsLoaded ? 1 : 0.5 }}
                        >
                            {modelsLoaded ? (
                                <><Camera size={20} style={{ marginRight: '12px' }} /> ESCANEO FACIAL</>
                            ) : (
                                <><RefreshCw size={20} className="spin" /> CARGANDO IA...</>
                            )}
                        </motion.button>
                    </div>
                ) : (
                    <div style={styles.scannerContainer}>
                        <div style={styles.videoWrapper}>
                            <video ref={videoRef} autoPlay muted style={styles.video} />

                            {/* Overlay de escaneo (La línea que sube y baja) */}
                            {scanStatus === 'SCANNING' && <motion.div animate={{ y: [0, 240, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} style={styles.scanLine} />}

                            {scanStatus === 'MATCHED' && (
                                <div style={styles.matchOverlay}>
                                    <UserCheck size={80} color="#00ffff" />
                                    <p>IDENTIFICADO</p>
                                </div>
                            )}
                        </div>

                        {scanStatus === 'SCANNING' && (
                            <button onClick={handleFaceCheck} style={styles.captureBtn}>
                                VERIFICAR AHORA
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
};

const styles = {
    container: { height: '100vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Inter', sans-serif", overflow: 'hidden' },
    bgGlow: { position: 'absolute', width: '500px', height: '500px', background: '#00ffff', filter: 'blur(150px)', opacity: 0.03 },
    glassCard: { width: '90%', maxWidth: '500px', background: 'rgba(15, 15, 15, 0.8)', backdropFilter: 'blur(20px)', borderRadius: '32px', border: '1px solid #1a1a1a', padding: '30px', position: 'relative' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' },
    brand: { letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
    logoutIcon: { background: 'none', border: 'none', color: '#444', cursor: 'pointer' },
    mainContent: { textAlign: 'center', padding: '20px 0' },
    welcome: { fontSize: '1.5rem', letterSpacing: '2px', fontWeight: '200', margin: '0 0 10px 0' },
    statusText: { fontSize: '0.6rem', color: '#444', letterSpacing: '2px', marginBottom: '30px' },
    actionBtn: { padding: '18px 30px', background: '#00ffff', color: 'black', border: 'none', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', margin: '0 auto' },
    scannerContainer: { textAlign: 'center' },
    videoWrapper: { position: 'relative', width: '100%', height: '250px', background: '#000', borderRadius: '20px', overflow: 'hidden', border: '1px solid #333' },
    video: { width: '100%', height: '100%', objectFit: 'cover' },
    scanLine: { position: 'absolute', width: '100%', height: '2px', background: '#00ffff', boxShadow: '0 0 15px #00ffff', top: 0, zIndex: 10 },
    matchOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00ffff', fontWeight: 'bold' },
    captureBtn: { marginTop: '20px', padding: '12px 25px', background: 'none', border: '1px solid #00ffff', color: '#00ffff', borderRadius: '12px', cursor: 'pointer', fontSize: '0.8rem' }
};

export default Dashboard;