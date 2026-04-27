import React, { useState, useCallback, useEffect } from 'react';
import './ChessGame.css';

/* ── Piece definitions ───────────────────────────────────────── */
const W = { K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙' };
const BL = { K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟' };

const INITIAL = [
  [BL.R,BL.N,BL.B,BL.Q,BL.K,BL.B,BL.N,BL.R],
  [BL.P,BL.P,BL.P,BL.P,BL.P,BL.P,BL.P,BL.P],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [W.P,W.P,W.P,W.P,W.P,W.P,W.P,W.P],
  [W.R,W.N,W.B,W.Q,W.K,W.B,W.N,W.R],
];

const WHITE_SET = new Set(Object.values(W));
const BLACK_SET = new Set(Object.values(BL));
const isW  = p => p && WHITE_SET.has(p);
const isBl = p => p && BLACK_SET.has(p);
const ally = (p, turn) => turn==='white' ? isW(p)  : isBl(p);
const foe  = (p, turn) => turn==='white' ? isBl(p) : isW(p);

const TYPE = {
  '♔':'K','♕':'Q','♖':'R','♗':'B','♘':'N','♙':'P',
  '♚':'K','♛':'Q','♜':'R','♝':'B','♞':'N','♟':'P',
};
const VALUE = { K:0,Q:9,R:5,B:3,N:3,P:1 };

/* ── Move generation ─────────────────────────────────────────── */
const getMoves = (board, r, c, turn) => {
  const p = board[r][c]; if (!p) return [];
  const t = TYPE[p]; const moves = [];

  const push = (nr, nc) => {
    if (nr<0||nr>7||nc<0||nc>7) return false;
    if (ally(board[nr][nc], turn)) return false;
    moves.push([nr,nc]);
    return !board[nr][nc];
  };
  const slide = (dr,dc) => {
    let nr=r+dr, nc=c+dc;
    while(nr>=0&&nr<8&&nc>=0&&nc<8){ if(!push(nr,nc)) break; nr+=dr; nc+=dc; }
  };

  if (t==='P') {
    const d = turn==='white'?-1:1, startR = turn==='white'?6:1;
    if (!board[r+d]?.[c]) {
      moves.push([r+d,c]);
      if (r===startR && !board[r+d*2]?.[c]) moves.push([r+d*2,c]);
    }
    [-1,1].forEach(dc=>{ if(foe(board[r+d]?.[c+dc],turn)) moves.push([r+d,c+dc]); });
  } else if (t==='R') { [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (t==='B') { [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (t==='Q') { [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>slide(dr,dc)); }
  else if (t==='N') { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>push(r+dr,c+dc)); }
  else if (t==='K') { [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>push(r+dr,c+dc)); }
  return moves;
};

const applyMove = (board, [r1,c1], [r2,c2]) => {
  const nb = board.map(row=>[...row]);
  nb[r2][c2] = nb[r1][c1];
  nb[r1][c1] = null;
  // auto-promote pawn
  if (nb[r2][c2]==='♙' && r2===0) nb[r2][c2]='♕';
  if (nb[r2][c2]==='♟' && r2===7) nb[r2][c2]='♛';
  return nb;
};

const findKing = (board, turn) => {
  const k = turn==='white'?'♔':'♚';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]===k) return [r,c];
  return null;
};

const inCheck = (board, turn) => {
  const kpos = findKing(board, turn); if(!kpos) return false;
  const opp = turn==='white'?'black':'white';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    if(foe(board[r][c],opp)) continue; // we want opponent's pieces
    if(ally(board[r][c],opp)){ // opponent pieces
      const ms = getMoves(board,r,c,opp);
      if(ms.some(([mr,mc])=>mr===kpos[0]&&mc===kpos[1])) return true;
    }
  }
  return false;
};

/* ── AI: captures best piece or random ─────────────────────── */
const aiMove = (board) => {
  const all = [];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    if(isBl(board[r][c])){
      getMoves(board,r,c,'black').forEach(([nr,nc])=>{
        const capture = board[nr][nc];
        all.push({ from:[r,c], to:[nr,nc], score: capture ? VALUE[TYPE[capture]]||0 : 0 });
      });
    }
  }
  if(!all.length) return null;
  all.sort((a,b)=>b.score-a.score);
  const best = all[0].score;
  const top = all.filter(m=>m.score===best);
  return top[Math.floor(Math.random()*top.length)];
};

/* ═══ CHESS GAME COMPONENT ══════════════════════════════════════ */
export const ChessGame = ({ onClose, onGameEnd, exerciseMode = false }) => {
  const [board,    setBoard]    = useState(INITIAL.map(r=>[...r]));
  const [selected, setSelected] = useState(null);
  const [validMvs, setValidMvs] = useState([]);
  const [turn,     setTurn]     = useState('white');
  const [status,   setStatus]   = useState('¡Tu turno! Mueve una pieza blanca.');
  const [lastMove, setLastMove] = useState(null);
  const [captured, setCaptured] = useState({ white:[], black:[] });
  const [gameOver, setGameOver] = useState(false);
  const [check,    setCheck]    = useState(false);
  const [moveCount,setMoveCount]= useState(0);

  const doAI = useCallback((currentBoard) => {
    setTimeout(() => {
      const mv = aiMove(currentBoard);
      if (!mv) { setStatus('¡Empate! Sin movimientos negros.'); setGameOver(true); return; }
      const nb = applyMove(currentBoard, mv.from, mv.to);
      const captured_piece = currentBoard[mv.to[0]][mv.to[1]];
      if (captured_piece) {
        setCaptured(prev => ({ ...prev, white: [...prev.white, captured_piece] }));
        if (TYPE[captured_piece]==='K') {
          setBoard(nb); setStatus('☠️ La IA capturó tu Rey. ¡Perdiste!'); setGameOver(true);
          if (onGameEnd) onGameEnd(false);
          return;
        }
      }
      const isInCheck = inCheck(nb, 'white');
      setBoard(nb); setLastMove([mv.from, mv.to]); setTurn('white');
      setCheck(isInCheck);
      setMoveCount(p=>p+1);
      setStatus(isInCheck ? '⚠️ ¡JAQUE! Tu Rey está en peligro.' : '¡Tu turno! Mueve una pieza blanca.');
    }, 500);
  }, []);

  const handleSquare = useCallback((r, c) => {
    if (gameOver || turn !== 'white') return;
    const p = board[r][c];
    // If clicked a valid move destination
    if (selected && validMvs.some(([mr,mc])=>mr===r&&mc===c)) {
      const nb = applyMove(board, selected, [r,c]);
      const cap = board[r][c];
      if (cap) {
        setCaptured(prev => ({ ...prev, black: [...prev.black, cap] }));
        if (TYPE[cap]==='K') {
          setBoard(nb); setStatus('🏆 ¡GANASTE! ¡Capturaste al Rey negro!'); setGameOver(true);
          if (onGameEnd) onGameEnd(true);
          return;
        }
      }
      setBoard(nb); setLastMove([selected,[r,c]]); setSelected(null); setValidMvs([]);
      setTurn('black'); setCheck(false); setMoveCount(p=>p+1);
      setStatus('🤔 La IA está pensando...');
      doAI(nb);
      return;
    }
    // Select own piece
    if (isW(p)) {
      setSelected([r,c]);
      setValidMvs(getMoves(board,r,c,'white'));
    } else {
      setSelected(null); setValidMvs([]);
    }
  }, [board, selected, validMvs, turn, gameOver, doAI]);

  const reset = () => {
    setBoard(INITIAL.map(r=>[...r])); setSelected(null); setValidMvs([]); setTurn('white');
    setStatus('¡Tu turno! Mueve una pieza blanca.'); setLastMove(null);
    setCaptured({white:[],black:[]}); setGameOver(false); setCheck(false); setMoveCount(0);
  };

  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = ['8','7','6','5','4','3','2','1'];

  return (
    <div className="chess-game-wrap">
      <div className="cg-header">
        <div className="cg-title">♟️ Partida de Ajedrez</div>
        <div className="cg-controls">
          <button className="cg-btn" onClick={reset}>↺ Nueva Partida</button>
          {onClose && <button className="cg-btn cg-close" onClick={onClose}>✕</button>}
        </div>
      </div>

      <div className={`cg-status ${check?'cg-check':''} ${gameOver?'cg-over':''}`}>{status}</div>

      <div className="cg-body">
        {/* Captured by white */}
        <div className="cg-captures-panel">
          <div className="cap-label">TÚ (Blancas) ♔</div>
          <div className="cap-pieces">{captured.black.map((p,i)=><span key={i}>{p}</span>)}</div>
          <div className="cap-score">+{captured.black.reduce((s,p)=>s+(VALUE[TYPE[p]]||0),0)}</div>
        </div>

        <div className="cg-board-wrap">
          <div className="cg-ranks">
            {ranks.map(r=><div key={r} className="cg-rank-label">{r}</div>)}
          </div>
          <div className="cg-board">
            {board.map((row,r)=>row.map((piece,c)=>{
              const isLight = (r+c)%2===0;
              const isSel   = selected && selected[0]===r && selected[1]===c;
              const isValid = validMvs.some(([mr,mc])=>mr===r&&mc===c);
              const isLast  = lastMove && (
                (lastMove[0][0]===r&&lastMove[0][1]===c)||(lastMove[1][0]===r&&lastMove[1][1]===c)
              );
              const isCapture = isValid && !!piece;
              return (
                <div key={`${r}${c}`}
                  className={`cg-sq ${isLight?'cg-light':'cg-dark'} ${isSel?'cg-selected':''} ${isLast?'cg-last':''}`}
                  onClick={()=>handleSquare(r,c)}>
                  {isValid && !isCapture && <div className="cg-dot" />}
                  {isCapture && <div className="cg-ring" />}
                  {piece && (
                    <span className={`cg-piece ${isW(piece)?'cg-white-piece':'cg-black-piece'} ${isSel?'cg-piece-sel':''}`}>
                      {piece}
                    </span>
                  )}
                </div>
              );
            }))}
          </div>
          <div className="cg-files">
            {files.map(f=><div key={f} className="cg-file-label">{f}</div>)}
          </div>
        </div>

        {/* Captured by black */}
        <div className="cg-captures-panel">
          <div className="cap-label">IA (Negras) ♚</div>
          <div className="cap-pieces">{captured.white.map((p,i)=><span key={i}>{p}</span>)}</div>
          <div className="cap-score">+{captured.white.reduce((s,p)=>s+(VALUE[TYPE[p]]||0),0)}</div>
        </div>
      </div>

      <div className="cg-footer">
        <span>Movimiento #{moveCount}</span>
        <span>Turno: {turn==='white'?'♔ Blancas (Tú)':'♚ Negras (IA)'}</span>
      </div>
    </div>
  );
};

export default ChessGame;
