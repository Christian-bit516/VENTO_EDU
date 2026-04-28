// ============================================================
// drawUtils.js — VentoSign Premium Hand Renderer v2.0
// Dibuja el esqueleto de la mano con estilo neón, colores por dedo,
// nodos en todos los landmarks y efecto glow dinámico.
// ============================================================

// Colores por dedo (igual que los landmarks de MediaPipe)
const FINGER_COLORS = {
    thumb:  "#ff6b6b", // Rojo — Pulgar
    index:  "#00f2ff", // Cyan — Índice
    middle: "#a855f7", // Púrpura — Medio
    ring:   "#22c55e", // Verde — Anular
    pinky:  "#f59e0b", // Ámbar — Meñique
    palm:   "rgba(255,255,255,0.25)", // Blanco tenue — Palma
};

/**
 * Dibuja una trayectoria de puntos conectados con un color y glow dados.
 */
const drawPath = (ctx, hand, indices, color, lineWidth = 3) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    ctx.beginPath();
    indices.forEach((idx, i) => {
        const x = hand[idx].x * ctx.canvas.width;
        const y = hand[idx].y * ctx.canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
};

/**
 * Dibuja un nodo (círculo) en un landmark dado.
 * @param {boolean} isTip - Si es punta de dedo, lo hace más grande y brillante.
 */
const drawNode = (ctx, hand, idx, color, isTip = false) => {
    const x = hand[idx].x * ctx.canvas.width;
    const y = hand[idx].y * ctx.canvas.height;
    const radius = isTip ? 7 : 4;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = isTip ? 20 : 10;

    // Anillo exterior
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Relleno interior
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? color : "rgba(0,0,0,0.6)";
    ctx.fill();

    ctx.restore();
};

/**
 * Función principal de dibujo. Recibe el ctx de un canvas y los landmarks de una mano.
 */
export const drawHand = (ctx, hand, width, height) => {
    ctx.clearRect(0, 0, width, height);
    if (!hand || hand.length < 21) return;

    // --- HUESOS (líneas) ---
    drawPath(ctx, hand, [0, 1, 2, 3, 4],       FINGER_COLORS.thumb);
    drawPath(ctx, hand, [0, 5, 6, 7, 8],        FINGER_COLORS.index);
    drawPath(ctx, hand, [9, 10, 11, 12],         FINGER_COLORS.middle);
    drawPath(ctx, hand, [13, 14, 15, 16],        FINGER_COLORS.ring);
    drawPath(ctx, hand, [0, 17, 18, 19, 20],     FINGER_COLORS.pinky);
    drawPath(ctx, hand, [0, 5, 9, 13, 17],       FINGER_COLORS.palm, 2);
    drawPath(ctx, hand, [5, 9], FINGER_COLORS.palm, 2);

    // --- NODOS —— todos los landmarks, coloreados por su dedo ---
    const fingerMap = [
        { indices: [1, 2, 3], tip: 4,  color: FINGER_COLORS.thumb },
        { indices: [5, 6, 7], tip: 8,  color: FINGER_COLORS.index },
        { indices: [9, 10, 11], tip: 12, color: FINGER_COLORS.middle },
        { indices: [13, 14, 15], tip: 16, color: FINGER_COLORS.ring },
        { indices: [17, 18, 19], tip: 20, color: FINGER_COLORS.pinky },
    ];

    fingerMap.forEach(({ indices, tip, color }) => {
        indices.forEach(i => drawNode(ctx, hand, i, color, false));
        drawNode(ctx, hand, tip, color, true);
    });

    // Nodo de la muñeca
    drawNode(ctx, hand, 0, "rgba(255,255,255,0.7)", false);
};
