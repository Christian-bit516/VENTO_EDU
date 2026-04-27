/* ═══════════════════════════════════════════════════════════════════
   useVentoVoice — TTS hook para VentoEdu
   Fix: esperar voiceschanged antes de hablar (bug de Chrome/Edge
   donde getVoices() devuelve [] en la primera llamada)
═══════════════════════════════════════════════════════════════════ */

/**
 * Habla el texto dado esperando que las voces estén disponibles.
 * @param {string} text
 * @param {string} lang  - p.ej. 'es-ES', 'en-US'
 * @param {number} rate  - velocidad (0.1 – 10)
 * @param {number} pitch - tono (0 – 2)
 */
const speakWithVoices = (text, lang = 'es-ES', rate = 0.9, pitch = 0.85) => {
  if (!('speechSynthesis' in window)) return;

  const doSpeak = () => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = lang;
    utterance.rate  = rate;
    utterance.pitch = pitch;

    const voices = window.speechSynthesis.getVoices();

    // Intentar encontrar voz masculina en español
    const preferredNames = ['Microsoft Pablo', 'Jorge', 'Diego', 'Carlos'];
    let voice = null;
    for (const name of preferredNames) {
      voice = voices.find(v => v.name.includes(name));
      if (voice) break;
    }
    // Fallback: cualquier voz en el idioma indicado
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
    }
    if (voice) utterance.voice = voice;

    // Prevenir que Chrome borre el utterance por GC antes de terminar
    window._ventoVoiceUtterance = utterance;

    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    // Voces ya disponibles (recarga/navegadores rápidos)
    doSpeak();
  } else {
    // Chrome carga voces async — esperar el evento
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      doSpeak();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Safety timeout: si el evento nunca llega, hablar sin voz preferida
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      doSpeak();
    }, 1500);
  }
};

export const useVentoVoice = () => {
  const speak = (text, lang = 'es-ES') => {
    speakWithVoices(text, lang, 0.9, 0.85);
  };

  return { speak };
};