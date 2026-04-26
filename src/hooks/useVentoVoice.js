export const useVentoVoice = () => {
    const speak = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);

            // Obtener todas las voces disponibles
            const voices = window.speechSynthesis.getVoices();

            // Intentar buscar una voz masculina en español
            // Nota: Las voces dependen del navegador y sistema operativo
            const maleVoice = voices.find(voice =>
                (voice.lang.includes('es') && (voice.name.includes('Microsoft Pablo') || voice.name.includes('Male') || voice.name.includes('Helena') === false))
            );

            if (maleVoice) utterance.voice = maleVoice;

            utterance.lang = 'es-ES';
            utterance.rate = 0.9;
            utterance.pitch = 0.8; // Bajamos un poco el tono para que suene más grave/masculino

            // Prevenir bug de Chrome donde corta el audio abruptamente por Garbage Collection
            window._ventoVoiceUtterance = utterance;

            window.speechSynthesis.speak(utterance);
        }
    };

    return { speak };
};