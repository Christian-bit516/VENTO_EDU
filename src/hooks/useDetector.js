// src/hooks/useDetector.js
// Hook compartido que inicializa MediaPipe + carga muestras + corre KNN.
// Lo usan tanto el Detector libre como el modo Aprendizaje.
import { useEffect, useRef, useState, useCallback } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { normalizeLandmarks, classifyKNN } from "../utils/classifier.js";
import { drawHand } from "../utils/drawUtils.js";

export const useDetector = ({ videoRef, canvasRef, onResult, enabled = true }) => {
    const landmarkerRef = useRef(null);
    const rafRef        = useRef(null);
    const samplesRef    = useRef([]);
    // ── Ref al callback más reciente ─────────────────────────────────────────
    // Esto evita el "stale closure" problem: el loop de requestAnimationFrame
    // siempre llama al onResult ACTUAL aunque haya cambiado desde el montaje.
    const onResultRef = useRef(onResult);
    useEffect(() => { onResultRef.current = onResult; }, [onResult]);

    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [msg,    setMsg]    = useState("Cargando…");

    const stopLoop = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }, []);

    useEffect(() => {
        if (!enabled) return;
        let active = true;

        const init = async () => {
            try {
                setMsg("Cargando muestras…");
                const res = await fetch("/ventosign_samples.json");
                samplesRef.current = await res.json();

                setMsg("Iniciando modelo IA…");
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
                );
                landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "/models/hand_landmarker.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numHands: 1,
                    minHandDetectionConfidence: 0.6,
                    minHandPresenceConfidence:  0.6,
                    minTrackingConfidence:      0.6,
                });

                setMsg("Abriendo cámara…");
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, frameRate: { ideal: 60 } },
                });

                if (!active) return;
                const video = videoRef.current;
                video.srcObject = stream;
                video.onloadeddata = () => {
                    if (!active) return;
                    setStatus("ready");
                    loop();
                };
            } catch (err) {
                console.error(err);
                setStatus("error");
                setMsg("Error al iniciar la cámara o el modelo.");
            }
        };

        const loop = () => {
            if (!active || !landmarkerRef.current || !videoRef.current) return;
            const video  = videoRef.current;
            const canvas = canvasRef.current;
            if (!canvas) return;

            if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
                canvas.width  = video.videoWidth;
                canvas.height = video.videoHeight;
            }

            const ctx    = canvas.getContext("2d");
            const result = landmarkerRef.current.detectForVideo(video, performance.now());

            if (result.landmarks?.length > 0) {
                const lm       = result.landmarks[0];
                const features = normalizeLandmarks(lm);
                const knn      = classifyKNN(features, samplesRef.current, 5);
                drawHand(ctx, lm, canvas.width, canvas.height);
                // Usar ref para siempre tener el callback más reciente
                onResultRef.current?.({ letter: knn?.label ?? "—", confidence: knn?.confidence ?? 0, hasHand: true });
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                onResultRef.current?.({ letter: "—", confidence: 0, hasHand: false });
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        init();
        return () => {
            active = false;
            stopLoop();
            if (landmarkerRef.current) {
                landmarkerRef.current.close();
                landmarkerRef.current = null;
            }
            // Liberar cámara
            const video = videoRef.current;
            if (video?.srcObject) {
                video.srcObject.getTracks().forEach(t => t.stop());
                video.srcObject = null;
            }
        };
    }, [enabled]);

    return { status, msg, stopLoop };
};
