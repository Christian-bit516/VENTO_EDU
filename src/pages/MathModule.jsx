import React from 'react';
import GenericCourseModule from './GenericCourseModule';
import lessonsData from '../../data/math-lessons.json';

const MathModule = () => (
  <GenericCourseModule
    courseId="math"
    courseName="Matemáticas Básicas"
    courseColor="#00b894"
    courseEmoji="🔢"
    lessonsData={lessonsData}
    speakLang="es-MX"
  />
);
export default MathModule;
