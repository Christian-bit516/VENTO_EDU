import React, { useState, useEffect, useCallback, useRef } from 'react';
import './DigitalPiano.css';

/* ── Note definitions ─────────────────────────────────────────── */
const NOTES = [
  { note:'C4',  label:'DO',  freq:261.63, isBlack:false, key:'a' },
  { note:'C#4', label:'DO#', freq:277.18, isBlack:true,  key:'w' },
  { note:'D4',  label:'RE',  freq:293.66, isBlack:false, key:'s' },
  { note:'D#4', label:'RE#', freq:311.13, isBlack:true,  key:'e' },
  { note:'E4',  label:'MI',  freq:329.63, isBlack:false, key:'d' },
  { note:'F4',  label:'FA',  freq:349.23, isBlack:false, key:'f' },
  { note:'F#4', label:'FA#', freq:369.99, isBlack:true,  key:'t' },
  { note:'G4',  label:'SOL', freq:392.00, isBlack:false, key:'g' },
  { note:'G#4', label:'SOL#',freq:415.30, isBlack:true,  key:'y' },
  { note:'A4',  label:'LA',  freq:440.00, isBlack:false, key:'h' },
  { note:'A#4', label:'LA#', freq:466.16, isBlack:true,  key:'u' },
  { note:'B4',  label:'SI',  freq:493.88, isBlack:false, key:'j' },
  { note:'C5',  label:'DO',  freq:523.25, isBlack:false, key:'k' },
  { note:'C#5', label:'DO#', freq:554.37, isBlack:true,  key:'o' },
  { note:'D5',  label:'RE',  freq:587.33, isBlack:false, key:'l' },
  { note:'D#5', label:'RE#', freq:622.25, isBlack:true,  key:'p' },
  { note:'E5',  label:'MI',  freq:659.25, isBlack:false, key:';' },
  { note:'F5',  label:'FA',  freq:698.46, isBlack:false, key:"'" },
];

/* ── Shared AudioContext ──────────────────────────────────────── */
let sharedCtx = null;
const getCtx = () => {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
};

/* ── Reverb impulse (simple convolver) ─────────────────────── */
let reverbNode = null;
const getReverbNode = (ctx) => {
  if (reverbNode && reverbNode.context === ctx) return reverbNode;
  const conv = ctx.createConvolver();
  const len  = ctx.sampleRate * 1.5;
  const ir   = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.5);
  }
  conv.buffer = ir;
  reverbNode = conv;
  return conv;
};

/* ── Active note nodes ───────────────────────────────────────── */
const activeNodes = new Map();

export const playPianoNote = (note, velocity = 0.7) => {
  stopPianoNote(note);
  try {
    const ctx  = getCtx();
    const now  = ctx.currentTime;
    const freq = note.freq;

    // Master gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(velocity * 0.55, now + 0.008);   // fast attack
    masterGain.gain.exponentialRampToValueAtTime(velocity * 0.35, now + 0.12); // decay
    masterGain.gain.setTargetAtTime(velocity * 0.25, now + 0.12, 0.5);        // sustain

    // Fundamental (sine)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine'; osc1.frequency.value = freq;
    const g1 = ctx.createGain(); g1.gain.value = 0.65;
    osc1.connect(g1); g1.connect(masterGain);

    // 2nd harmonic (makes it sound less like a pure tone)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine'; osc2.frequency.value = freq * 2.0005; // slight detune for warmth
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    osc2.connect(g2); g2.connect(masterGain);

    // 3rd harmonic (brightness)
    const osc3 = ctx.createOscillator();
    osc3.type = 'triangle'; osc3.frequency.value = freq * 3;
    const g3 = ctx.createGain(); g3.gain.value = 0.08;
    osc3.connect(g3); g3.connect(masterGain);

    // 4th harmonic (upper partials — piano character)
    const osc4 = ctx.createOscillator();
    osc4.type = 'sine'; osc4.frequency.value = freq * 4;
    const g4 = ctx.createGain(); g4.gain.value = 0.04;
    osc4.connect(g4); g4.connect(masterGain);

    // High-pass filter to cut mud
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 40;
    masterGain.connect(hp);

    // Reverb send
    const reverbSend = ctx.createGain(); reverbSend.gain.value = 0.18;
    const reverb = getReverbNode(ctx);
    const reverbOut = ctx.createGain(); reverbOut.gain.value = 0.5;
    hp.connect(reverbSend);
    reverbSend.connect(reverb);
    reverb.connect(reverbOut);
    reverbOut.connect(ctx.destination);

    // Dry output
    hp.connect(ctx.destination);

    osc1.start(now); osc2.start(now); osc3.start(now); osc4.start(now);

    activeNodes.set(note.note, { ctx, oscs:[osc1,osc2,osc3,osc4], masterGain, startTime:now });
  } catch(e) { console.warn('Piano audio error:', e); }
};

export const stopPianoNote = (note, sustain = false) => {
  if (sustain) return;
  const node = activeNodes.get(note.note);
  if (!node) return;
  try {
    const { ctx, oscs, masterGain } = node;
    const now = ctx.currentTime;
    const curVal = masterGain.gain.value;
    masterGain.gain.cancelScheduledValues(now);
    // Use linear ramp — exponential can't start from 0
    masterGain.gain.setValueAtTime(Math.max(curVal, 0.0001), now);
    masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.45);
    oscs.forEach(o => { try { o.stop(now + 0.5); } catch(e){} });
    activeNodes.delete(note.note);
  } catch(e) { activeNodes.delete(note.note); }
};

/* ── Songs ───────────────────────────────────────────────────── */
const SONGS = {
  'Cumpleaños Feliz': ['C4','C4','D4','C4','F4','E4','C4','C4','D4','C4','G4','F4'],
  'Estrellita':       ['C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4'],
  'Oda a la Alegría': ['E4','E4','F4','G4','G4','F4','E4','D4','C4','C4','D4','E4','E4','D4','D4'],
};

/* ═══ DIGITAL PIANO ════════════════════════════════════════════ */
const DigitalPiano = ({ onClose, highlightNote = null, onNotePlayed = null }) => {
  const [active,    setActive]    = useState(new Set());
  const [sustain,   setSustain]   = useState(false);
  const [lastNote,  setLastNote]  = useState(null);
  const [playing,   setPlaying]   = useState(false);
  const [demoSong,  setDemoSong]  = useState('');
  const sustainRef = useRef(false);
  sustainRef.current = sustain;

  const pressNote = useCallback((n) => {
    playPianoNote(n);
    setActive(prev => new Set([...prev, n.note]));
    setLastNote(n);
    if (onNotePlayed) onNotePlayed(n);
  }, [onNotePlayed]);

  const releaseNote = useCallback((n) => {
    stopPianoNote(n, sustainRef.current);
    if (!sustainRef.current) setActive(prev => { const s=new Set(prev); s.delete(n.note); return s; });
  }, []);

  // Keyboard mapping
  useEffect(() => {
    const keyMap = {}; NOTES.forEach(n => { keyMap[n.key] = n; });
    const down = (e) => {
      if (e.repeat) return;
      if (e.key === ' ') { e.preventDefault(); setSustain(s=>!s); return; }
      const n = keyMap[e.key]; if (n) pressNote(n);
    };
    const up = (e) => { const n = keyMap[e.key]; if (n) releaseNote(n); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [pressNote, releaseNote]);

  // Release all when sustain turns off
  useEffect(() => {
    if (!sustain) {
      active.forEach(noteId => {
        const n = NOTES.find(n=>n.note===noteId);
        if (n) stopPianoNote(n, false);
      });
    }
  }, [sustain]); // eslint-disable-line

  const playDemo = async (songName) => {
    if (playing) return;
    // Stop all currently playing notes first
    [...activeNodes.keys()].forEach(id => {
      const n = NOTES.find(n => n.note === id);
      if (n) stopPianoNote(n, false);
    });
    setActive(new Set());
    setPlaying(true); setDemoSong(songName);
    const noteNames = SONGS[songName];
    let cancelled = false;
    const cancelRef = { current: false };
    for (let i = 0; i < noteNames.length; i++) {
      if (cancelRef.current) break;
      const noteObj = NOTES.find(n => n.note === noteNames[i]);
      if (noteObj) {
        pressNote(noteObj);
        await new Promise(r => setTimeout(r, 360));
        releaseNote(noteObj);
        await new Promise(r => setTimeout(r, 80));
      }
    }
    setPlaying(false); setDemoSong('');
  };

  const whiteNotes = NOTES.filter(n=>!n.isBlack);
  const whiteWidth = whiteNotes.length;

  return (
    <div className="dp-wrap">
      <div className="dp-header">
        <div className="dp-title">🎹 Piano Digital</div>
        <div className="dp-controls">
          {onClose && <button className="dp-btn dp-close" onClick={onClose}>✕ Cerrar</button>}
        </div>
      </div>

      {/* Note display */}
      <div className="dp-display">
        <div className="dp-note-show">
          {lastNote
            ? <><span className="dp-note-big">{lastNote.label}</span><span className="dp-note-eng">{lastNote.note}</span><span className="dp-note-freq">{lastNote.freq} Hz</span></>
            : <span className="dp-note-hint">Toca una tecla o usa el teclado del computador ⌨️</span>}
        </div>
        <div className={`dp-sustain ${sustain?'dp-sustain-on':''}`} onClick={()=>setSustain(s=>!s)}>
          🦶 Pedal {sustain?'ON':'OFF'}
        </div>
      </div>

      {/* Highlight hint */}
      {highlightNote && (
        <div className="dp-target-hint">
          🎯 Toca: <strong>{highlightNote.label}</strong> ({highlightNote.note})
        </div>
      )}

      {/* Song demos */}
      {!highlightNote && (
        <div className="dp-songs">
          <span className="dp-songs-label">🎵 Demos:</span>
          {Object.keys(SONGS).map(s=>(
            <button key={s} className={`dp-song-btn ${demoSong===s?'dp-song-active':''}`}
              onClick={()=>playDemo(s)} disabled={playing}>
              {playing && demoSong===s ? '⏵ Tocando...' : s}
            </button>
          ))}
        </div>
      )}

      {/* Keyboard */}
      <div className="dp-keyboard-wrap">
        <div className="dp-keyboard" style={{ '--white-keys': whiteWidth }}>
          {whiteNotes.map((n,i) => {
            const isHighlight = highlightNote?.note === n.note;
            return (
              <div key={n.note}
                className={`dp-white-key ${active.has(n.note)?'dp-key-active':''} ${isHighlight?'dp-key-highlight':''}`}
                style={{ left:`${i * (100/whiteWidth)}%`, width:`${100/whiteWidth}%` }}
                onMouseDown={()=>pressNote(n)} onMouseUp={()=>releaseNote(n)} onMouseLeave={()=>releaseNote(n)}
                onTouchStart={e=>{e.preventDefault();pressNote(n);}}
                onTouchEnd={e=>{e.preventDefault();releaseNote(n);}}>
                <span className="dp-key-label">{n.label}</span>
                <span className="dp-key-shortcut">{n.key}</span>
              </div>
            );
          })}
          {/* Black keys */}
          {(() => {
            const bkeys = []; let wi = -1;
            NOTES.forEach((n) => {
              if (!n.isBlack) { wi++; } else {
                const left = (wi / whiteWidth)*100 + (0.65/whiteWidth)*100;
                const isHighlight = highlightNote?.note === n.note;
                bkeys.push(
                  <div key={n.note}
                    className={`dp-black-key ${active.has(n.note)?'dp-bkey-active':''} ${isHighlight?'dp-bkey-highlight':''}`}
                    style={{ left:`${left}%`, width:`${(0.6/whiteWidth)*100}%` }}
                    onMouseDown={e=>{e.stopPropagation();pressNote(n);}}
                    onMouseUp={e=>{e.stopPropagation();releaseNote(n);}}
                    onMouseLeave={()=>releaseNote(n)}
                    onTouchStart={e=>{e.preventDefault();pressNote(n);}}
                    onTouchEnd={e=>{e.preventDefault();releaseNote(n);}}>
                    <span className="dp-bkey-label">{n.label}</span>
                  </div>
                );
              }
            });
            return bkeys;
          })()}
        </div>
      </div>

      <div className="dp-footer">
        Espacio = Pedal sustain · <kbd>asdfghjkl</kbd> = notas blancas · <kbd>wetyuop</kbd> = negras
      </div>
    </div>
  );
};

export default DigitalPiano;
