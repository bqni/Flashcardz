/* Mise en forme des textes affichés. */

import { LANGS } from '../core/config.js';
import { today } from '../core/store.js';

/* plural(3, 'carte', 'cartes') → "3 cartes" */
export const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export function langLabel(code) {
  const found = LANGS.find(([c]) => c === code);
  return found ? found[1] : 'Français';
}

/* Numéro de jour → "aujourd'hui", "demain", "jeudi", "le 12 novembre". */
export function dayLabel(n) {
  if (n == null) return '';
  const t = today();
  if (n <= t) return "aujourd'hui";
  if (n === t + 1) return 'demain';
  const date = new Date(n * 864e5);
  if (n - t < 7) return date.toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  return 'le ' + date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/* Taille du texte sur la carte selon sa longueur (voir .face-text dans review.css). */
export function cardTextSize(text) {
  const n = String(text).length;
  if (n <= 24) return 'xl';
  if (n <= 80) return '';
  if (n <= 180) return 'l';
  if (n <= 400) return 'm';
  return 's';
}

/* Nom de fichier propre : "Histoire · 1789" → "histoire-1789" */
export function slug(text) {
  return String(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'deck';
}

export function isoDate(d = new Date()) {
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
