import React, { useState, useEffect } from 'react';
import { sounds, speakText } from '../../hooks/useSounds';
import './LessonTheory.css';

/* ── Animated vocab card with audio — lang is dynamic ── */
const VocabCard = ({ word, translation, emoji, example, index, speakLang }) => {
  const [flipped, setFlipped] = useState(false);
  const [played,  setPlayed]  = useState(false);

  const handleClick = () => {
    sounds.click();
    setFlipped(!flipped);
    if (!flipped && !played) {
      setTimeout(() => speakText(word, speakLang, 0.85), 300);
      setPlayed(true);
    }
  };

  return (
    <div className={`vocab-card ${flipped ? 'flipped' : ''}`}
      style={{ animationDelay: `${index * 0.08}s` }}
      onClick={handleClick}>
      <div className="vocab-card-inner">
        <div className="vocab-card-front">
          <div className="vocab-card-emoji">{emoji}</div>
          <div className="vocab-word-en">{word}</div>
          <div className="vocab-flip-hint">
            <span>toca para traducir</span>
            <span className="flip-arrow">→</span>
          </div>
          {played && <div className="vocab-played-badge">🔊</div>}
        </div>
        <div className="vocab-card-back">
          <div className="vocab-card-emoji">{emoji}</div>
          <div className="vocab-word-es">{translation}</div>
          <div className="vocab-example-line">"{example}"</div>
          <button className="vocab-hear-btn"
            onClick={e => { e.stopPropagation(); sounds.listen(); speakText(word, speakLang, 0.85); }}>
            🔊 Escuchar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Grammar rule block ── */
const GrammarRule = ({ rule, index }) => (
  <div className="grammar-rule" style={{ animationDelay: `${index * 0.1}s` }}>
    <div className="grammar-rule-icon">📌</div>
    <div className="grammar-rule-text">{rule}</div>
  </div>
);

/* ═══ LESSON THEORY — speakLang prop added ══════════════════════════════════ */
const LessonTheory = ({ lesson, onStart, onBack, speakLang = 'en-US' }) => {
  const { theory } = lesson;
  const [tab,         setTab]         = useState('vocab');
  const [revealed,    setRevealed]    = useState(new Set());
  const [allRevealed, setAllRevealed] = useState(false);

  useEffect(() => {
    if (revealed.size === theory?.vocabulary?.length) setAllRevealed(true);
  }, [revealed, theory]);

  if (!theory) { onStart(); return null; }

  const grammarLines = theory.grammar.split('\n').filter(Boolean);

  return (
    <div className="theory-container">
      {/* Hero Header */}
      <div className="theory-hero">
        <button className="theory-back-pill" onClick={() => { sounds.navigate(); onBack(); }}>
          ← Volver
        </button>
        <div className="theory-hero-badge">📖 TUTORIAL</div>
        <h1 className="theory-hero-title">{theory.title}</h1>
        <p className="theory-hero-desc">{theory.explanation}</p>
        <div className="theory-meta-pills">
          <span className="theory-meta-pill vocab-pill">📚 {theory.vocabulary.length} conceptos</span>
          <span className="theory-meta-pill exercise-pill">🎯 {lesson.exercises.length} ejercicios</span>
          <span className="theory-meta-pill xp-pill">⚡ +{lesson.xpReward} XP</span>
        </div>
        {theory.tip && (
          <div className="theory-tip-banner">
            <span className="tip-icon">💡</span>
            <span className="tip-text">{theory.tip}</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="theory-tabs">
        <button className={`theory-tab ${tab==='vocab'?'active green':''}`}
          onClick={() => { sounds.click(); setTab('vocab'); }}>
          <span>📚</span> Conceptos
          <span className="tab-count">{theory.vocabulary.length}</span>
        </button>
        <button className={`theory-tab ${tab==='grammar'?'active blue':''}`}
          onClick={() => { sounds.click(); setTab('grammar'); }}>
          <span>📐</span> Teoría
        </button>
        <button className={`theory-tab ${tab==='examples'?'active purple':''}`}
          onClick={() => { sounds.click(); setTab('examples'); }}>
          <span>💬</span> Ejemplos
        </button>
      </div>

      {/* Tab Content */}
      <div className="theory-tab-content">

        {tab === 'vocab' && (
          <div className="vocab-section">
            <div className="vocab-hint-bar">
              <span>🃏 Toca las tarjetas — el audio se reproduce al girar</span>
              {allRevealed && <span className="vocab-complete-badge">✅ ¡Todas vistas!</span>}
            </div>
            <div className="vocab-cards-grid">
              {theory.vocabulary.map((v, i) => (
                <VocabCard key={i} index={i} {...v} speakLang={speakLang}
                  onReveal={() => setRevealed(prev => new Set([...prev, i]))} />
              ))}
            </div>
            <div className="vocab-progress-row">
              <div className="vocab-progress-bar-wrap">
                <div className="vocab-progress-fill"
                  style={{ width:`${(revealed.size/theory.vocabulary.length)*100}%` }} />
              </div>
              <span className="vocab-progress-label">{revealed.size}/{theory.vocabulary.length} tarjetas</span>
            </div>
          </div>
        )}

        {tab === 'grammar' && (
          <div className="grammar-section">
            <div className="grammar-hero-card">
              <div className="grammar-hero-icon">📐</div>
              <h3 className="grammar-hero-title">Conceptos Clave</h3>
            </div>
            <div className="grammar-rules-list">
              {grammarLines.map((line, i) => <GrammarRule key={i} rule={line} index={i} />)}
            </div>
            {theory.tip && (
              <div className="grammar-tip-card">
                <div className="grammar-tip-header"><span>💡</span> Consejo Pro</div>
                <p>{theory.tip}</p>
              </div>
            )}
            <div className="grammar-practice-note">
              <span>🎯</span>
              <span>Practica estas ideas en los ejercicios que siguen</span>
            </div>
          </div>
        )}

        {tab === 'examples' && (
          <div className="examples-section">
            <p className="examples-intro">Escucha y aprende con ejemplos reales 🔊</p>
            {theory.vocabulary.map((v, i) => (
              <div key={i} className="example-card" style={{ animationDelay:`${i*0.06}s` }}>
                <div className="example-card-left">
                  <span className="example-emoji">{v.emoji}</span>
                  <div className="example-words">
                    <span className="example-en">{v.word}</span>
                    <span className="example-es">{v.translation}</span>
                  </div>
                </div>
                <div className="example-card-right">
                  <span className="example-sentence">"{v.example}"</span>
                  <button className="example-hear-btn"
                    onClick={() => { sounds.listen(); speakText(v.example, speakLang, 0.85); }}>
                    🔊
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="theory-cta-section">
        <div className="theory-cta-card">
          <div className="theory-cta-info">
            <div className="cta-info-item"><span className="cta-info-icon">🎯</span><span>{lesson.exercises.length} ejercicios</span></div>
            <div className="cta-info-item"><span className="cta-info-icon">⚡</span><span>+{lesson.xpReward} XP</span></div>
            <div className="cta-info-item"><span className="cta-info-icon">🎮</span><span>Minijuegos incluidos</span></div>
          </div>
          <button className="theory-start-btn" onClick={() => { sounds.lessonStart(); onStart(); }}>
            🚀 ¡Empezar Práctica!
          </button>
          <button className="theory-skip-link" onClick={() => { sounds.navigate(); onStart(); }}>
            Saltar tutorial →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonTheory;
