import React, { useState, useCallback, useEffect, useRef } from 'react';
import { sounds, speakText } from '../../hooks/useSounds';
import './MiniGames.css';

/* ─────────────────────────────────────────────────────────────────────
   SHARED UTIL
───────────────────────────────────────────────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ═══════════════════════════════════════════════════════════════════
   1. MATCHING GAME — Click EN tile then ES tile to pair
═══════════════════════════════════════════════════════════════════ */
export const MatchingGame = ({ exercise, onResult }) => {
  const allPairs = exercise.pairs;

  const [tiles] = useState(() => {
    const left = allPairs.map((p, i) => ({ id: `L${i}`, text: p[0], pairId: i, side: 'left' }));
    const right = allPairs.map((p, i) => ({ id: `R${i}`, text: p[1], pairId: i, side: 'right' }));
    return shuffle([...left, ...right]);
  });

  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrong, setWrong] = useState(new Set());
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);

  const handleClick = useCallback((tile) => {
    if (matched.has(tile.id) || done || wrong.size > 0) return;
    sounds.click();
    if (!selected) { setSelected(tile); return; }
    if (selected.id === tile.id) { setSelected(null); return; }

    if (selected.pairId === tile.pairId && selected.side !== tile.side) {
      sounds.correct();
      const nm = new Set(matched); nm.add(selected.id); nm.add(tile.id);
      setMatched(nm); setSelected(null);
      if (nm.size === allPairs.length * 2) {
        setDone(true);
        setTimeout(() => sounds.star(), 250);
        setTimeout(() => onResult(true, errors), 700);
      }
    } else {
      sounds.wrong();
      setErrors(e => e + 1);
      setWrong(new Set([selected.id, tile.id]));
      setTimeout(() => { setWrong(new Set()); setSelected(null); }, 900);
    }
  }, [selected, matched, done, errors, allPairs.length, onResult, wrong.size]);

  const getState = (tile) => {
    if (matched.has(tile.id)) return 'matched';
    if (wrong.has(tile.id)) return 'wrong';
    if (selected?.id === tile.id) return 'selected';
    return '';
  };

  return (
    <div className="mg-wrap">
      <div className="mg-header">
        <span className="mg-type-badge matching">🃏 Empareja</span>
        <span className="mg-progress">{matched.size / 2}/{allPairs.length} pares</span>
        {errors > 0 && <span className="mg-errors">❌ {errors}</span>}
      </div>
      <p className="mg-instruction">{exercise.instruction}</p>
      <div className="matching-grid">
        {tiles.map(tile => (
          <button key={tile.id}
            className={`match-tile ${getState(tile)}`}
            onClick={() => handleClick(tile)}>
            {tile.text}
          </button>
        ))}
      </div>
      <div className="mg-match-progress">
        {allPairs.map((_, i) => (
          <div key={i} className={`match-dot ${matched.has(`L${i}`) ? 'filled' : ''}`} />
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   2. WORD ORDER — Tap words to build sentence
═══════════════════════════════════════════════════════════════════ */
export const WordOrderGame = ({ exercise, onResult }) => {
  const [bank, setBank] = useState(() =>
    shuffle(exercise.words.map((w, i) => ({ id: i, word: w, used: false })))
  );
  const [built, setBuilt] = useState([]);
  const [status, setStatus] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const addWord = (w) => {
    if (w.used || status) return;
    sounds.click();
    setBank(b => b.map(x => x.id === w.id ? { ...x, used: true } : x));
    setBuilt(b => [...b, w]);
  };
  const removeWord = (w) => {
    if (status) return;
    sounds.click();
    setBank(b => b.map(x => x.id === w.id ? { ...x, used: false } : x));
    setBuilt(b => b.filter(x => x.id !== w.id));
  };
  const resetAll = () => {
    setBank(b => b.map(x => ({ ...x, used: false })));
    setBuilt([]);
    setStatus(null);
  };

  const checkAnswer = () => {
    const userAns = built.map(w => w.word).join(' ').toLowerCase().replace(/[.,!?]/g, '').trim();
    const correct = exercise.answer.toLowerCase().replace(/[.,!?]/g, '').trim();
    const isOk = userAns === correct;
    setAttempts(a => a + 1);
    if (isOk) {
      sounds.correct();
      setStatus('correct');
      setTimeout(() => onResult(true, attempts), 700);
    } else {
      sounds.wrong();
      setStatus('wrong');
      setTimeout(() => { setStatus(null); resetAll(); }, 1400);
    }
  };

  const pct = Math.round((built.length / exercise.words.length) * 100);

  return (
    <div className="mg-wrap">
      <div className="mg-header">
        <span className="mg-type-badge wordorder">🔤 Ordena</span>
      </div>
      <p className="mg-instruction">{exercise.instruction}</p>
      {exercise.answerEs && <p className="wo-translation-hint">💭 "{exercise.answerEs}"</p>}

      <div className={`wo-sentence-area ${status || ''}`}>
        {built.length === 0
          ? <span className="wo-placeholder">Toca las palabras abajo...</span>
          : built.map((w, i) => (
            <button key={`b${w.id}${i}`} className="wo-chip built" onClick={() => removeWord(w)}>
              {w.word} <span className="chip-remove">×</span>
            </button>
          ))
        }
      </div>

      <div className="wo-mini-progress">
        <div className="wo-mini-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="wo-bank">
        {bank.map(w => (
          <button key={w.id} className={`wo-chip bank ${w.used ? 'used' : ''}`}
            onClick={() => addWord(w)} disabled={w.used}
            onMouseEnter={() => !w.used && sounds.hover()}>
            {w.word}
          </button>
        ))}
      </div>

      {status === 'correct' && <div className="wo-feedback correct">✅ ¡Perfecto! "{exercise.answer}"</div>}
      {status === 'wrong' && <div className="wo-feedback wrong">❌ Revisa el orden — inténtalo de nuevo</div>}

      {!status && built.length > 0 && (
        <div className="wo-actions">
          <button className="wo-reset-btn" onClick={resetAll}>↺ Resetear</button>
          <button className="wo-check-btn" onClick={checkAnswer}>Verificar ✓</button>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   3. MEMORY MATCH — Flip card pairs EN/ES
═══════════════════════════════════════════════════════════════════ */
export const MemoryMatch = ({ exercise, onResult }) => {
  const [cards] = useState(() => {
    const pairs = exercise.pairs.slice(0, 4);
    const deck = [];
    pairs.forEach((p, i) => {
      deck.push({ id: `e${i}`, text: p[0], pairId: i, lang: 'en' });
      deck.push({ id: `s${i}`, text: p[1], pairId: i, lang: 'es' });
    });
    return shuffle(deck).map(c => ({ ...c, flipped: false, matched: false }));
  });

  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [wrong, setWrong] = useState(new Set());

  const handleCardClick = (card) => {
    if (locked || card.flipped || card.matched || flipped.length >= 2) return;
    sounds.click();
    const newFlipped = [...flipped, card];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);
      const [a, b] = newFlipped;
      if (a.pairId === b.pairId) {
        sounds.correct();
        const nm = new Set(matched); nm.add(a.id); nm.add(b.id);
        setMatched(nm);
        setFlipped([]);
        setLocked(false);
        if (nm.size === cards.length) {
          setTimeout(() => sounds.star(), 300);
          setTimeout(() => onResult(true, 0), 700);
        }
      } else {
        sounds.wrong();
        setWrong(new Set([a.id, b.id]));
        setTimeout(() => {
          setFlipped([]);
          setWrong(new Set());
          setLocked(false);
        }, 900);
      }
    }
  };

  const isCardFlipped = (card) => flipped.some(f => f.id === card.id) || matched.has(card.id);

  return (
    <div className="mg-wrap">
      <div className="mg-header">
        <span className="mg-type-badge memory">🧠 Memoria</span>
        <span className="mg-progress">{matched.size / 2}/{cards.length / 2} pares</span>
        <span className="mg-moves">🖱️ {moves} movs</span>
      </div>
      <p className="mg-instruction">Encuentra los pares EN ↔ ES</p>
      <div className="memory-grid">
        {cards.map(card => (
          <div key={card.id}
            className={`memory-card ${isCardFlipped(card) ? 'flipped' : ''} ${matched.has(card.id) ? 'matched' : ''} ${wrong.has(card.id) ? 'wrong' : ''}`}
            onClick={() => handleCardClick(card)}>
            <div className="memory-card-inner">
              <div className="memory-card-back">
                <span className="memory-card-icon">⭐</span>
              </div>
              <div className={`memory-card-front ${card.lang}`}>
                <span className="memory-card-lang">{card.lang === 'en' ? '🇺🇸' : '🇲🇽'}</span>
                <span className="memory-card-text">{card.text}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="memory-matched-row">
        {Array.from({ length: cards.length / 2 }, (_, i) => (
          <div key={i} className={`memory-pair-slot ${matched.has(`e${i}`) ? 'filled' : ''}`}>
            {matched.has(`e${i}`) ? '✅' : '⬜'}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   4. WORD SCRAMBLE — Unscramble the letters
═══════════════════════════════════════════════════════════════════ */
export const WordScramble = ({ exercise, onResult }) => {
  const targetWord = exercise.answer;
  const hint = exercise.question;

  const [letters] = useState(() =>
    shuffle(targetWord.toUpperCase().split('').map((l, i) => ({ id: i, letter: l, used: false })))
  );
  const [built, setBuilt] = useState([]);
  const [status, setStatus] = useState(null);

  const addLetter = (l) => {
    if (l.used || status) return;
    sounds.click();
    setLetters(prev => prev.map(x => x.id === l.id ? { ...x, used: true } : x));
    setBuilt(b => [...b, l]);
  };

  // need setLetters
  const [letterState, setLetters] = useState(letters);

  const removeLast = () => {
    if (built.length === 0 || status) return;
    sounds.click();
    const last = built[built.length - 1];
    setLetters(prev => prev.map(x => x.id === last.id ? { ...x, used: false } : x));
    setBuilt(b => b.slice(0, -1));
  };

  const checkWord = () => {
    const word = built.map(l => l.letter).join('');
    if (word.toLowerCase() === targetWord.toLowerCase()) {
      sounds.correct();
      setStatus('correct');
      setTimeout(() => onResult(true, 0), 600);
    } else {
      sounds.wrong();
      setStatus('wrong');
      setTimeout(() => {
        setLetters(prev => prev.map(x => ({ ...x, used: false })));
        setBuilt([]);
        setStatus(null);
      }, 1000);
    }
  };

  const pct = Math.round((built.length / targetWord.length) * 100);

  return (
    <div className="mg-wrap">
      <div className="mg-header">
        <span className="mg-type-badge scramble">🔡 Descifra</span>
      </div>
      <p className="mg-instruction">Forma la palabra en inglés</p>
      <div className="scramble-hint">
        <span className="scramble-hint-label">Pista:</span>
        <span className="scramble-hint-text">{hint}</span>
        <button className="scramble-listen" onClick={() => { sounds.listen(); speakText(targetWord, 'en-US'); }}>🔊</button>
      </div>

      {/* Built word area */}
      <div className={`scramble-built ${status || ''}`}>
        {Array.from({ length: targetWord.length }, (_, i) => (
          <div key={i} className={`scramble-slot ${i < built.length ? 'filled' : ''}`}>
            {i < built.length ? built[i].letter : ''}
          </div>
        ))}
      </div>

      {/* Mini progress */}
      <div className="wo-mini-progress" style={{ margin: '.5rem 0 1rem' }}>
        <div className="wo-mini-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ce82ff,#1cb0f6)' }} />
      </div>

      {/* Letter bank */}
      <div className="scramble-bank">
        {letterState.map(l => (
          <button key={l.id} className={`scramble-letter ${l.used ? 'used' : ''}`}
            onClick={() => addLetter(l)} disabled={l.used}
            onMouseEnter={() => !l.used && sounds.hover()}>
            {l.letter}
          </button>
        ))}
      </div>

      {status === 'correct' && <div className="wo-feedback correct">✅ ¡Correcto! "{targetWord}"</div>}
      {status === 'wrong' && <div className="wo-feedback wrong">❌ No es correcto, intenta de nuevo</div>}

      <div className="wo-actions">
        <button className="wo-reset-btn" onClick={removeLast} disabled={built.length === 0}>⌫ Borrar</button>
        {built.length === targetWord.length && !status && (
          <button className="wo-check-btn" onClick={checkWord}>Verificar ✓</button>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   5. SPEED QUIZ — Timed multiple choice
═══════════════════════════════════════════════════════════════════ */
export const SpeedQuiz = ({ exercise, onResult }) => {
  const TIME_LIMIT = 10;
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setStatus('timeout');
          setTimeout(() => onResult(false, 1), 1000);
          return 0;
        }
        if (t <= 4) sounds.tick();
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [onResult]);

  const handleAnswer = (opt) => {
    if (status) return;
    clearInterval(timerRef.current);
    sounds.click();
    setSelected(opt);
    const isOk = opt === exercise.answer || opt.toLowerCase() === exercise.answer?.toLowerCase();
    if (isOk) {
      sounds.correct();
      setStatus('correct');
      const speedBonus = timeLeft >= 7 ? 3 : timeLeft >= 4 ? 1 : 0;
      setTimeout(() => onResult(true, speedBonus), 700);
    } else {
      sounds.wrong();
      setStatus('wrong');
      setTimeout(() => onResult(false, 0), 1000);
    }
  };

  const pct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 6 ? '#58cc02' : timeLeft > 3 ? '#ff9600' : '#ff4b4b';

  return (
    <div className="mg-wrap">
      <div className="mg-header">
        <span className="mg-type-badge speed">⚡ Speed Quiz</span>
        {timeLeft > 6 && <span className="speed-bonus-hint">Respuesta rápida = +XP bonus</span>}
      </div>

      {/* Timer ring */}
      <div className="speed-timer-wrap">
        <svg className="speed-timer-svg" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={timerColor}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke .5s ease' }}
            transform="rotate(-90 50 50)" />
        </svg>
        <div className="speed-timer-text" style={{ color: timerColor }}>{timeLeft}</div>
      </div>

      <p className="speed-question">{exercise.question}</p>

      <div className="options-grid speed-options">
        {exercise.options.map((opt, i) => (
          <button key={i}
            className={`option-btn speed-option ${
              status && opt === exercise.answer ? 'correct' :
              status && selected === opt ? 'wrong' :
              selected === opt ? 'selected' : ''
            }`}
            onClick={() => handleAnswer(opt)}
            style={{ animationDelay: `${i * 0.05}s` }}
            onMouseEnter={() => !status && sounds.hover()}>
            {opt}
          </button>
        ))}
      </div>

      {status === 'timeout' && <div className="wo-feedback wrong">⏰ ¡Tiempo! Era: "{exercise.answer}"</div>}
      {timeLeft > 6 && !status && <div className="speed-timer-tip">🏃 ¡Rápido! Más XP si respondes en tiempo</div>}
    </div>
  );
};

export default { MatchingGame, WordOrderGame, MemoryMatch, WordScramble, SpeedQuiz };
