import { useEffect, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export const useMediaPipe = () => {
    const faceLandmarkerRef = useRef(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );

                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numFaces: 1
                });
                setLoaded(true);
            } catch (err) {
                console.error("Error al cargar MediaPipe:", err);
            }
        };
        initialize();
        return () => faceLandmarkerRef.current?.close();
    }, []);

    return { faceLandmarker: faceLandmarkerRef.current, mediaPipeLoaded: loaded };
};