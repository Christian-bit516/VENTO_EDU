import React from 'react';
import GenericCourseModule from './GenericCourseModule';
import DigitalPiano from '../components/DigitalPiano/DigitalPiano';
import '../components/DigitalPiano/DigitalPiano.css';
import lessonsData from '../../data/music-lessons.json';

const MusicModule = () => (
  <GenericCourseModule
    courseId="music"
    courseName="Música: Leer y Tocar Canciones"
    courseColor="#ff6b9d"
    courseEmoji="🎵"
    lessonsData={lessonsData}
    speakLang="es-MX"
    PracticeComponent={DigitalPiano}
  />
);
export default MusicModule;
