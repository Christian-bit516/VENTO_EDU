/* ═══════════════════════════════════════════════════════════════════════════════
   VentoEdu — Premium Sound Engine v2.0 (Web Audio API)
   Rich, musical, game-quality synthesized sounds with reverb
   ═══════════════════════════════════════════════════════════════════════════════ */

let audioCtx = null;
let reverbNode = null;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    createReverb();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

/* Create impulse-response reverb */
const createReverb = () => {
  try {
    const ctx = audioCtx;
    const conv = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const len = rate * 1.2;
    const impulse = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    conv.buffer = impulse;
    reverbNode = conv;
  } catch { /* fallback: no reverb */ }
};

/* ── Core Helpers ──────────────────────────────────────────────────────────── */
const playTone = (freq, dur, type = 'sine', vol = 0.3, delay = 0, reverb = false) => {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  g.gain.setValueAtTime(0, ctx.currentTime + delay);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.008);
  g.gain.setValueAtTime(vol, ctx.currentTime + delay + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.connect(g);
  if (reverb && reverbNode) {
    const dry = ctx.createGain(); dry.gain.value = 0.7;
    const wet = ctx.createGain(); wet.gain.value = 0.3;
    g.connect(dry); g.connect(wet);
    dry.connect(ctx.destination);
    wet.connect(reverbNode);
    reverbNode.connect(ctx.destination);
  } else {
    g.connect(ctx.destination);
  }
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur);
};

const playChord = (freqs, dur, type = 'sine', vol = 0.12, delay = 0) => {
  freqs.forEach(f => playTone(f, dur, type, vol / freqs.length * 1.8, delay, true));
};

const playNoise = (dur, vol = 0.08, filterFreq = 5000) => {
  const ctx = getCtx();
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(flt); flt.connect(g); g.connect(ctx.destination);
  src.start();
};

/* ═══════════════════════════════════════════════════════════════════════════════
   PREMIUM SOUND LIBRARY
   ═══════════════════════════════════════════════════════════════════════════════ */

export const sounds = {
  /* ── Correct — triumphant ascending arpeggio + shimmer ── */
  correct: () => {
    playTone(523, 0.12, 'sine', 0.2, 0, true);
    playTone(659, 0.12, 'sine', 0.22, 0.07, true);
    playTone(784, 0.14, 'sine', 0.25, 0.14, true);
    playTone(1047, 0.28, 'sine', 0.2, 0.21, true);
    playTone(1568, 0.18, 'sine', 0.05, 0.21);
    playTone(2093, 0.12, 'sine', 0.03, 0.25);
    playNoise(0.06, 0.02, 9000);
  },

  /* ── Wrong — dramatic descending ── */
  wrong: () => {
    playTone(350, 0.12, 'sawtooth', 0.07, 0);
    playTone(280, 0.14, 'sawtooth', 0.06, 0.1);
    playTone(220, 0.22, 'sawtooth', 0.04, 0.2);
    playNoise(0.04, 0.015, 2000);
  },

  /* ── Click — crisp pop ── */
  click: () => {
    playTone(880, 0.035, 'sine', 0.12);
    playTone(1320, 0.025, 'sine', 0.06, 0.015);
    playNoise(0.015, 0.015, 7000);
  },

  /* ── Hover — soft bubble ── */
  hover: () => {
    playTone(1200, 0.02, 'sine', 0.04);
    playTone(1500, 0.015, 'sine', 0.02, 0.008);
  },

  /* ── Lesson start — epic adventure fanfare ── */
  lessonStart: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      playTone(f, 0.13, 'sine', 0.16, i * 0.085, true);
      playTone(f * 1.5, 0.08, 'triangle', 0.04, i * 0.085 + 0.02);
    });
    playChord([1047, 1319, 1568], 0.45, 'sine', 0.12, 0.43);
  },

  /* ── Lesson complete — orchestral victory ── */
  lessonComplete: () => {
    [523, 659, 784, 880, 1047].forEach((f, i) => {
      playTone(f, 0.12, 'sine', 0.14, i * 0.09, true);
      playTone(f * 1.5, 0.08, 'triangle', 0.05, i * 0.09);
    });
    playChord([1047, 1319, 1568, 2093], 0.6, 'sine', 0.18, 0.5);
    playTone(523, 0.5, 'sine', 0.08, 0.5, true);
    setTimeout(() => playNoise(0.08, 0.025, 9000), 550);
  },

  /* ── XP gained — magical coin ── */
  xp: () => {
    playTone(1319, 0.05, 'sine', 0.14, 0);
    playTone(1760, 0.05, 'sine', 0.14, 0.04);
    playTone(2217, 0.08, 'sine', 0.09, 0.08);
    playNoise(0.025, 0.015, 10000);
  },

  /* ── Heart lost ── */
  heartLost: () => {
    playTone(440, 0.1, 'sine', 0.12);
    playTone(370, 0.13, 'sine', 0.08, 0.08);
    playTone(330, 0.18, 'sine', 0.05, 0.16);
  },

  /* ── Next exercise — whoosh ── */
  next: () => {
    playTone(600, 0.035, 'sine', 0.07);
    playTone(900, 0.035, 'sine', 0.09, 0.025);
    playTone(1300, 0.05, 'sine', 0.05, 0.05);
    playNoise(0.03, 0.008, 5000);
  },

  /* ── Streak fire ── */
  streak: () => {
    [440, 554, 659, 880].forEach((f, i) => {
      playTone(f, 0.1, 'sawtooth', 0.05, i * 0.07);
      playTone(f * 2, 0.06, 'sine', 0.025, i * 0.07 + 0.02);
    });
  },

  /* ── Recording start ── */
  recordStart: () => {
    playTone(880, 0.09, 'sine', 0.14);
    playTone(1100, 0.06, 'sine', 0.11, 0.07);
    playTone(1320, 0.04, 'sine', 0.07, 0.12);
  },

  /* ── Recording stop ── */
  recordStop: () => {
    playTone(1320, 0.05, 'sine', 0.09);
    playTone(1100, 0.05, 'sine', 0.09, 0.04);
    playTone(880, 0.09, 'sine', 0.12, 0.08);
  },

  /* ── Listen/Speaker ── */
  listen: () => {
    playTone(700, 0.05, 'sine', 0.09);
    playTone(950, 0.07, 'sine', 0.09, 0.04);
  },

  /* ── Level up — EPIC FANFARE ── */
  levelUp: () => {
    [523, 587, 659, 784, 880, 988, 1047].forEach((f, i) => {
      playTone(f, 0.14, 'sine', 0.14, i * 0.075, true);
      playTone(f * 1.5, 0.1, 'triangle', 0.04, i * 0.075);
    });
    playChord([1047, 1319, 1568, 2093], 0.7, 'sine', 0.16, 0.55);
    playTone(523, 0.7, 'sine', 0.08, 0.55, true);
    setTimeout(() => playNoise(0.12, 0.03, 10000), 600);
  },

  /* ── Navigate — soft swoosh ── */
  navigate: () => {
    playTone(500, 0.035, 'sine', 0.06);
    playTone(750, 0.035, 'sine', 0.07, 0.02);
    playTone(1100, 0.04, 'sine', 0.04, 0.04);
  },

  /* ── Combo hit — escalating pitch ── */
  combo: (count = 1) => {
    const base = 523 + Math.min(count, 10) * 40;
    playTone(base, 0.07, 'sine', 0.13);
    playTone(base * 1.25, 0.05, 'sine', 0.1, 0.03);
    playTone(base * 1.5, 0.08, 'sine', 0.08, 0.06);
    if (count >= 5) playNoise(0.04, 0.02, 8000);
  },

  /* ── Achievement unlocked ── */
  achievement: () => {
    playTone(784, 0.13, 'sine', 0.14, 0, true);
    playTone(988, 0.13, 'sine', 0.14, 0.1, true);
    playTone(1175, 0.13, 'sine', 0.16, 0.2, true);
    playChord([1175, 1480, 1760], 0.45, 'sine', 0.13, 0.3);
    setTimeout(() => playNoise(0.08, 0.025, 9000), 350);
  },

  /* ── Button press — satisfying thunk ── */
  buttonPress: () => {
    playTone(200, 0.04, 'sine', 0.09);
    playTone(600, 0.025, 'sine', 0.05, 0.015);
    playNoise(0.015, 0.008, 3000);
  },

  /* ── Tick ── */
  tick: () => {
    playTone(1000, 0.025, 'sine', 0.07);
  },

  /* ── Star earned ── */
  star: () => {
    playTone(880, 0.1, 'sine', 0.15, 0, true);
    playTone(1100, 0.1, 'sine', 0.15, 0.08, true);
    playTone(1320, 0.15, 'sine', 0.12, 0.16, true);
    playNoise(0.04, 0.02, 8000);
  },
};

/* ── Premium TTS voice selector (fix: async voice loading in Chrome) ── */
export const speakText = (text, lang = 'en-US', rate = 0.85) => {
  if (!('speechSynthesis' in window)) return;

  const preferred = lang === 'en-US'
    ? ['Google US English', 'Microsoft Zira', 'Samantha', 'Google UK English Female', 'Alex']
    : ['Google español de Estados Unidos', 'Google español', 'Microsoft Sabina', 'Paulina', 'Jorge'];

  const doSpeak = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang   = lang;
    u.rate   = rate;
    u.pitch  = 1.05;
    u.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    let best = null;
    for (const name of preferred) {
      best = voices.find(v => v.name.includes(name));
      if (best) break;
    }
    if (!best) best = voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
    if (best) u.voice = best;

    // Prevenir GC en Chrome
    window._ventoSpeakUtterance = u;
    window.speechSynthesis.speak(u);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      doSpeak();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Safety fallback
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      doSpeak();
    }, 1500);
  }
};

export default sounds;
