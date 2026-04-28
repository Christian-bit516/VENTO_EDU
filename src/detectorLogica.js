// detectorLogica.js — VentoSign LSM/ASL Detector v4.0
// ─────────────────────────────────────────────────────────────
// SISTEMA DE COORDENADAS MEDIAPIPE:
//   x: 0 = izquierda, 1 = derecha (en el frame SIN espejo)
//   y: 0 = arriba, 1 = abajo
//   El video se muestra con CSS scaleX(-1), pero MediaPipe
//   trabaja con el frame original (sin espejo).
//
// LANDMARKS CLAVE:
//   0 = muñeca
//   1-4  = pulgar  (MCP, CMC, IP, TIP)
//   5-8  = índice  (MCP, PIP, DIP, TIP)
//   9-12 = medio   (MCP, PIP, DIP, TIP)
//  13-16 = anular  (MCP, PIP, DIP, TIP)
//  17-20 = meñique (MCP, PIP, DIP, TIP)
// ─────────────────────────────────────────────────────────────

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const detectarAbecedario = (lm) => {
    if (!lm || lm.length < 21) return "";

    // Tamaño de palma = distancia muñeca→nudillo del medio (referencia de escala)
    const palmSize = Math.max(d2(lm[0], lm[9]), 0.001);
    // Distancia normalizada entre dos puntos
    const nd = (a, b) => d2(a, b) / palmSize;

    // ══════════════════════════════════════════════════════════
    // ESTADO DE CADA DEDO
    // Dedo estirado = punta MÁS ARRIBA que su PIP (y menor = más arriba)
    // Se añade margen de 0.01 para evitar falsos positivos
    // ══════════════════════════════════════════════════════════
    const IDX = lm[8].y  < lm[6].y  - 0.01;   // índice estirado
    const MID = lm[12].y < lm[10].y - 0.01;   // medio estirado
    const RNG = lm[16].y < lm[14].y - 0.01;   // anular estirado
    const PKY = lm[20].y < lm[18].y - 0.01;   // meñique estirado

    // Dedo muy doblado = punta por DEBAJO del nudillo base (MCP)
    const idxFold = lm[8].y  > lm[5].y;
    const midFold = lm[12].y > lm[9].y;
    const rngFold = lm[16].y > lm[13].y;
    const pkyFold = lm[20].y > lm[17].y;

    // ══════════════════════════════════════════════════════════
    // DISTANCIAS NORMALIZADAS (independientes del zoom/distancia)
    // ══════════════════════════════════════════════════════════
    const dTI = nd(lm[4], lm[8]);    // pulgar ↔ punta índice
    const dTM = nd(lm[4], lm[12]);   // pulgar ↔ punta medio
    const dTR = nd(lm[4], lm[16]);   // pulgar ↔ punta anular
    const dTP = nd(lm[4], lm[20]);   // pulgar ↔ punta meñique
    const dIM = nd(lm[8], lm[12]);   // punta índice ↔ punta medio

    // Pulgar extendido lateralmente = su punta lejos del MCP del índice
    const thumbOut = nd(lm[4], lm[5]) > 1.1;
    // Pulgar tocando índice (hacen un círculo)
    const thumbPinchIdx = dTI < 0.45;
    // Pulgar tocando medio
    const thumbPinchMid = dTM < 0.55;

    // ══════════════════════════════════════════════════════════
    // ORIENTACIÓN DEL ÍNDICE (para G y H)
    // Horizontal = la diferencia en X es mayor que en Y
    // ══════════════════════════════════════════════════════════
    const idxHoriz = Math.abs(lm[8].x - lm[5].x) > Math.abs(lm[8].y - lm[5].y) * 1.3;
    const midHoriz = Math.abs(lm[12].x - lm[9].x) > Math.abs(lm[12].y - lm[9].y) * 1.3;

    const allClosed = !IDX && !MID && !RNG && !PKY;
    const allOpen   =  IDX &&  MID &&  RNG &&  PKY;

    // ══════════════════════════════════════════════════════════
    // DETECCIÓN — DE MÁS ESPECÍFICO A MÁS GENERAL
    // ══════════════════════════════════════════════════════════

    // ── B: 4 dedos arriba, pulgar cruzado ─────────────────────
    if (allOpen && !thumbOut) return "B";

    // ── W: índice + medio + anular ────────────────────────────
    if (IDX && MID && RNG && !PKY) return "W";

    // ── F: pulgar toca índice, otros 3 arriba ─────────────────
    if (!IDX && MID && RNG && PKY && thumbPinchIdx) return "F";

    // ── Y: meñique + pulgar (shaka) ───────────────────────────
    if (!IDX && !MID && !RNG && PKY && thumbOut) return "Y";

    // ── I: solo meñique ───────────────────────────────────────
    if (!IDX && !MID && !RNG && PKY && !thumbOut) return "I";

    // ── L: índice arriba + pulgar lateral ─────────────────────
    if (IDX && !MID && !RNG && !PKY && thumbOut) return "L";

    // ── X: índice en gancho ───────────────────────────────────
    // PIP levantado (< MCP en y), TIP doblado (> PIP en y)
    if (!IDX && !MID && !RNG && !PKY && !thumbOut
        && lm[6].y < lm[5].y
        && lm[8].y > lm[6].y) return "X";

    // ── D: índice arriba, otros hacen círculo con pulgar ──────
    if (IDX && !MID && !RNG && !PKY && thumbPinchMid && midFold) return "D";

    // ── G: índice apunta horizontalmente ──────────────────────
    // (y pulgar apuntando en la misma dirección)
    if (!MID && !RNG && !PKY && idxHoriz && !thumbPinchIdx) {
        // Q = igual pero el índice apunta hacia abajo
        return lm[8].y > lm[5].y + 0.04 ? "Q" : "G";
    }

    // ── H: índice + medio horizontales ────────────────────────
    if (IDX && MID && !RNG && !PKY && idxHoriz && midHoriz) return "H";

    // ── K: índice + medio arriba, pulgar toca el medio, apuntando arriba ──
    if (IDX && MID && !RNG && !PKY && thumbPinchMid && lm[8].y < lm[5].y) return "K";

    // ── P: como K pero inclinado hacia abajo ──────────────────
    if (IDX && MID && !RNG && !PKY && thumbPinchMid && lm[8].y >= lm[5].y) return "P";

    // ── V: índice + medio separados ───────────────────────────
    if (IDX && MID && !RNG && !PKY && dIM > 0.55) return "V";

    // ── R: índice + medio cruzados (juntos, uno sobre otro) ───
    if (IDX && MID && !RNG && !PKY && dIM < 0.35) return "R";

    // ── U: índice + medio juntos hacia arriba ─────────────────
    if (IDX && MID && !RNG && !PKY) return "U";

    // ── Index solo, sin pulgar extendido ──────────────────────
    if (IDX && !MID && !RNG && !PKY && !thumbOut) return "D"; // fallback

    // ══════════════════════════════════════════════════════════
    // PUÑO CERRADO → A / C / O / E / S / T / N / M
    // ══════════════════════════════════════════════════════════

    // ── O: dedos curvados, pulgar toca índice (anillo) ────────
    if (allClosed && thumbPinchIdx && !idxFold) return "O";

    // ── C: dedos semi-curvados, gran espacio entre pulgar e índice ──
    if (allClosed && !idxFold && dTI > 0.65 && dTI < 1.4) return "C";

    // ── E: todos MUY doblados (tip bajo MCP), pulgar bajo dedos ─
    if (allClosed && idxFold && midFold && rngFold && pkyFold
        && lm[4].y > lm[8].y) return "E";

    // ── S: puño cerrado, pulgar cruza por encima ───────────────
    // tip del pulgar está por delante (y menor que las puntas)
    if (allClosed && idxFold && lm[4].y < lm[8].y && dTI < 0.75) return "S";

    // ── T: pulgar asoma entre índice y medio ──────────────────
    if (allClosed && idxFold && dTI > 0.35 && dTI < 0.9
        && dTM > 0.3 && dTM < 0.9) return "T";

    // ── N: pulgar bajo índice y medio ─────────────────────────
    if (allClosed && idxFold && midFold && !rngFold) return "N";

    // ── M: pulgar bajo tres dedos ─────────────────────────────
    if (allClosed && idxFold && midFold && rngFold
        && !thumbPinchIdx) return "M";

    // ── A: puño simple, pulgar al lado ────────────────────────
    if (allClosed) return "A";

    return "—";
};

// ─────────────────────────────────────────────────────────────
// Traducciones de letra ASL → español (para mostrar en UI)
// ─────────────────────────────────────────────────────────────
export const LETRA_ES = {
    "A": "A — Puño, pulgar al lado",
    "B": "B — Mano abierta",
    "C": "C — Forma de C",
    "D": "D — Índice arriba, círculo",
    "E": "E — Dedos encogidos",
    "F": "F — OK invertido",
    "G": "G — Pistola (lado)",
    "H": "H — Dos dedos horizontales",
    "I": "I — Meñique arriba",
    "K": "K — Índice y medio, pulgar al medio",
    "L": "L — Forma de L",
    "M": "M — Pulgar bajo tres dedos",
    "N": "N — Pulgar bajo dos dedos",
    "O": "O — Círculo",
    "P": "P — K hacia abajo",
    "Q": "Q — G hacia abajo",
    "R": "R — Dedos cruzados",
    "S": "S — Puño, pulgar encima",
    "T": "T — Pulgar entre dedos",
    "U": "U — Dos dedos juntos",
    "V": "V — Victoria",
    "W": "W — Tres dedos",
    "X": "X — Índice en gancho",
    "Y": "Y — Shaka",
    "—": "",
};