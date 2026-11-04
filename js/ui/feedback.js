/* Sons et lecture à voix haute. Tout est optionnel et désactivable dans les réglages. */

import { settings } from '../core/store.js';
import { canSpeak } from './env.js';

/* ---------- Sons : petites notes générées, aucun fichier à charger ---------- */
let audio = null;

function tone(freq, ms, volume = 0.06) {
  if (!settings().sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + ms / 1000);
  } catch {
    /* pas de son disponible : tant pis */
  }
}

export const sound = {
  flip: () => tone(620, 70, 0.04),
  right: () => { tone(880, 90); setTimeout(() => tone(1320, 120), 80); },
  wrong: () => tone(260, 160, 0.05)
};

/* ---------- Voix ---------- */
export function speak(text, lang = 'fr-FR') {
  if (!canSpeak) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = lang;
    u.rate = settings().rate || 1;
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang === lang)
      || voices.find((v) => v.lang && v.lang.slice(0, 2) === lang.slice(0, 2))
      || null;
    speechSynthesis.speak(u);
  } catch {
    /* voix indisponible */
  }
}

export function stopSpeaking() {
  if (canSpeak) {
    try { speechSynthesis.cancel(); } catch { /* rien */ }
  }
}

/* Charge la liste des voix tôt (Safari la donne en retard). */
export function warmUpVoices() {
  if (canSpeak) {
    try { speechSynthesis.getVoices(); } catch { /* rien */ }
  }
}
