import React, { useState, useCallback } from 'react';
import DigitalPiano, { playPianoNote } from '../DigitalPiano/DigitalPiano';
import '../DigitalPiano/DigitalPiano.css';
import '../MusicMiniGames/CourseMiniGames.css';

const NOTE_DATA = {
  'C4':{ label:'DO', freq:261.63 }, 'D4':{ label:'RE', freq:293.66 },
  'E4':{ label:'MI', freq:329.63 }, 'F4':{ label:'FA', freq:349.23 },
  'G4':{ label:'SOL',freq:392.00 }, 'A4':{ label:'LA', freq:440.00 },
  'B4':{ label:'SI', freq:493.88 }, 'C5':{ label:'DO', freq:523.25 },
};

/* ═══ 🎹 PIANO PLAY EXERCISE ═══════════════════════════════════
   exercise: {
     type: 'piano_play',
     question: 'Toca la nota DO en el piano',
     targetNote: 'C4',           ← single note mode
     xp: 10
   }
   OR sequence mode:
   exercise: {
     type: 'piano_play',
     question: 'Toca: DO → MI → SOL',
     sequence: ['C4','E4','G4'], ← sequence mode
     xp: 15
   }
══════════════════════════════════════════════════════════════ */
const PianoPlayExercise = ({ exercise, onResult }) => {
  const sequence  = exercise.sequence || (exercise.targetNote ? [exercise.targetNote] : ['C4']);
  const [step,    setStep]    = useState(0);
  const [mistakes,setMistakes]= useState(0);
  const [flashes, setFlashes] = useState([]);
  const [done,    setDone]    = useState(false);

  const targetNote  = sequence[step];
  const targetNoteObj = { note: targetNote, ...(NOTE_DATA[targetNote] || { label:'?', freq:440 }) };

  // Animate a flash on a key
  const flashKey = useCallback((noteId, ok) => {
    setFlashes(prev => [...prev, { noteId, ok, id: Date.now() }]);
    setTimeout(() => setFlashes(prev => prev.filter(f => f.noteId !== noteId)), 800);
  }, []);

  const handleNotePlayed = useCallback((n) => {
    if (done) return;
    const isCorrect = n.note === targetNote;
    flashKey(n.note, isCorrect);
    if (isCorrect) {
      const nextStep = step + 1;
      if (nextStep >= sequence.length) {
        setDone(true);
        setTimeout(() => onResult(true, mistakes), 600);
      } else {
        setStep(nextStep);
      }
    } else {
      setMistakes(m => m + 1);
    }
  }, [done, step, sequence, targetNote, mistakes, flashKey, onResult]);

  return (
    <div className="piano-exercise">
      <p className="pe-question">{exercise.question}</p>

      {/* Sequence progress */}
      {sequence.length > 1 && (
        <div className="pe-sequence">
          {sequence.map((noteId, i) => {
            const nd = NOTE_DATA[noteId] || { label: noteId };
            return (
              <div key={i} className={`pe-seq-note ${i < step ? 'pe-done' : i === step ? 'pe-current' : 'pe-pending'}`}>
                <span className="pe-seq-icon">{i < step ? '✅' : i === step ? '🎯' : '○'}</span>
                <span className="pe-seq-label">{nd.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {!done && (
        <div className="pe-target">
          🎯 Toca ahora: <strong style={{ fontSize:'1.3rem', color:'#ff6b9d' }}>{targetNoteObj.label}</strong>
          {mistakes > 0 && <span className="pe-mistakes">({mistakes} error{mistakes>1?'es':''})</span>}
        </div>
      )}
      {done && <div className="pe-success">🎵 ¡Perfecto! Tocaste todas las notas correctamente.</div>}

      <DigitalPiano
        highlightNote={done ? null : targetNoteObj}
        onNotePlayed={handleNotePlayed}
      />
    </div>
  );
};

export default PianoPlayExercise;
