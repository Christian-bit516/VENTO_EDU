import { useState, useCallback, useEffect, useRef } from 'react';

export const useBiometricAuth = () => {
  const [modelsReady, setModelsReady] = useState(false);
  const [status, setStatus] = useState('idle');
  const modelsLoadedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setStatus('loading_models');

    const load = async () => {
      try {
        const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
        await window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        modelsLoadedRef.current = true;
        if (mountedRef.current) { setModelsReady(true); setStatus('ready'); }
      } catch (e) {
        console.error('[BioAuth] Model load error', e);
        if (mountedRef.current) setStatus('idle');
      }
    };

    const poll = setInterval(() => {
      if (window.faceapi) { clearInterval(poll); load(); }
    }, 100);

    return () => clearInterval(poll);
  }, []);

  const extractDescriptor = useCallback(async (base64) => {
    if (!modelsLoadedRef.current || !window.faceapi) return null;
    try {
      const img = await window.faceapi.fetchImage(base64);
      const det = await window.faceapi
        .detectSingleFace(img, new window.faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      return det ? Array.from(det.descriptor) : null;
    } catch (e) {
      console.error('[BioAuth] extractDescriptor error:', e);
      return null;
    }
  }, []);

  return { modelsReady, status, extractDescriptor };
};
