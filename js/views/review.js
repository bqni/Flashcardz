/* Écran de révision : une carte à la fois, jusqu'au bilan.
   Une carte ratée revient 4 cartes plus loin (3 fois maximum) pour la retravailler tout de suite.
   La dernière réponse peut être annulée (bouton flèche en haut). */

import * as store from '../core/store.js';
import { schedule, shuffle, buildQueue } from '../core/leitner.js';
import { pickChoices } from '../core/answers.js';
import { html, mount, $, onClick } from '../ui/html.js';
import { icons } from '../ui/icons.js';
import { langLabel, cardTextSize } from '../ui/format.js';
import { canSpeak } from '../ui/env.js';
import { sound, speak, stopSpeaking } from '../ui/feedback.js';
import { confirmBox } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { attachSwipe } from '../ui/swipe.js';
import { appRoot, go, show, setCleanup, currentScreen } from '../router.js';
import { flipMode, typeMode, qcmMode, pressChoice } from './review-modes.js';

const REPEAT_GAP = 4;   // une carte ratée revient après 4 autres
const MAX_REPEATS = 3;  // et au plus 3 fois par session

let session = null;

/* ---------- Démarrage ---------- */

/* deckId : le deck. practice : entraînement sans toucher à la progression.
   ids : réviser seulement ces cartes (ex. les ratées), en entraînement. */
export function startSession({ deckId, practice = false, ids = null }) {
  const deck = store.deckById(deckId);
  if (!deck) return;
  const prefs = store.sessionPrefs();

  let queue;
  if (ids) queue = shuffle(ids.filter((id) => deck.cards.some((c) => c.id === id)));
  else if (practice) queue = shuffle(deck.cards.map((c) => c.id)).slice(0, prefs.count || undefined);
  else queue = buildQueue(deck, store.db().progress[deck.id], store.today(), prefs.count);

  if (!queue.length) {
    toast('Aucune carte à réviser');
    return;
  }

  const reversed = {};
  for (const id of queue) {
    reversed[id] = prefs.dir === 'aq' || (prefs.dir === 'mix' && Math.random() < 0.5);
  }

  session = {
    deck,
    practice: practice || !!ids,
    mode: prefs.mode,
    reversed,
    queue,
    idx: 0,
    total: queue.length,
    results: {},        // premier essai de chaque carte : true / false
    lapsed: new Set(),  // cartes ratées au moins une fois
    repeats: {},        // nombre de retours de chaque carte ratée
    undo: null,         // de quoi annuler la dernière réponse
    flipped: false,
    cardMode: prefs.mode
  };
  show('review');
}

/* ---------- Carte en cours ---------- */
const currentId = () => session.queue[session.idx];
const currentCard = () => session.deck.cards.find((c) => c.id === currentId());

function sides() {
  const card = currentCard();
  const rev = session.reversed[card.id];
  const { langQ, langA } = session.deck;
  return {
    front: rev ? card.a : card.q,
    back: rev ? card.q : card.a,
    frontLang: store.validLang(rev ? langA : langQ),
    backLang: store.validLang(rev ? langQ : langA),
    frontLabel: rev ? 'Réponse' : 'Question',
    backLabel: rev ? 'Question' : 'Réponse',
    reversed: rev
  };
}

/* ---------- Gabarits ---------- */
function face(side, label, text, lang, hint) {
  return html`
    <div class="face ${side}">
      <div class="face-top">
        <span class="face-label">${label}</span>
        ${canSpeak
          ? html`<button class="icon-btn" data-speak="${side}" aria-label="Lire à voix haute (${langLabel(lang)})">${icons.speak}</button>`
          : html`<span></span>`}
      </div>
      <div class="face-text ${cardTextSize(text)}" lang="${lang.slice(0, 2)}">${text}</div>
      <div class="face-foot">${hint}</div>
    </div>
  `;
}

function counterText() {
  const s = session;
  const done = Object.keys(s.results).length;
  const position = Math.min(done + (currentId() in s.results ? 0 : 1), s.total);
  return (s.practice ? 'Entraînement · ' : '') + `Carte ${position} sur ${s.total}`
    + (s.idx >= s.total ? ' · on revoit les ratées' : '');
}

function screenTemplate() {
  const s = session;
  const sd = sides();
  const progress = Object.keys(s.results).length / s.total * 100;
  const hint = s.cardMode === 'flip' ? 'Touche la carte pour la retourner' : '';

  return html`
    <div class="wrap review">
      <header class="topbar">
        <button class="icon-btn" data-quit aria-label="Arrêter la révision">${icons.close}</button>
        <div class="grow">
          <h2>${s.deck.name}</h2>
          <span class="muted small num">${counterText()}</span>
        </div>
        <button class="icon-btn" data-undo aria-label="Annuler la dernière réponse" ${s.undo ? '' : 'disabled'}>${icons.undo}</button>
      </header>

      <div class="progress" aria-hidden="true"><span style="width:${progress}%"></span></div>

      <div class="stage">
        <div class="flash" id="flash" role="button" tabindex="0" aria-label="${sd.frontLabel} : ${sd.front}">
          ${face('front', sd.frontLabel, sd.front, sd.frontLang, hint)}
          ${face('back', sd.backLabel, sd.back, sd.backLang, '')}
        </div>
      </div>

      ${s.fallbackNote && html`<p class="hint center">Pas assez de cartes différentes pour un QCM : retourne la carte.</p>`}
      <div class="answer-zone" id="zone" aria-live="polite"></div>
    </div>
  `;
}

/* ---------- Affichage ---------- */
export function renderReview() {
  if (!session) {
    show('home');
    return;
  }
  const s = session;
  const sd = sides();
  s.flipped = false;

  /* Le QCM a besoin de 3 autres réponses différentes, sinon on retourne la carte. */
  let choices = null;
  s.cardMode = s.mode;
  if (s.mode === 'qcm') {
    const pool = s.deck.cards.filter((c) => c.id !== currentId()).map((c) => (sd.reversed ? c.q : c.a));
    choices = pickChoices(sd.back, pool);
    if (!choices) s.cardMode = 'flip';
  }
  s.fallbackNote = s.mode === 'qcm' && s.cardMode === 'flip';

  const root = appRoot();
  mount(root, screenTemplate());
  const flash = $('#flash', root);
  const zone = $('#zone', root);

  onClick(root, '[data-quit]', quit);
  onClick(root, '[data-undo]', undo);
  onClick(root, '[data-speak]', (btn, e) => {
    e.stopPropagation();
    if (btn.dataset.speak === 'front') speak(sd.front, sd.frontLang);
    else speak(sd.back, sd.backLang);
  });

  const ctx = {
    sides: sd,
    isFlipped: () => s.flipped,
    flip: () => flip(zone, ctx),
    reveal: () => reveal(),
    grade
  };

  if (s.cardMode === 'flip') {
    const swipe = attachSwipe(flash, {
      enabled: () => s.flipped,
      onSwipe: (dir) => grade(dir === 'right'),
      baseTransform: 'rotateY(180deg)'
    });
    flash.addEventListener('click', () => { if (!swipe.wasDragged()) ctx.flip(); });
    flash.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); ctx.flip(); }
    });
    flipMode(zone, ctx);
  } else {
    flash.classList.add('static');
    if (s.cardMode === 'type') typeMode(zone, ctx);
    else qcmMode(zone, ctx, choices);
  }

  if (store.settings().autoSpeak) speak(sd.front, sd.frontLang);
}

function setFlipped(value) {
  const s = session;
  const sd = sides();
  const flash = $('#flash', appRoot());
  s.flipped = value;
  flash.classList.toggle('flipped', value);
  flash.style.transform = '';
  flash.setAttribute('aria-label', value ? `${sd.backLabel} : ${sd.back}` : `${sd.frontLabel} : ${sd.front}`);
  if (value && store.settings().autoSpeak) speak(sd.back, sd.backLang);
}

function flip(zone, ctx) {
  if (!session || session.cardMode !== 'flip') return;
  setFlipped(!session.flipped);
  sound.flip();
  flipMode(zone, ctx);
  if (session.flipped) $('[data-grade="1"]', zone)?.focus();
}

function reveal() {
  setFlipped(true);
}

/* ---------- Réponses ---------- */
export function grade(ok) {
  const s = session;
  if (!s) return;
  const id = currentId();
  const progress = store.progressFor(s.deck.id);

  s.undo = {
    idx: s.idx,
    queue: s.queue.slice(),
    results: { ...s.results },
    lapsed: new Set(s.lapsed),
    repeats: { ...s.repeats },
    progress: progress[id] ? { ...progress[id] } : undefined
  };

  if (!(id in s.results)) s.results[id] = ok;

  if (!s.practice) {
    progress[id] = schedule(progress[id], ok, store.today(), s.lapsed.has(id));
    store.logAnswer();
    store.save();
  }

  if (!ok) {
    s.lapsed.add(id);
    s.repeats[id] = (s.repeats[id] || 0) + 1;
    if (s.repeats[id] <= MAX_REPEATS) s.queue.splice(Math.min(s.queue.length, s.idx + REPEAT_GAP), 0, id);
  }

  if (s.cardMode === 'flip') {
    if (ok) sound.right(); else sound.wrong();
  }

  s.idx += 1;
  if (s.idx >= s.queue.length) finish();
  else renderReview();
}

function undo() {
  const s = session;
  if (!s?.undo) return;
  const u = s.undo;
  const id = u.queue[u.idx];
  Object.assign(s, { idx: u.idx, queue: u.queue, results: u.results, lapsed: u.lapsed, repeats: u.repeats, undo: null });

  if (!s.practice) {
    const progress = store.progressFor(s.deck.id);
    if (u.progress) progress[id] = u.progress;
    else delete progress[id];
    store.logAnswer(-1);
    store.save();
  }
  renderReview();
  toast('Réponse annulée');
}

async function quit() {
  if (session && Object.keys(session.results).length > 0) {
    const ok = await confirmBox({
      title: 'Arrêter la révision ?',
      text: session.practice ? 'Tu pourras recommencer quand tu veux.' : 'Pas de souci : tes réponses sont déjà enregistrées.',
      ok: 'Arrêter'
    });
    if (!ok) return;
  }
  go('home');
}

function finish() {
  const s = session;
  const ids = Object.keys(s.results);
  show('summary', {
    deckId: s.deck.id,
    practice: s.practice,
    total: ids.length,
    right: ids.filter((id) => s.results[id]).length,
    missedIds: ids.filter((id) => !s.results[id])
  });
}

/* ---------- Clavier ---------- */
function onKey(e) {
  if (!session || currentScreen() !== 'review' || document.querySelector('dialog[open]')) return;
  const tag = e.target?.tagName || '';
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
  const zone = $('#zone', appRoot());
  const k = e.key;

  if (k === 'Escape') {
    e.preventDefault();
    quit();
  } else if (session.cardMode === 'flip') {
    const onButton = tag === 'BUTTON' && k === 'Enter'; // Entrée sur un bouton : laisser le bouton agir
    if (!onButton && (k === ' ' || (k === 'Enter' && !session.flipped))) {
      e.preventDefault();
      $('#flash', appRoot()).click();
    } else if (session.flipped && (k === '1' || k === 'ArrowLeft')) {
      e.preventDefault();
      grade(false);
    } else if (session.flipped && (k === '2' || k === 'ArrowRight')) {
      e.preventDefault();
      grade(true);
    }
  } else if (session.cardMode === 'qcm' && /^[1-4]$/.test(k)) {
    e.preventDefault();
    pressChoice(zone, k);
  }
}

document.addEventListener('keydown', onKey);

/* Quand on quitte l'écran de révision, on oublie la session et on coupe la voix. */
export function enterReview() {
  setCleanup(() => {
    session = null;
    stopSpeaking();
  });
  renderReview();
}
