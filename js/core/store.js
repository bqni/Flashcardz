/* Toutes les données de l'appli, sauvegardées dans le navigateur (localStorage).
   Le contenu des decks et la progression sont rangés séparément :
   partager ou exporter un deck n'emporte jamais la progression.

   Forme des données :
   {
     decks:    [{ id, name, color, langQ, langA, example?, created, updated, cards: [{ id, q, a }] }],
     progress: { [deckId]: { [cardId]: { b, d, n, l } } },   // voir leitner.js
     log:      { [numéro du jour]: nombre de réponses },
     settings: DEFAULT_SETTINGS,
     session:  DEFAULT_SESSION,                              // derniers choix de révision
     flags:    { iosHint?: true }                            // messages déjà masqués
   } */

import { STORAGE_KEY, DEFAULT_SETTINGS, DEFAULT_SESSION, DECK_COLORS, LANGS } from './config.js';
import { dayNumber, deckStats, legacyLevelToProgress } from './leitner.js';
import { exampleData } from './examples.js';
import { uid } from './ids.js';

let data = null;
let saveListener = null;

export const storage = { ok: true };

function freshData() {
  const ex = exampleData(dayNumber());
  return {
    v: 2,
    decks: ex.decks,
    progress: ex.progress,
    log: {},
    settings: { ...DEFAULT_SETTINGS },
    session: { ...DEFAULT_SESSION },
    flags: {}
  };
}

const isObject = (x) => x && typeof x === 'object' && !Array.isArray(x);

export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    storage.ok = false;
  }
  let saved = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  if (!isObject(saved) || !Array.isArray(saved.decks)) {
    data = freshData();
    save();
    return;
  }
  data = {
    ...saved,
    progress: isObject(saved.progress) ? saved.progress : {},
    log: isObject(saved.log) ? saved.log : {},
    settings: { ...DEFAULT_SETTINGS, ...saved.settings },
    session: { ...DEFAULT_SESSION, ...saved.session },
    flags: isObject(saved.flags) ? saved.flags : {}
  };
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    storage.ok = true;
  } catch {
    storage.ok = false;
    if (saveListener) saveListener();
  }
}

/* Appelé si une sauvegarde échoue (pour afficher un message). */
export function onSaveError(fn) {
  saveListener = fn;
}

/* ---------- Lecture ---------- */
export const db = () => data;
export const settings = () => data.settings;
export const sessionPrefs = () => data.session;
export const decks = () => data.decks;
export const deckById = (id) => data.decks.find((d) => d.id === id);
export const today = () => dayNumber();

export function progressFor(deckId) {
  if (!data.progress[deckId]) data.progress[deckId] = {};
  return data.progress[deckId];
}

export function statsFor(deck) {
  return deckStats(deck, data.progress[deck.id], today());
}

/* ---------- Journal (réponses du jour, série) ---------- */
export function logAnswer(delta = 1) {
  const t = String(today());
  data.log[t] = Math.max(0, (data.log[t] || 0) + delta);
}

export function answersToday() {
  return data.log[String(today())] || 0;
}

export function streak() {
  let t = today();
  if (!data.log[t]) t -= 1; // la série tient encore si on n'a pas révisé aujourd'hui
  let n = 0;
  while (data.log[t]) {
    n += 1;
    t -= 1;
  }
  return n;
}

/* ---------- Valeurs sûres ---------- */
export const validColor = (c) => (DECK_COLORS.includes(c) ? c : DECK_COLORS[0]);
export const validLang = (code) => (LANGS.some(([c]) => c === code) ? code : 'fr-FR');
const nextColor = () => DECK_COLORS[data.decks.length % DECK_COLORS.length];

/* ---------- Écriture ---------- */
export function newDeckDraft() {
  return {
    id: uid(),
    name: '',
    color: nextColor(),
    langQ: 'fr-FR',
    langA: 'fr-FR',
    created: Date.now(),
    cards: [{ id: uid(), q: '', a: '' }]
  };
}

/* Enregistre un deck créé ou modifié, et oublie la progression des cartes supprimées. */
export function saveDeck(deck) {
  deck.updated = Date.now();
  const i = data.decks.findIndex((d) => d.id === deck.id);
  if (i >= 0) data.decks[i] = deck;
  else data.decks.push(deck);

  const prog = data.progress[deck.id];
  if (prog) {
    const ids = new Set(deck.cards.map((c) => c.id));
    for (const cardId of Object.keys(prog)) if (!ids.has(cardId)) delete prog[cardId];
  }
  save();
}

export function deleteDeck(deckId) {
  data.decks = data.decks.filter((d) => d.id !== deckId);
  delete data.progress[deckId];
  save();
}

export function resetProgress(deckId) {
  data.progress[deckId] = {};
  save();
}

/* Ajoute un deck venu d'un import ou d'un lien. legacy : reprend les niveaux de l'ancienne appli. */
export function addImportedDeck(source, legacy = false) {
  const deck = {
    id: uid(),
    name: String(source.name || '').trim().slice(0, 120) || 'Deck importé',
    color: DECK_COLORS.includes(source.color) ? source.color : nextColor(),
    langQ: validLang(source.langQ),
    langA: validLang(source.langA),
    created: Date.now(),
    updated: Date.now(),
    cards: source.cards.map((c) => ({ id: uid(), q: String(c.q), a: String(c.a) }))
  };
  data.decks.push(deck);

  if (legacy) {
    const prog = progressFor(deck.id);
    source.cards.forEach((c, i) => {
      const p = legacyLevelToProgress(c.level, today());
      if (p) prog[deck.cards[i].id] = p;
    });
  }
  save();
  return deck;
}

export function appendCards(deckId, cards) {
  const deck = deckById(deckId);
  if (!deck) return;
  for (const c of cards) deck.cards.push({ id: uid(), q: c.q, a: c.a });
  deck.updated = Date.now();
  save();
}

/* ---------- Sauvegarde complète ---------- */
export function backupData() {
  return {
    format: 'flashcardz-backup',
    version: 2,
    exported: new Date().toISOString(),
    decks: data.decks,
    progress: data.progress,
    log: data.log,
    settings: data.settings
  };
}

export function restoreBackup(backup) {
  data.decks = backup.decks
    .filter((d) => d && Array.isArray(d.cards))
    .map((d) => ({
      id: String(d.id || uid()),
      name: String(d.name || 'Deck'),
      color: validColor(d.color),
      langQ: validLang(d.langQ),
      langA: validLang(d.langA),
      created: d.created || Date.now(),
      updated: d.updated || Date.now(),
      cards: d.cards
        .filter((c) => c && c.q && c.a)
        .map((c) => ({ id: String(c.id || uid()), q: String(c.q), a: String(c.a) }))
    }));
  data.progress = isObject(backup.progress) ? backup.progress : {};
  data.log = isObject(backup.log) ? backup.log : {};
  if (isObject(backup.settings)) data.settings = { ...DEFAULT_SETTINGS, ...backup.settings };
  save();
}

/* Efface tous les decks, garde les réglages. */
export function wipeAll() {
  const keep = data.settings;
  data = { ...freshData(), decks: [], progress: {}, settings: keep };
  save();
}
