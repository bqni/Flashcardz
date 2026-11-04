/* Écran d'accueil : la liste des decks, ce qu'il y a à réviser aujourd'hui. */

import * as store from '../core/store.js';
import { html, mount, onClick } from '../ui/html.js';
import { icons, brandMark } from '../ui/icons.js';
import { plural, langLabel, dayLabel } from '../ui/format.js';
import { isIOS, isInstalled, isEmbedded } from '../ui/env.js';
import { appRoot, go, show } from '../router.js';
import { openStartSheet } from './start-sheet.js';
import { openDeckMenu } from './deck-menu.js';
import { openImport } from './import.js';

const BOX_COLORS = ['var(--box0)', 'var(--box1)', 'var(--box2)', 'var(--box3)', 'var(--box4)', 'var(--box5)'];
const BOX_NAMES = ['Nouv.', 'B1', 'B2', 'B3', 'B4', 'B5'];

/* Barre des 5 boîtes de Leitner + légende. */
function boxesBar(st) {
  if (!st.total) return '';
  const segments = [1, 2, 3, 4, 5]
    .filter((b) => st.boxes[b])
    .map((b) => html`<span style="width:${(st.boxes[b] / st.total * 100).toFixed(2)}%;background:${BOX_COLORS[b]}"></span>`);
  const legend = BOX_NAMES.map((name, b) => html`<span><i style="background:${BOX_COLORS[b]}"></i>${name} ${st.boxes[b]}</span>`);
  const label = `Répartition : ${st.boxes[0]} nouvelles, `
    + [1, 2, 3, 4, 5].map((b) => `boîte ${b} : ${st.boxes[b]}`).join(', ');

  return html`
    <div class="boxes">
      <div class="boxbar" role="img" aria-label="${label}">${segments}</div>
      <div class="boxlegend" aria-hidden="true">${legend}</div>
    </div>
  `;
}

function dueLine(st) {
  if (!st.total) return html`<span class="muted">Aucune carte pour l'instant</span>`;
  const todo = st.due + st.fresh;
  return html`
    <span class="${st.due ? 'hot' : ''}"><b>${st.due}</b> à réviser</span>
    ${st.fresh > 0 && html`<span><b>${st.fresh}</b> ${st.fresh > 1 ? 'nouvelles' : 'nouvelle'}</span>`}
    <span><b>${st.mastered}</b>/${st.total} ${st.mastered > 1 ? 'maîtrisées' : 'maîtrisée'}</span>
    ${!todo && st.nextDue != null && html`<span class="muted">Prochaine révision ${dayLabel(st.nextDue)}</span>`}
  `;
}

function deckCard(deck) {
  const st = store.statsFor(deck);
  const todo = st.due + st.fresh;
  const langs = deck.langA !== deck.langQ ? ` · ${langLabel(deck.langQ)} → ${langLabel(deck.langA)}` : '';

  return html`
    <article class="deck" style="--deck-color:${store.validColor(deck.color)}">
      <div class="deck-head">
        <div class="grow">
          <div class="deck-name">${deck.name} ${deck.example && html`<span class="chip">Exemple</span>`}</div>
          <div class="deck-meta">${plural(st.total, 'carte', 'cartes')}${langs}</div>
        </div>
        <button class="icon-btn" data-menu="${deck.id}" aria-label="Options du deck ${deck.name}">${icons.more}</button>
      </div>
      <div class="due-line">${dueLine(st)}</div>
      ${boxesBar(st)}
      <div class="row">
        <button class="btn ${todo ? 'primary' : ''}" data-review="${deck.id}" ${st.total ? '' : 'disabled'}>
          ${icons.play}${todo ? 'Réviser' : "S'entraîner"}
        </button>
        <button class="btn" data-edit="${deck.id}">${icons.edit}Modifier</button>
      </div>
    </article>
  `;
}

function banners() {
  const list = [];
  if (!store.storage.ok) {
    list.push(html`
      <div class="banner warn"><div class="grow">
        <b>Ta progression ne peut pas être enregistrée ici.</b>
        Le navigateur bloque le stockage (navigation privée ?). Ouvre l'appli dans une fenêtre normale.
      </div></div>
    `);
  }
  if (isIOS && !isInstalled && !isEmbedded && !store.db().flags.iosHint) {
    list.push(html`
      <div class="banner">
        <div class="grow">
          <b>Installe l'appli sur ton iPhone</b><br>
          Bouton Partager, puis « Sur l'écran d'accueil ». Elle marchera hors ligne
          et Safari n'effacera pas ta progression.
        </div>
        <button class="icon-btn" data-dismiss="iosHint" aria-label="Masquer">${icons.close}</button>
      </div>
    `);
  }
  return list;
}

function todayLine() {
  const totalDue = store.decks().reduce((sum, d) => sum + store.statsFor(d).due, 0);
  const answers = store.answersToday();
  const streak = store.streak();
  const extra = [
    answers > 0 && `${plural(answers, 'réponse', 'réponses')} aujourd'hui`,
    streak > 1 && `série de ${streak} jours`
  ].filter(Boolean).join(' · ');

  return html`
    <div class="today">
      <strong>${totalDue ? `${plural(totalDue, 'carte à réviser', 'cartes à réviser')} aujourd'hui` : "Rien en retard aujourd'hui"}</strong>
      <span class="muted small num">${extra}</span>
    </div>
  `;
}

export function renderHome() {
  const decks = store.decks();
  const root = appRoot();

  mount(root, html`
    <div class="wrap">
      <header class="topbar">
        <div class="brand grow">${brandMark}<span>Flashcardz</span></div>
        <button class="icon-btn" data-settings aria-label="Réglages">${icons.settings}</button>
      </header>

      ${banners()}
      ${todayLine()}

      ${decks.length
        ? html`<section class="decks" aria-label="Mes decks">${decks.map(deckCard)}</section>`
        : html`
          <div class="empty">
            <h2>Aucun deck</h2>
            <p class="muted">Crée ton premier deck, ou colle une liste de questions et réponses.</p>
          </div>`}

      <div class="bottom-actions">
        <button class="btn primary big" data-new>${icons.plus}Nouveau deck</button>
        <button class="btn big" data-import>${icons.upload}Importer</button>
      </div>
    </div>
  `);

  onClick(root, '[data-settings]', () => go('settings'));
  onClick(root, '[data-new]', () => go('edit', { deckId: null }));
  onClick(root, '[data-import]', () => openImport());
  onClick(root, '[data-review]', (b) => openStartSheet(b.dataset.review));
  onClick(root, '[data-edit]', (b) => go('edit', { deckId: b.dataset.edit }));
  onClick(root, '[data-menu]', (b) => openDeckMenu(b.dataset.menu));
  onClick(root, '[data-dismiss]', (b) => {
    store.db().flags[b.dataset.dismiss] = true;
    store.save();
    show('home');
  });
}
