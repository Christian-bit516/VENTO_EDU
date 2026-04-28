// src/utils/classifier.js
// ─────────────────────────────────────────────────────────────────────────────
// Sistema de clasificación por muestras — VentoSign KNN Classifier
//
// Flujo:
//   1. El usuario captura poses de cada letra (modo Entrenamiento)
//   2. Cada muestra se normaliza (traslación + escala respecto a la palma)
//   3. Se guarda en localStorage como vector de 42 features (21 pts × x,y)
//   4. En tiempo real se compara la pose actual con las muestras usando
//      similitud de coseno y se vota la letra ganadora (KNN, k=3)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ventosign_samples_v1";

// ── Normalización ──────────────────────────────────────────────────────────
// Traslada la muñeca al origen y escala por el tamaño de la palma.
// Resultado: vector de 42 números, invariante a posición y escala.
export const normalizeLandmarks = (lm) => {
    const wx = lm[0].x, wy = lm[0].y;
    const palmSize = Math.max(
        Math.hypot(lm[9].x - wx, lm[9].y - wy), 0.001
    );
    const features = [];
    for (let i = 0; i < 21; i++) {
        features.push((lm[i].x - wx) / palmSize);
        features.push((lm[i].y - wy) / palmSize);
    }
    return features;
};

// ── Similitud de coseno entre dos vectores ─────────────────────────────────
const cosineSim = (a, b) => {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na  += a[i] * a[i];
        nb  += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
};

// ── Clasificador KNN (k=3 por defecto) ────────────────────────────────────
// Devuelve { label, confidence } o null si no hay muestras
export const classifyKNN = (features, samples, k = 3) => {
    if (!samples || samples.length < 1) return null;

    // Puntuar todas las muestras
    const scored = samples.map(s => ({
        label: s.label,
        sim:   cosineSim(features, s.features),
    }));
    scored.sort((a, b) => b.sim - a.sim);

    const top = scored.slice(0, Math.min(k, scored.length));

    // Votación ponderada
    const votes = {};
    top.forEach(s => {
        votes[s.label] = (votes[s.label] || 0) + s.sim;
    });

    const winner = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    const maxSim  = scored[0].sim;

    return {
        label:      winner[0],
        confidence: Math.round(maxSim * 100),
        isTrained:  true,
    };
};

// ── Persistencia ────────────────────────────────────────────────────────────
export const loadSamples = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
};

export const saveSamples = (samples) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
};

export const deleteSamplesForLabel = (samples, label) =>
    samples.filter(s => s.label !== label);

export const countByLabel = (samples) => {
    const counts = {};
    samples.forEach(s => {
        counts[s.label] = (counts[s.label] || 0) + 1;
    });
    return counts;
};
