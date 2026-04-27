import React, { useState, useRef, useCallback, useEffect } from 'react';
import './CourseMiniGames.css';

/* ── Web Audio note player ─────────────────────────────────────────────── */
const NOTE_FREQS = { DO:261.63, RE:293.66, MI:329.63, FA:349.23, SOL:392.00, LA:440.00, SI:493.88 };
const NOTE_COLORS = { DO:'#ff6b9d', RE:'#e17055', MI:'#fdcb6e', FA:'#55efc4', SOL:'#74b9ff', LA:'#a29bfe', SI:'#fd79a8' };

function playPianoNote(noteName) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = NOTE_FREQS[noteName] || 440;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.start(); osc.stop(ctx.currentTime + 1.2);
    setTimeout(() => ctx.close(), 1500);
  } catch(e) { /* silently ignore */ }
}

/* ═══ 🎹 PIANO KEY GAME ════════════════════════════════════════════════════
   Shows a mini piano. Ask user to press the correct key.
   exercise: { question, answer:'SOL', notes:['DO','RE','MI','FA','SOL','LA','SI'], xp }
══════════════════════════════════════════════════════════════════════════ */
export const PianoKeyGame = ({ exercise, onResult }) => {
  const [selected, setSelected]   = useState(null);
  const [played,   setPlayed]     = useState(new Set());
  const notes = exercise.notes || Object.keys(NOTE_FREQS);

  const handleKey = (note) => {
    if (selected) return;
    playPianoNote(note);
    setPlayed(prev => new Set([...prev, note]));
    setSelected(note);
    setTimeout(() => onResult(note === exercise.answer), 600);
  };

  return (
    <div className="piano-game">
      <p className="piano-question">{exercise.question}</p>
      <p className="piano-hint">🎹 Haz clic en la tecla correcta</p>
      <div className="piano-keyboard">
        {notes.map(note => {
          const isSelected = selected === note;
          const isCorrect  = isSelected && note === exercise.answer;
          const isWrong    = isSelected && note !== exercise.answer;
          const showCorrect = selected && note === exercise.answer;
          return (
            <button key={note}
              className={`piano-key ${isCorrect||showCorrect?'pk-correct':''} ${isWrong?'pk-wrong':''} ${played.has(note)?'pk-played':''}`}
              style={!selected || showCorrect ? { '--note-color': NOTE_COLORS[note] } : {}}
              onClick={() => handleKey(note)}
              disabled={!!selected}>
              <span className="pk-label">{note}</span>
              {(isCorrect || showCorrect) && <span className="pk-star">⭐</span>}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className={`piano-feedback ${selected===exercise.answer?'pf-ok':'pf-no'}`}>
          {selected === exercise.answer
            ? `¡Correcto! 🎵 ${exercise.answer} suena así`
            : `Era la nota ${exercise.answer}. ¡Escúchala! 🎵`}
        </div>
      )}
    </div>
  );
};

/* ═══ 🥁 RHYTHM TAP GAME ══════════════════════════════════════════════════
   Shows a rhythm pattern (sequence of long/short beats), user taps it.
   exercise: { question, pattern:['♩','♩','♪','♩'], answer:'1 1 0.5 1', xp }
   Simplified: show the pattern visually, ask if it's 4/4, 3/4, or describes it.
══════════════════════════════════════════════════════════════════════════ */
export const RhythmTapGame = ({ exercise, onResult }) => {
  const [tapCount,   setTapCount]   = useState(0);
  const [taps,       setTaps]       = useState([]);
  const [phase,      setPhase]      = useState('watch');  // watch | tap | result
  const [patternIdx, setPatternIdx] = useState(0);
  const intervalRef = useRef(null);
  const pattern     = exercise.pattern || ['♩','♩','♩','♩'];
  const totalBeats  = pattern.length;

  // Phase 1: animate the pattern
  useEffect(() => {
    if (phase !== 'watch') return;
    let i = 0;
    intervalRef.current = setInterval(() => {
      setPatternIdx(i % totalBeats);
      playPianoNote(pattern[i % totalBeats] === '♪' ? 'MI' : 'SOL');
      i++;
      if (i >= totalBeats + 1) {
        clearInterval(intervalRef.current);
        setTimeout(() => { setPhase('tap'); setPatternIdx(-1); }, 500);
      }
    }, 600);
    return () => clearInterval(intervalRef.current);
  }, [phase]); // eslint-disable-line

  const handleTap = () => {
    if (phase !== 'tap') return;
    const beat = pattern[taps.length];
    playPianoNote(beat === '♪' ? 'MI' : 'SOL');
    const newTaps = [...taps, beat];
    setTaps(newTaps);
    setTapCount(t => t + 1);
    if (newTaps.length >= totalBeats) {
      const correct = newTaps.join('') === pattern.join('');
      setPhase('result');
      setTimeout(() => onResult(correct), 600);
    }
  };

  return (
    <div className="rhythm-game">
      <p className="rhythm-question">{exercise.question}</p>
      {phase === 'watch' && (
        <>
          <p className="rhythm-hint">👀 Observa el patrón de ritmo:</p>
          <div className="rhythm-pattern-display">
            {pattern.map((beat, i) => (
              <span key={i} className={`rhythm-beat ${i===patternIdx?'rb-active':''} ${beat==='♪'?'rb-short':'rb-long'}`}>
                {beat}
              </span>
            ))}
          </div>
          <p className="rhythm-waiting">Espera la señal para tocar...</p>
        </>
      )}
      {phase === 'tap' && (
        <>
          <p className="rhythm-hint">🥁 ¡Ahora tú! Toca el ritmo ({tapCount}/{totalBeats})</p>
          <div className="rhythm-pattern-display">
            {pattern.map((beat, i) => (
              <span key={i} className={`rhythm-beat ${i<taps.length?'rb-done':''} ${i===taps.length?'rb-next':''} ${beat==='♪'?'rb-short':'rb-long'}`}>
                {i < taps.length ? '✓' : beat}
              </span>
            ))}
          </div>
          <button className="rhythm-tap-btn" onClick={handleTap}>
            <span className="rtb-icon">🥁</span>
            <span>TAP</span>
          </button>
        </>
      )}
      {phase === 'result' && (
        <div className="rhythm-result">
          {taps.join('')===pattern.join('')
            ? <span>🎵 ¡Perfecto ritmo!</span>
            : <span>🎵 Sigue practicando. El ritmo era: {pattern.join(' ')}</span>}
        </div>
      )}
    </div>
  );
};

/* ═══ 🎼 NOTE SEQUENCE GAME ═══════════════════════════════════════════════
   Shows notes out of order, user drags/clicks to put them in order.
   exercise: { question, sequence:['DO','MI','SOL'], answer:'DO MI SOL', xp }
══════════════════════════════════════════════════════════════════════════ */
export const NoteSequenceGame = ({ exercise, onResult }) => {
  const correct  = exercise.sequence || ['DO','MI','SOL'];
  const [pool,   setPool]   = useState(() => [...correct].sort(() => Math.random()-0.5));
  const [chosen, setChosen] = useState([]);
  const [done,   setDone]   = useState(false);

  const pick = (note, fromPool) => {
    if (done) return;
    playPianoNote(note);
    if (fromPool) {
      const idx = pool.indexOf(note);
      const newPool = [...pool]; newPool.splice(idx, 1);
      const newChosen = [...chosen, note];
      setPool(newPool); setChosen(newChosen);
      if (newChosen.length === correct.length) {
        setDone(true);
        const ok = newChosen.join(' ') === correct.join(' ');
        setTimeout(() => onResult(ok), 700);
      }
    } else {
      const idx = chosen.indexOf(note);
      const newChosen = [...chosen]; newChosen.splice(idx, 1);
      setChosen(newChosen); setPool([...pool, note]);
    }
  };

  return (
    <div className="note-seq-game">
      <p className="nsg-question">{exercise.question}</p>
      <p className="nsg-hint">Toca para escuchar · Haz clic para ordenar</p>
      {/* Chosen row */}
      <div className="nsg-chosen-row">
        {chosen.length === 0 && <span className="nsg-placeholder">Pon las notas aquí →</span>}
        {chosen.map((n,i) => (
          <button key={i} className="nsg-note-chip chosen"
            style={{ '--nc': NOTE_COLORS[n] }}
            onClick={() => pick(n, false)}>
            {n}
          </button>
        ))}
      </div>
      {/* Pool */}
      <div className="nsg-pool-row">
        {pool.map((n,i) => (
          <button key={i} className="nsg-note-chip pool"
            style={{ '--nc': NOTE_COLORS[n] }}
            onClick={() => pick(n, true)}>
            {n}
          </button>
        ))}
      </div>
      {done && (
        <div className={`nsg-result ${chosen.join(' ')===correct.join(' ')?'nsg-ok':'nsg-no'}`}>
          {chosen.join(' ')===correct.join(' ')
            ? '🎵 ¡Secuencia perfecta!'
            : `Correcta: ${correct.join(' → ')}`}
        </div>
      )}
    </div>
  );
};
