import React, { useState, useCallback } from 'react';
import { ChessGame } from '../ChessGame/ChessGame';
import '../ChessGame/ChessGame.css';

/* ═══ ♟️ CHESS GAME EXERCISE ═══════════════════════════════════
   Integrates the full ChessGame as a lesson exercise.
   The user plays until they win (capture king) or lose.
   exercise: { type:'chess_game', question:'...', xp:20 }
══════════════════════════════════════════════════════════════ */
const ChessGameExercise = ({ exercise, onResult }) => {
  const [gameStatus, setGameStatus] = useState('playing'); // playing | won | lost
  const [showResult, setShowResult] = useState(false);

  const handleGameEnd = useCallback((won) => {
    setGameStatus(won ? 'won' : 'lost');
    setShowResult(true);
    setTimeout(() => onResult(won), 1200);
  }, [onResult]);

  return (
    <div className="chess-exercise">
      <p className="cex-question">{exercise.question || '♟️ Demuestra tus habilidades: ¡Captura al Rey negro!'}</p>
      {showResult && (
        <div className={`cex-result ${gameStatus === 'won' ? 'cex-won' : 'cex-lost'}`}>
          {gameStatus === 'won' ? '🏆 ¡Ganaste! ¡Excelente estrategia!' : '💪 ¡Sigue practicando! La IA te ganó esta vez.'}
        </div>
      )}
      <ChessGame onGameEnd={handleGameEnd} exerciseMode />
    </div>
  );
};

export default ChessGameExercise;
