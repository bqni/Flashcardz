/* Correction des réponses : mode "Écrire" et mode "QCM". */

import { shuffle } from './leitner.js';

/* Met une réponse sous une forme comparable : minuscules, sans accents,
   sans ponctuation, sans article au début ("la cuisine" = "cuisine" = "the kitchen" → "kitchen"). */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/^(le|la|les|l|un|une|des|du|de|d|the|a|an|to)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Nombre de lettres à changer pour passer d'un mot à l'autre. */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/* Fautes tolérées selon la longueur du mot attendu. */
function tolerance(length) {
  if (length <= 4) return 0;
  if (length <= 9) return 1;
  return Math.floor(length * 0.15);
}

/* 'exact', 'close' (petite faute, comptée juste) ou 'wrong'.
   "chat / matou" dans la réponse attendue accepte l'un ou l'autre. */
export function checkTyped(given, expected) {
  const g = normalize(given);
  if (!g) return 'wrong';
  const options = String(expected).split(/\s\/\s|\n/).map(normalize).filter(Boolean);
  if (!options.length) options.push(normalize(expected));

  let result = 'wrong';
  for (const e of options) {
    if (g === e) return 'exact';
    const tol = tolerance(e.length);
    if (tol > 0 && levenshtein(g, e) <= tol) result = 'close';
  }
  return result;
}

/* La bonne réponse + 3 mauvaises tirées des autres cartes, mélangées.
   null si le deck n'a pas assez de réponses différentes. */
export function pickChoices(correct, pool, rand = Math.random, count = 4) {
  const seen = new Set([normalize(correct)]);
  const wrong = [];
  for (const text of shuffle(pool, rand)) {
    const key = normalize(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    wrong.push(text);
    if (wrong.length >= count - 1) break;
  }
  if (wrong.length < count - 1) return null;
  return shuffle([correct, ...wrong], rand);
}
