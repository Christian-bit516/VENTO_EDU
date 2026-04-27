import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sounds, speakText } from '../hooks/useSounds';
import lessonsJson from '../../data/lessons.json';
import LessonTheory from '../components/LessonTheory/LessonTheory';
import { MatchingGame, WordOrderGame, MemoryMatch, WordScramble, SpeedQuiz } from '../components/MiniGames/MiniGames';
import '../components/LessonTheory/LessonTheory.css';
import '../components/MiniGames/MiniGames.css';
import './EnglishModule.css';

const API_BASE = 'http://localhost:3001';
const UNIT_COLORS = ['#58cc02', '#1cb0f6', '#ce82ff', '#ff9600', '#ff4b4b'];

const EnglishModule = () => {
  const navigate = useNavigate();
  const { user, updateProgress } = useAuth();

  const [lessons] = useState(lessonsJson);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lessonMode, setLessonMode] = useState('theory'); // 'theory' | 'exercises'
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [xp, setXp] = useState(user?.progress?.english?.xp || 0);
  const [streak, setStreak] = useState(user?.progress?.english?.streak || 0);
  const [hearts, setHearts] = useState(5);
  const [completedLessons, setCompletedLessons] = useState(user?.progress?.english?.completedLessons || []);
  const [showXpPopup, setShowXpPopup] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [speechResult, setSpeechResult] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [lessonXp, setLessonXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [exerciseAnim, setExerciseAnim] = useState('');
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [mounted, setMounted] = useState(false);

  const recognitionRef = useRef(null);
  const level = Math.floor(xp / 100) + 1;
  const currentExercise = currentLesson?.exercises?.[exerciseIndex] || null;

  // Ejercicio alternativo cuando el usuario no tiene micrófono
  const [swappedExercise, setSwappedExercise] = useState(null);

  // El ejercicio que realmente se muestra (original o swapped)
  const activeExercise = swappedExercise || currentExercise;

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  /* ── Confetti ─────────────────────────────────────────────────────────── */
  const spawnConfetti = useCallback(() => {
    const colors = ['#58cc02', '#1cb0f6', '#ce82ff', '#ff9600', '#ffc800', '#ff4b4b'];
    const pieces = Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      size: 5 + Math.random() * 8,
      rotation: Math.random() * 360,
    }));
    setConfettiPieces(pieces);
    setTimeout(() => setConfettiPieces([]), 2800);
  }, []);

  /* ── Normalize ─────────────────────────────────────────────────────────── */
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[''´`]/g, '').replace(/[.,!?;:¿¡"()]/g, '').replace(/\s+/g, ' ').trim();
  };

  /* ── Save progress ─────────────────────────────────────────────────────── */
  const saveProgress = useCallback((newXp, newCompleted) => {
    const data = { xp: newXp, level: Math.floor(newXp / 100) + 1, streak, completedLessons: newCompleted };
    updateProgress('english', data);
  }, [streak, updateProgress]);

  /* ── Start lesson — show theory first ─────────────────────────────────── */
  const startLesson = (lesson) => {
    sounds.click();
    setCurrentLesson(lesson);
    setLessonMode('theory');
    setExerciseIndex(0);
    setLessonXp(0);
    setCorrectCount(0);
    setLessonComplete(false);
    setHearts(5);
    setCombo(0);
    setMaxCombo(0);
    resetExerciseState();
  };

  const startExercises = () => {
    sounds.lessonStart();
    setLessonMode('exercises');
    resetExerciseState();
  };

  const resetExerciseState = () => {
    setSelectedOption(null);
    setInputValue('');
    setFeedback(null);
    setSpeechResult(null);
    setAnswered(false);
    setSwappedExercise(null);
    setExerciseAnim('enter');
    setTimeout(() => setExerciseAnim(''), 500);
  };

  /* ── Skip speak → convert to translate (sin micrófono) ─────────────── */
  const skipSpeakExercise = () => {
    if (!currentExercise || currentExercise.type !== 'speak') return;
    sounds.click();
    // Construir opciones: la respuesta correcta + 3 distractores del mismo ejercicio
    const correct = currentExercise.text;
    const distractors = [
      currentExercise.textEs ? `${currentExercise.textEs} (ES)` : 'Good morning',
      'How are you?',
      'See you later',
      'Thank you very much',
      'Nice to meet you',
    ].filter(d => d !== correct).slice(0, 3);
    const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
    setSwappedExercise({
      ...currentExercise,
      type: 'translate',
      question: `¿Cómo se dice en inglés: "${currentExercise.textEs || currentExercise.text}"?`,
      options,
      answer: correct,
      xp: Math.max(1, (currentExercise.xp || 5) - 2), // menos XP por la versión fácil
    });
  };

  /* ── Check answer ──────────────────────────────────────────────────────── */
  const checkAnswer = useCallback((answer) => {
    if (!activeExercise || answered) return;
    const userAnswer = normalize(answer);
    const correctAnswer = normalize(activeExercise.answer);
    const altAnswer = normalize(activeExercise.text);
    const isCorrect = userAnswer === correctAnswer || userAnswer === altAnswer
      || (correctAnswer.includes(userAnswer) && userAnswer.length > 2)
      || (userAnswer.includes(correctAnswer) && correctAnswer.length > 2);

    setAnswered(true);

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));

      sounds.correct();
      if (newCombo >= 3) setTimeout(() => sounds.combo(newCombo), 200);

      const baseXp = activeExercise.xp || 5;
      const comboBonus = newCombo >= 5 ? 3 : newCombo >= 3 ? 2 : 0;
      const earned = baseXp + comboBonus;

      setLessonXp(prev => prev + earned);
      setCorrectCount(prev => prev + 1);
      setFeedback({
        correct: true,
        message: `¡Correcto! +${earned} XP${comboBonus > 0 ? ` (🔥 combo x${newCombo}!)` : ''}${
          swappedExercise ? ' (versión escrita)' : ''
        }`
      });
      setXpGained(earned);
      setShowXpPopup(true);
      spawnConfetti();
      setTimeout(() => { setShowXpPopup(false); sounds.xp(); }, 600);
    } else {
      sounds.wrong();
      setCombo(0);
      setTimeout(() => sounds.heartLost(), 300);
      setHearts(prev => Math.max(0, prev - 1));
      setFeedback({ correct: false, message: `Respuesta correcta: "${activeExercise.answer}"` });
    }
  }, [activeExercise, answered, combo, spawnConfetti, swappedExercise]);

  /* ── Next exercise ─────────────────────────────────────────────────────── */
  const nextExercise = () => {
    if (!currentLesson) return;
    sounds.next();
    if (exerciseIndex + 1 >= currentLesson.exercises.length) {
      const newXp = xp + lessonXp;
      const newCompleted = [...new Set([...completedLessons, currentLesson.id])];
      setXp(newXp);
      setCompletedLessons(newCompleted);
      setStreak(prev => prev + 1);
      setLessonComplete(true);
      saveProgress(newXp, newCompleted);
      setTimeout(() => sounds.lessonComplete(), 400);
    } else {
      setExerciseIndex(prev => prev + 1);
      resetExerciseState();
    }
  };

  /* ── TTS ────────────────────────────────────────────────────────────────── */
  const speak = useCallback((text, lang = 'en-US') => {
    sounds.listen();
    speakText(text, lang, 0.85);
  }, []);

  /* ── Speech Recognition ─────────────────────────────────────────────────── */
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // No hay soporte: ofrecer cambio automático
      skipSpeakExercise();
      return;
    }

    sounds.recordStart();
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 3;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setSpeechResult(transcript);
      setIsRecording(false);

      const expected = normalize(activeExercise?.text);
      const got = normalize(transcript);
      let matched = false;

      for (let i = 0; i < e.results[0].length; i++) {
        if (normalize(e.results[0][i].transcript) === expected) { matched = true; break; }
      }
      if (!matched) {
        const ew = expected.split(/\s+/), gw = got.split(/\s+/);
        matched = ew.filter(w => gw.includes(w)).length / ew.length >= 0.5;
      }
      if (!matched && (got.includes(expected) || expected.includes(got)) && got.length >= 3) matched = true;

      if (matched) {
        const newCombo = combo + 1;
        setCombo(newCombo);
        setMaxCombo(prev => Math.max(prev, newCombo));
        sounds.correct();
        if (newCombo >= 3) setTimeout(() => sounds.combo(newCombo), 200);

        const baseXp = activeExercise.xp || 5;
        const comboBonus = newCombo >= 5 ? 3 : newCombo >= 3 ? 2 : 0;
        const earned = baseXp + comboBonus;

        setLessonXp(prev => prev + earned);
        setCorrectCount(prev => prev + 1);
        setAnswered(true);
        setFeedback({
          correct: true,
          message: `¡Correcto! +${earned} XP${comboBonus > 0 ? ` (🔥 combo x${newCombo}!)` : ''}`
        });
        setXpGained(earned);
        setShowXpPopup(true);
        spawnConfetti();
        setTimeout(() => { setShowXpPopup(false); sounds.xp(); }, 600);
        setSpeechResult(`"${transcript}" ✓`);
      } else {
        sounds.wrong();
        setCombo(0);
        setTimeout(() => sounds.heartLost(), 300);
        setAnswered(true);
        setHearts(prev => Math.max(0, prev - 1));
        setFeedback({ correct: false, message: `Dijiste: "${transcript}". Se esperaba: "${activeExercise.text}"` });
        setSpeechResult(`"${transcript}" ✗`);
      }
    };

    rec.onerror = (err) => {
      setIsRecording(false);
      sounds.recordStop();
      // Si el error es por falta de permiso o hardware, sugerimos cambio
      if (err.error === 'not-allowed' || err.error === 'audio-capture' || err.error === 'no-speech') {
        setSpeechResult('⚠️ No se detectó micrófono. Usa el botón de abajo para cambiar el ejercicio.');
      } else {
        setSpeechResult('No se pudo capturar el audio.');
      }
    };
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
    setSpeechResult(null);
  }, [activeExercise, combo, spawnConfetti, skipSpeakExercise]);

  /* ── Option click ──────────────────────────────────────────────────────── */
  const handleOptionClick = (opt) => {
    if (answered) return;
    sounds.click();
    setSelectedOption(opt);
    setTimeout(() => checkAnswer(opt), 150);
  };

  /* ── Calculate stars ───────────────────────────────────────────────────── */
  const getStars = () => {
    if (!currentLesson) return 0;
    const total = currentLesson.exercises.length;
    const pct = correctCount / total;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.4) return 1;
    return 0;
  };

  /* ── Mini-game result handler ─────────────────────────────────────────── */
  const handleMiniGameResult = useCallback((isCorrect, errors = 0) => {
    setAnswered(true);
    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));
      const earned = (currentExercise.xp || 5) + (errors === 0 ? 2 : 0);
      setLessonXp(prev => prev + earned);
      setCorrectCount(prev => prev + 1);
      setFeedback({ correct: true, message: `¡Perfecto! +${earned} XP` });
      setXpGained(earned); setShowXpPopup(true);
      spawnConfetti();
      setTimeout(() => { setShowXpPopup(false); sounds.xp(); }, 600);
    } else {
      setCombo(0);
      setHearts(prev => Math.max(0, prev - 1));
      setFeedback({ correct: false, message: 'Sigue practicando' });
    }
  }, [combo, currentExercise, spawnConfetti]);

  /* ── Render Exercise ───────────────────────────────────────────────────── */
  const renderExercise = () => {
    if (!activeExercise) return null;
    const { type } = activeExercise;

    return (
      <div className={`exercise-card ${exerciseAnim}`} key={`${currentLesson.id}-${exerciseIndex}`}>
        {/* Combo indicator */}
        {combo >= 2 && (
          <div className="combo-badge">
            <span className="combo-fire">🔥</span>
            <span className="combo-count">x{combo}</span>
            <span className="combo-label">COMBO</span>
          </div>
        )}

        <span className={`exercise-type-label ${type}`}>
          {type === 'translate' && (swappedExercise ? '✍️ Ejercicio escrito' : '✍️ Traducción')}
          {type === 'listen' && '🔊 Escucha'}
          {type === 'speak' && '🎤 Pronunciación'}
          {type === 'fillblank' && '📝 Completar'}
        </span>

        {type === 'translate' && (
          <>
            <p className="exercise-question">{activeExercise.question}</p>
            <p className="exercise-instruction">Selecciona la respuesta correcta</p>
            <div className="options-grid">
              {activeExercise.options.map((opt, i) => (
                <button key={i}
                  className={`option-btn ${answered ? (opt === activeExercise.answer ? 'correct' : selectedOption === opt ? 'wrong' : 'dim') : selectedOption === opt ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(opt)}
                  onMouseEnter={() => !answered && sounds.hover()}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >{opt}</button>
              ))}
            </div>
          </>
        )}

        {type === 'listen' && (
          <>
            <p className="exercise-instruction">{activeExercise.instruction}</p>
            <button className="btn-listen" onClick={() => speak(activeExercise.text)}>
              <span className="btn-listen-icon">🔊</span>
              <span className="btn-listen-ripple" />
              <span className="btn-listen-ripple r2" />
            </button>
            <input type="text"
              className={`exercise-input ${answered ? (feedback?.correct ? 'correct' : 'wrong') : ''}`}
              placeholder="Escribe lo que escuchas..." value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !answered) { sounds.click(); checkAnswer(inputValue); } }}
              disabled={answered} autoFocus
            />
            {!answered && (
              <button className="btn btn-blue btn-full" onClick={() => { sounds.click(); checkAnswer(inputValue); }} disabled={!inputValue.trim()}>
                VERIFICAR
              </button>
            )}
          </>
        )}

        {type === 'speak' && (
          <>
            <p className="exercise-instruction">{activeExercise.instruction || 'Repite la siguiente frase en voz alta'}</p>
            <div className="speech-text-card">
              <p className="speech-text-en">{activeExercise.text}</p>
              {activeExercise.textEs && <p className="speech-text-es">{activeExercise.textEs}</p>}
            </div>
            <div className="speak-controls">
              <button className="btn-listen-sm" onClick={() => speak(activeExercise.text)} onMouseEnter={() => sounds.hover()}>🔊</button>
              <button className={`btn-mic ${isRecording ? 'recording' : ''}`}
                onClick={() => { if (isRecording) { recognitionRef.current?.stop(); sounds.recordStop(); } else startRecording(); }}
                disabled={answered}
                onMouseEnter={() => !answered && sounds.hover()}
              >
                <span>{isRecording ? '⏹️' : '🎤'}</span>
                {isRecording && <span className="mic-wave" />}
                {isRecording && <span className="mic-wave w2" />}
              </button>
            </div>
            {speechResult && (
              <p className={`speech-result-text ${feedback?.correct ? 'match' : 'no-match'}`}>{speechResult}</p>
            )}
            {/* ── Botón "Sin micrófono" al estilo Duolingo ── */}
            {!answered && (
              <button
                className="btn-no-mic"
                onClick={skipSpeakExercise}
                onMouseEnter={() => sounds.hover()}
                title="Cambiar a ejercicio escrito"
              >
                <span className="no-mic-icon">🎤❌</span>
                No tengo micrófono · Cambiar ejercicio
              </button>
            )}
          </>
        )}

        {type === 'fillblank' && (
          <>
            <p className="exercise-question">{activeExercise.sentence.replace('___', ' ______ ')}</p>
            <p className="exercise-instruction">Elige la palabra correcta</p>
            <div className="options-grid">
              {activeExercise.options.map((opt, i) => (
                <button key={i}
                  className={`option-btn ${answered ? (opt === activeExercise.answer ? 'correct' : selectedOption === opt ? 'wrong' : 'dim') : selectedOption === opt ? 'selected' : ''}`}
                  onClick={() => handleOptionClick(opt)}
                  onMouseEnter={() => !answered && sounds.hover()}
                  style={{ animationDelay: `${i * 0.06}s` }}
                >{opt}</button>
              ))}
            </div>
          </>
        )}

        {type === 'matching' && !answered && (
          <MatchingGame exercise={currentExercise} onResult={handleMiniGameResult} />
        )}
        {type === 'wordorder' && !answered && (
          <WordOrderGame exercise={currentExercise} onResult={handleMiniGameResult} />
        )}
        {type === 'memory' && !answered && (
          <MemoryMatch exercise={currentExercise} onResult={handleMiniGameResult} />
        )}
        {type === 'scramble' && !answered && (
          <WordScramble exercise={currentExercise} onResult={handleMiniGameResult} />
        )}
        {type === 'speed' && !answered && (
          <SpeedQuiz exercise={currentExercise} onResult={handleMiniGameResult} />
        )}

        {feedback && (['matching','wordorder','memory','scramble','speed'].includes(type) ? answered : true) && (
          <div className={`feedback-banner ${feedback.correct ? 'correct' : 'wrong'}`}>
            <span className="feedback-icon">{feedback.correct ? '🎉' : '😔'}</span>
            <div className="feedback-content">
              <p className="feedback-title">{feedback.correct ? '¡Excelente!' : 'Incorrecto'}</p>
              <p className="feedback-text">{feedback.message}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ── Lesson Complete Screen ─────────────────────────────────────────────── */
  if (lessonComplete) {
    const stars = getStars();
    return (
      <div className="lesson-complete-page">
        <div className="confetti-layer" aria-hidden="true">
          {Array.from({ length: 50 }, (_, i) => (
            <span key={i} className="confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              backgroundColor: ['#58cc02','#1cb0f6','#ce82ff','#ff9600','#ffc800','#ff4b4b'][i % 6],
              width: `${5 + Math.random() * 8}px`,
              height: `${5 + Math.random() * 8}px`,
            }} />
          ))}
        </div>

        <div className="lesson-complete-card">
          {/* Stars */}
          <div className="stars-row">
            {[1, 2, 3].map(s => (
              <span key={s} className={`star-item ${s <= stars ? 'earned' : 'empty'}`}
                style={{ animationDelay: `${0.3 + s * 0.2}s` }}>
                {s <= stars ? '⭐' : '☆'}
              </span>
            ))}
          </div>

          <h2 className="complete-title">¡Lección Completada!</h2>
          <p className="complete-lesson-name">{currentLesson.titleEs || currentLesson.title}</p>

          <div className="complete-stats-row">
            <div className="complete-stat">
              <div className="complete-stat-value cs-orange">+{lessonXp}</div>
              <div className="complete-stat-label">XP Ganado</div>
            </div>
            <div className="complete-stat">
              <div className="complete-stat-value cs-green">{correctCount}/{currentLesson.exercises.length}</div>
              <div className="complete-stat-label">Correctas</div>
            </div>
            <div className="complete-stat">
              <div className="complete-stat-value cs-red">🔥 {streak}</div>
              <div className="complete-stat-label">Racha</div>
            </div>
            {maxCombo >= 2 && (
              <div className="complete-stat">
                <div className="complete-stat-value cs-purple">x{maxCombo}</div>
                <div className="complete-stat-label">Max Combo</div>
              </div>
            )}
          </div>

          <div className="complete-buttons">
            <button className="btn btn-green btn-full btn-lg"
              onClick={() => { sounds.navigate(); setCurrentLesson(null); setLessonComplete(false); }}>
              CONTINUAR →
            </button>
            <button className="btn btn-outline btn-full"
              onClick={() => { sounds.navigate(); navigate('/dashboard'); }}>
              IR AL INICIO
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ MAIN RENDER ═══════════════════════════════════════════════════════════ */
  return (
    <div className={`eng-page ${mounted ? 'mounted' : ''}`}>
      {/* Confetti */}
      {confettiPieces.length > 0 && (
        <div className="confetti-layer" aria-hidden="true">
          {confettiPieces.map(p => (
            <span key={p.id} className="confetti-piece" style={{
              left: `${p.x}%`, animationDelay: `${p.delay}s`,
              backgroundColor: p.color, width: `${p.size}px`, height: `${p.size}px`,
              transform: `rotate(${p.rotation}deg)`,
            }} />
          ))}
        </div>
      )}

      {/* XP popup */}
      {showXpPopup && (
        <div className="xp-popup">
          <div className="xp-popup-value">+{xpGained}</div>
          <div className="xp-popup-label">XP</div>
        </div>
      )}

      {/* Top bar — only show during exercises */}
      {!(currentLesson && lessonMode === 'theory') && (
        <div className="eng-topbar">
          <div className="eng-topbar-inner">
            <button className="eng-back-btn" onClick={() => {
              sounds.navigate();
              if (currentLesson && lessonMode === 'exercises') { setLessonMode('theory'); resetExerciseState(); }
              else if (currentLesson) { setCurrentLesson(null); }
              else navigate('/dashboard');
            }}>
              ← {currentLesson && lessonMode === 'exercises' ? 'Tutorial' : currentLesson ? 'Lecciones' : 'Inicio'}
            </button>
            {currentLesson && lessonMode === 'exercises' && <span className="eng-topbar-title">{currentLesson.titleEs || currentLesson.title}</span>}
            <div className="eng-topbar-stats">
              <span className="eng-stat xp">⚡ {xp}</span>
              <span className="eng-stat streak">🔥 {streak}</span>
              <div className="eng-hearts">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < hearts ? 'heart-full' : 'heart-empty'}>{i < hearts ? '❤️' : '🖤'}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="eng-content" style={{ paddingBottom: currentLesson && answered ? '100px' : '2rem' }}>
        {/* THEORY SCREEN */}
        {currentLesson && lessonMode === 'theory' ? (
          <LessonTheory
            lesson={currentLesson}
            onStart={startExercises}
            onBack={() => { sounds.navigate(); setCurrentLesson(null); }}
          />
        ) : currentLesson && lessonMode === 'exercises' ? (
          <div className="exercise-view">
            <div className="exercise-progress-bar">
              <button className="exercise-close-btn" onClick={() => { sounds.navigate(); setCurrentLesson(null); }}>✕</button>
              <div className="exercise-progress-track">
                <div className="progress-bar-fancy">
                  <div className="progress-fill-fancy" style={{ width: `${((exerciseIndex + (answered ? 1 : 0)) / currentLesson.exercises.length) * 100}%` }}>
                    <div className="progress-shimmer" />
                  </div>
                </div>
              </div>
              <span className="exercise-counter">{exerciseIndex + 1}/{currentLesson.exercises.length}</span>
            </div>
            {renderExercise()}
          </div>
        ) : (
          <div className="lesson-map">
            {lessons.units.map((unit, ui) => {
              const color = UNIT_COLORS[ui % UNIT_COLORS.length];
              return (
                <div key={unit.id} className="unit-block" style={{ animationDelay: `${ui * 0.12}s` }}>
                  <div className="unit-header-card" style={{ '--unit-color': color }}>
                    <div className="unit-icon-wrap" style={{ background: `${color}18`, borderColor: `${color}25` }}>
                      {unit.icon}
                    </div>
                    <div className="unit-info">
                      <h3 className="unit-title">{unit.titleEs || unit.title}</h3>
                      <p className="unit-subtitle">{unit.description}</p>
                    </div>
                    <span className="unit-lesson-count">{unit.lessons.length} lecciones</span>
                  </div>

                  <div className="lessons-path">
                    {unit.lessons.map((lesson, li) => {
                      const isCompleted = completedLessons.includes(lesson.id);
                      const isNext = !isCompleted && (li === 0 || completedLessons.includes(unit.lessons[li - 1]?.id));
                      return (
                        <React.Fragment key={lesson.id}>
                          {li > 0 && (
                            <div className="lesson-connector">
                              <span className="connector-dot" style={{ background: isCompleted ? color : undefined }} />
                              <span className="connector-dot" style={{ background: isCompleted ? color : undefined }} />
                              <span className="connector-dot" style={{ background: isCompleted ? color : undefined }} />
                            </div>
                          )}
                          <div className={`lesson-node ${isNext ? 'is-next' : ''}`}
                            onClick={() => startLesson(lesson)}
                            onMouseEnter={() => sounds.hover()}>
                            <div className={`lesson-node-circle ${isCompleted ? 'completed' : ''} ${isNext ? 'next-pulse' : ''}`}
                              style={!isCompleted ? { background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 6px 0 ${color}66, 0 0 25px ${color}18` } : {}}>
                              {isCompleted ? '⭐' : isNext ? '▶' : unit.icon}
                              {isCompleted && <span className="node-check">✓</span>}
                            </div>
                            <span className="lesson-node-label">{lesson.titleEs || lesson.title}</span>
                            <span className="lesson-node-xp">+{lesson.xpReward} XP</span>
                            {isNext && <span className="node-start-badge">¡Empezar!</span>}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {currentLesson && answered && (
        <div className="exercise-bottom-bar">
          <div className="exercise-bottom-inner">
            <button className={`btn ${feedback?.correct ? 'btn-green' : 'btn-red'} btn-full btn-lg`} onClick={nextExercise}>
              {exerciseIndex + 1 >= currentLesson.exercises.length ? '🏆 COMPLETAR LECCIÓN' : 'SIGUIENTE →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnglishModule;
