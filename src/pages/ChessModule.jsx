import React from 'react';
import GenericCourseModule from './GenericCourseModule';
import { ChessGame } from '../components/ChessGame/ChessGame';
import '../components/ChessGame/ChessGame.css';
import lessonsData from '../../data/chess-lessons.json';

const ChessModule = () => (
  <GenericCourseModule
    courseId="chess"
    courseName="Ajedrez"
    courseColor="#fdcb6e"
    courseEmoji="♟️"
    lessonsData={lessonsData}
    speakLang="es-MX"
    PracticeComponent={ChessGame}
  />
);
export default ChessModule;
