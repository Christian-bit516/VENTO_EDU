import React, { useState, useEffect } from 'react';
import './CourseMiniGames.css';

/* ═══ 🔢 VISUAL COUNT GAME ════════════════════════════════════════════════
   Shows emoji objects. User counts them and picks the right number.
   exercise: { question, count:7, emoji:'⭐', answer:'7', options:['5','6','7','8'], xp }
══════════════════════════════════════════════════════════════════════════ */
export const VisualCountGame = ({ exercise, onResult }) => {
  const [selected, setSelected] = useState(null);
  const count   = exercise.count || 5;
  const emoji   = exercise.emoji || '⭐';
  const objects = Array.from({ length: count });

  const pick = (opt) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onResult(opt === exercise.answer), 600);
  };

  return (
    <div className="visual-count-game">
      <p className="vcg-question">{exercise.question}</p>
      <div className="vcg-objects">
        {objects.map((_, i) => (
          <span key={i} className="vcg-obj" style={{ animationDelay:`${i*0.05}s` }}>{emoji}</span>
        ))}
      </div>
      <p className="vcg-hint">¿Cuántos {emoji} hay?</p>
      <div className="vcg-options">
        {exercise.options.map((opt, i) => (
          <button key={i}
            className={`vcg-opt ${selected === opt ? (opt===exercise.answer?'vcg-correct':'vcg-wrong') : ''} ${selected && opt===exercise.answer?'vcg-show-correct':''}`}
            onClick={() => pick(opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══ ⚖️ BALANCE SCALE GAME ══════════════════════════════════════════════
   Shows a visual scale with blocks. User picks the number to balance it.
   exercise: { question, left:8, op:'-', missing:3, answer:'5', options:['3','4','5','6'], xp }
══════════════════════════════════════════════════════════════════════════ */
export const BalanceScaleGame = ({ exercise, onResult }) => {
  const [selected, setSelected]   = useState(null);
  const [balanced, setBalanced]   = useState(false);
  const left    = exercise.left    || 8;
  const op      = exercise.op      || '-';
  const missing = exercise.missing || '?';

  const pick = (opt) => {
    if (selected) return;
    setSelected(opt);
    const ok = opt === exercise.answer;
    if (ok) setBalanced(true);
    setTimeout(() => onResult(ok), 800);
  };

  // Build block arrays for visual
  const leftBlocks  = Array.from({ length: Math.min(left, 10) });
  const resultVal   = parseInt(exercise.answer) || 0;
  const rightBlocks = Array.from({ length: Math.min(resultVal, 10) });

  return (
    <div className="balance-game">
      <p className="bg-question">{exercise.question}</p>
      {/* Visual equation */}
      <div className="bg-equation">
        <div className="bg-side">
          <div className="bg-blocks">
            {leftBlocks.map((_,i)=><span key={i} className="bg-block bg-block-a">□</span>)}
          </div>
          <span className="bg-num">{left}</span>
        </div>
        <span className="bg-op">{op}</span>
        <div className="bg-side">
          <div className="bg-blocks">
            {Array.from({length:Math.min(parseInt(missing)||0,10)}).map((_,i)=>
              <span key={i} className="bg-block bg-block-b">□</span>
            )}
          </div>
          <span className="bg-num bg-missing">{missing}</span>
        </div>
        <span className="bg-op">=</span>
        {/* Right side of scale */}
        <div className={`bg-scale-right ${balanced?'bg-balanced':''}`}>
          <div className="bg-blocks">
            {selected ? rightBlocks.map((_,i)=><span key={i} className="bg-block bg-block-c">□</span>) : null}
          </div>
          <span className="bg-num">{selected || '?'}</span>
        </div>
      </div>
      {/* Scale visual */}
      <div className={`bg-scale-bar ${balanced?'bg-scale-ok':selected?'bg-scale-tilt':''}`}>
        <div className="bg-scale-beam" />
        <div className="bg-scale-left-pan" />
        <div className="bg-scale-right-pan" />
      </div>
      <div className="bg-opts">
        {exercise.options.map((opt,i)=>(
          <button key={i}
            className={`bg-opt ${selected===opt?(opt===exercise.answer?'bg-opt-ok':'bg-opt-no'):''} ${selected&&opt===exercise.answer?'bg-opt-show':''}`}
            onClick={()=>pick(opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══ ⚡ MENTAL MATH GAME ══════════════════════════════════════════════════
   Speed: Shows a simple equation, user types the answer quickly.
   exercise: { question:'6 × 7 = ?', answer:'42', xp, timeLimit:10 }
══════════════════════════════════════════════════════════════════════════ */
export const MentalMathGame = ({ exercise, onResult }) => {
  const limit = exercise.timeLimit || 12;
  const [value,    setValue]    = useState('');
  const [timeLeft, setTimeLeft] = useState(limit);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); if (!done) { setDone(true); onResult(false); } return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done]); // eslint-disable-line

  const submit = () => {
    if (done) return;
    setDone(true);
    onResult(value.trim() === String(exercise.answer));
  };

  const timerPct = (timeLeft / limit) * 100;
  const timerColor = timerPct > 50 ? '#58cc02' : timerPct > 25 ? '#fdcb6e' : '#ff4b4b';

  return (
    <div className="mental-math-game">
      {/* Timer bar */}
      <div className="mmg-timer-bar">
        <div className="mmg-timer-fill" style={{ width:`${timerPct}%`, background:timerColor }} />
      </div>
      <div className="mmg-timer-label" style={{ color:timerColor }}>⏱ {timeLeft}s</div>
      <p className="mmg-question">{exercise.question}</p>
      <div className="mmg-input-row">
        <input
          className="mmg-input"
          type="number"
          value={value}
          onChange={e=>setValue(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter')submit();}}
          placeholder="Tu respuesta"
          autoFocus disabled={done}
        />
        <button className="mmg-submit" onClick={submit} disabled={done||!value.trim()}>
          ✓
        </button>
      </div>
      <p className="mmg-hint">Escribe el resultado y presiona Enter o ✓</p>
    </div>
  );
};
