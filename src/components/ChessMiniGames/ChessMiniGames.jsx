import React, { useState } from 'react';
import './CourseMiniGames.css';

const PIECE_DATA = {
  '♚':{ name:'Rey',    color:'dark', value:0,  move:'1 casilla cualquier dirección' },
  '♛':{ name:'Reina',  color:'dark', value:9,  move:'todas las casillas, cualquier dirección' },
  '♜':{ name:'Torre',  color:'dark', value:5,  move:'horizontal y vertical ilimitado' },
  '♝':{ name:'Alfil',  color:'dark', value:3,  move:'diagonal ilimitado' },
  '♞':{ name:'Caballo',color:'dark', value:3,  move:'en forma de L (2+1)' },
  '♟':{ name:'Peón',   color:'dark', value:1,  move:'1 casilla adelante, captura diagonal' },
  '♔':{ name:'Rey',    color:'light', value:0, move:'1 casilla cualquier dirección' },
  '♕':{ name:'Reina',  color:'light', value:9, move:'todas las casillas, cualquier dirección' },
  '♖':{ name:'Torre',  color:'light', value:5, move:'horizontal y vertical ilimitado' },
  '♗':{ name:'Alfil',  color:'light', value:3, move:'diagonal ilimitado' },
  '♘':{ name:'Caballo',color:'light', value:3, move:'en forma de L (2+1)' },
  '♙':{ name:'Peón',   color:'light', value:1, move:'1 casilla adelante, captura diagonal' },
};

/* ═══ ♟️ PIECE IDENTIFIER GAME ═══════════════════════════════════════════
   Shows a chess piece, user identifies its name or movement.
   exercise: { question, piece:'♛', answer:'Reina', options:[...], xp }
══════════════════════════════════════════════════════════════════════════ */
export const PieceIdentifierGame = ({ exercise, onResult }) => {
  const [selected, setSelected] = useState(null);
  const piece = exercise.piece || '♛';
  const pd    = PIECE_DATA[piece] || {};

  const pick = (opt) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onResult(opt === exercise.answer), 600);
  };

  return (
    <div className="chess-piece-game">
      <p className="cpg-question">{exercise.question}</p>
      <div className="cpg-piece-display">
        <div className="cpg-piece-circle">
          <span className="cpg-piece-symbol">{piece}</span>
        </div>
        {pd.name && <span className="cpg-piece-hint">{pd.color==='light'?'Pieza blanca':'Pieza negra'}</span>}
      </div>
      <div className="cpg-options">
        {exercise.options.map((opt,i) => (
          <button key={i}
            className={`cpg-opt ${selected===opt?(opt===exercise.answer?'cpg-ok':'cpg-no'):''} ${selected&&opt===exercise.answer?'cpg-show':''}`}
            onClick={()=>pick(opt)}>
            {opt}
          </button>
        ))}
      </div>
      {selected && (
        <div className="cpg-move-info">
          💡 Se mueve: <strong>{pd.move}</strong>
        </div>
      )}
    </div>
  );
};

/* ═══ ⚖️ MATERIAL VALUE GAME ══════════════════════════════════════════════
   Shows chess pieces, user calculates total material value.
   exercise: { question, pieces:['♛','♜','♜'], answer:'19', options:[...], xp }
══════════════════════════════════════════════════════════════════════════ */
export const MaterialValueGame = ({ exercise, onResult }) => {
  const [selected, setSelected] = useState(null);
  const pieces  = exercise.pieces || ['♛','♜'];
  const total   = pieces.reduce((s,p) => s + (PIECE_DATA[p]?.value || 0), 0);

  const pick = (opt) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onResult(opt === exercise.answer), 600);
  };

  return (
    <div className="material-game">
      <p className="mg-question">{exercise.question}</p>
      <div className="mg-pieces-row">
        {pieces.map((p,i) => (
          <div key={i} className="mg-piece-card">
            <span className="mg-piece-sym">{p}</span>
            <span className="mg-piece-val">+{PIECE_DATA[p]?.value || '?'}</span>
          </div>
        ))}
        <div className="mg-equals">= ?</div>
      </div>
      {/* Value legend */}
      <div className="mg-legend">
        {['♛9','♜5','♝3','♞3','♙1'].map(s=>(
          <span key={s} className="mg-legend-item">{s[0]}<sub>{s.slice(1)}</sub></span>
        ))}
      </div>
      <div className="mg-options">
        {exercise.options.map((opt,i)=>(
          <button key={i}
            className={`mg-opt ${selected===opt?(opt===exercise.answer?'mg-ok':'mg-no'):''} ${selected&&opt===exercise.answer?'mg-show':''}`}
            onClick={()=>pick(opt)}>
            {opt} pts
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══ 🏁 MINI BOARD GAME ══════════════════════════════════════════════════
   Shows a 4×4 mini board with a piece. User selects which squares it can reach.
   exercise: { question, piece:'♘', correctSquares:2, answer:'8 posibles', options:[...], xp }
══════════════════════════════════════════════════════════════════════════ */
export const MiniBoardGame = ({ exercise, onResult }) => {
  const [selected, setSelected] = useState(null);
  const piece = exercise.piece || '♘';

  // Build 8×8 reduced to 4×4 display
  const BOARD_SIZE = 4;
  const pieceRow = 2, pieceCol = 1; // fixed position

  // Knight moves from (2,1) in 4×4
  const knightMoves = [[0,0],[0,2],[1,3],[3,3],[3,0]]; // approximate

  const pick = (opt) => {
    if (selected) return;
    setSelected(opt);
    setTimeout(() => onResult(opt === exercise.answer), 600);
  };

  return (
    <div className="board-game">
      <p className="board-question">{exercise.question}</p>
      <div className="mini-board">
        {Array.from({length:BOARD_SIZE}).map((_,row)=>(
          <div key={row} className="board-row">
            {Array.from({length:BOARD_SIZE}).map((_,col)=>{
              const isPiece = row===pieceRow && col===pieceCol;
              const isLight = (row+col)%2===0;
              return (
                <div key={col} className={`board-sq ${isLight?'bsq-light':'bsq-dark'} ${isPiece?'bsq-piece':''}`}>
                  {isPiece && <span className="board-piece-sym">{piece}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="board-hint">La {PIECE_DATA[piece]?.name||'pieza'} puede moverse: <em>{PIECE_DATA[piece]?.move}</em></p>
      <div className="board-opts">
        {exercise.options.map((opt,i)=>(
          <button key={i}
            className={`board-opt ${selected===opt?(opt===exercise.answer?'bo-ok':'bo-no'):''} ${selected&&opt===exercise.answer?'bo-show':''}`}
            onClick={()=>pick(opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};
