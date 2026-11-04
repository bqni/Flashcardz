/* Lecture des imports : texte collé, fichiers de l'ancienne appli, exports et sauvegardes. */

/* Séparateurs reconnus entre question et réponse, du plus sûr au moins sûr. */
const SEPARATORS = ['\t', ' ; ', ';', ' | ', '|', ' = ', ' -> ', ' → ', ' - '];

function bestSeparator(lines, candidates) {
  const needed = Math.max(1, Math.ceil(lines.length * 0.6)); // 60 % des lignes au moins
  let best = null;
  let bestScore = 0;
  for (const sep of candidates) {
    const score = lines.filter((l) => l.indexOf(sep) > 0).length;
    if (score > bestScore) [best, bestScore] = [sep, score];
  }
  return bestScore >= needed ? best : null;
}

function cleanSide(text) {
  return text.trim().replace(/^"(.*)"$/s, '$1').replace(/\\n/g, '\n');
}

/* Une carte par ligne : "question ; réponse".
   Les lignes vides ou commençant par # sont ignorées. "\n" devient un retour à la ligne.
   extraSeparators : à essayer en dernier (par ex. la virgule pour un .csv). */
export function parsePaste(text, extraSeparators = []) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const sep = bestSeparator(lines, SEPARATORS) || bestSeparator(lines, extraSeparators);
  if (!sep) return { cards: [], skipped: lines, separator: null };

  const cards = [];
  const skipped = [];
  for (const line of lines) {
    const i = line.indexOf(sep);
    const q = i > 0 ? cleanSide(line.slice(0, i)) : '';
    const a = i > 0 ? cleanSide(line.slice(i + sep.length)) : '';
    if (q && a) cards.push({ q, a });
    else skipped.push(line);
  }
  return { cards, skipped, separator: sep };
}

function level(value) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(3, n));
}

function str(value) {
  return String(value ?? '').trim();
}

/* Ancien flashcards.py : [[q, a, niveau], ...] ou [{question, answer, level}, ...] */
function parseLegacy(list, fallbackName) {
  const cards = [];
  for (const item of list) {
    if (Array.isArray(item) && item.length >= 2) {
      const q = str(item[0]);
      const a = str(item[1]);
      if (q && a) cards.push({ q, a, level: level(item[2]) });
    } else if (item && typeof item === 'object') {
      const q = str(item.question || item.Question || item.q || item.recto);
      const a = str(item.answer || item.Answer || item.a || item.verso);
      if (q && a) cards.push({ q, a, level: level(item.level) });
    }
  }
  if (!cards.length) return null;
  return { kind: 'deck', legacy: true, deck: { name: fallbackName || 'Deck importé', cards } };
}

/* Deck exporté par Flashcardz : {format: "flashcardz", deck: {...}} (ou directement {name, cards}) */
function parseDeck(d, fallbackName) {
  const cards = d.cards
    .map((c) => ({ q: str(c?.q ?? c?.question), a: str(c?.a ?? c?.answer) }))
    .filter((c) => c.q && c.a);
  if (!cards.length) return null;
  return {
    kind: 'deck',
    deck: {
      name: str(d.name || fallbackName || 'Deck importé').slice(0, 120),
      color: d.color,
      langQ: d.langQ,
      langA: d.langA,
      cards
    }
  };
}

/* Reconnaît n'importe quel JSON importable.
   Renvoie {kind: 'deck', deck, legacy?}, {kind: 'backup', data} ou null. */
export function parseJsonImport(obj, fallbackName) {
  if (Array.isArray(obj)) return parseLegacy(obj, fallbackName);
  if (!obj || typeof obj !== 'object') return null;
  if (obj.format === 'flashcardz-backup' && Array.isArray(obj.decks)) return { kind: 'backup', data: obj };
  const deck = obj.format === 'flashcardz' ? obj.deck : obj;
  if (deck && Array.isArray(deck.cards)) return parseDeck(deck, fallbackName);
  return null;
}
