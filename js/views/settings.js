/* Écran des réglages : affichage, révision, explication de la méthode, données. */

import * as store from '../core/store.js';
import { VERSION, TEXT_SIZES } from '../core/config.js';
import { INTERVALS } from '../core/leitner.js';
import { html, mount, $$, onClick } from '../ui/html.js';
import { icons } from '../ui/icons.js';
import { isoDate } from '../ui/format.js';
import { canSpeak } from '../ui/env.js';
import { applyAppearance } from '../ui/appearance.js';
import { sound, speak } from '../ui/feedback.js';
import { confirmBox } from '../ui/dialog.js';
import { download } from '../ui/files.js';
import { toast } from '../ui/toast.js';
import { appRoot, go, show } from '../router.js';
import { openImport } from './import.js';

/* ---------- Petits composants ---------- */
const NUMERIC = ['size', 'rate'];

function segmented(key, options) {
  const value = String(store.settings()[key]);
  return html`
    <div class="seg" role="group" data-set="${key}">
      ${options.map(([v, label]) => html`<button type="button" data-val="${v}" aria-pressed="${String(v) === value}">${label}</button>`)}
    </div>
  `;
}

function row(title, control, hint) {
  return html`
    <div class="setting">
      <div class="grow"><b>${title}</b>${hint && html`<p class="hint">${hint}</p>`}</div>
      ${control}
    </div>
  `;
}

function toggle(key, title, hint) {
  const checked = store.settings()[key];
  return html`
    <div class="setting">
      <div class="grow">
        <label for="s-${key}"><b>${title}</b></label>
        ${hint && html`<p class="hint">${hint}</p>`}
      </div>
      <span class="switch">
        <input type="checkbox" id="s-${key}" data-toggle="${key}" ${checked ? 'checked' : ''}>
        <span></span>
      </span>
    </div>
  `;
}

/* ---------- Sections ---------- */
function displaySection() {
  return html`
    <section class="group">
      <h3>Affichage</h3>
      ${row('Thème', segmented('theme', [['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']]))}
      ${row('Taille du texte', segmented('size', TEXT_SIZES))}
      ${row('Police', segmented('font', [['atkinson', 'Atkinson'], ['lexend', 'Lexend'], ['system', 'Système']]),
        'Atkinson est faite pour bien distinguer les lettres. Lexend aide à lire plus vite.')}
      ${toggle('airy', 'Texte aéré', "Plus d'espace entre les lignes et les lettres.")}
    </section>
  `;
}

function reviewSection() {
  return html`
    <section class="group">
      <h3>Révision</h3>
      ${toggle('anim', 'Animations', 'La carte se retourne en douceur.')}
      ${toggle('sound', 'Sons', 'Petit son quand tu réponds.')}
      ${canSpeak && html`
        ${toggle('autoSpeak', 'Lecture à voix haute automatique', "Chaque carte est lue dès qu'elle s'affiche.")}
        ${row('Vitesse de la voix', segmented('rate', [[0.75, 'Lente'], [1, 'Normale'], [1.2, 'Rapide']]))}
      `}
    </section>
  `;
}

/* Le texte suit automatiquement les intervalles définis dans leitner.js. */
function methodSection() {
  const delay = (days) => (days === 1 ? 'demain' : `dans ${days} jours`);
  const boxes = [1, 2, 3, 4, 5].map((b, i) => html`${i ? ', ' : ''}<b>boîte ${b}</b> ${delay(INTERVALS[b])}`);
  return html`
    <section class="group">
      <h3>Comment ça marche</h3>
      <div class="setting">
        <p class="grow">
          Chaque carte avance d'une boîte quand tu la sais, et revient en boîte 1 quand tu la rates.
          Plus la boîte est haute, plus la carte revient tard : ${boxes}.
          En boîte 5, la carte est maîtrisée.
        </p>
      </div>
    </section>
  `;
}

function dataSection() {
  return html`
    <section class="group">
      <h3>Mes données</h3>
      <div class="setting">
        <p class="grow hint">
          Tout reste sur cet appareil, rien n'est envoyé en ligne. Fais une sauvegarde de temps en temps
          pour ne rien perdre, ou pour passer sur un autre appareil.
        </p>
      </div>
      <div class="setting">
        <div class="row grow">
          <button class="btn" data-backup>${icons.download}Sauvegarder tout</button>
          <button class="btn" data-restore>${icons.upload}Restaurer</button>
        </div>
      </div>
      <div class="setting">
        <div class="row grow"><button class="btn danger" data-wipe>${icons.trash}Tout effacer</button></div>
      </div>
    </section>
  `;
}

/* ---------- Écran ---------- */
export function renderSettings() {
  const root = appRoot();
  mount(root, html`
    <div class="wrap">
      <header class="topbar">
        <button class="icon-btn" data-back aria-label="Retour">${icons.back}</button>
        <h2 class="grow">Réglages</h2>
      </header>
      <div class="settings">
        ${displaySection()}
        ${reviewSection()}
        ${methodSection()}
        ${dataSection()}
        <p class="muted small center">Flashcardz ${VERSION}</p>
      </div>
    </div>
  `);

  const s = store.settings();
  onClick(root, '[data-back]', () => go('home'));

  $$('[data-set]', root).forEach((group) => group.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const key = group.dataset.set;
    s[key] = NUMERIC.includes(key) ? Number(btn.dataset.val) : btn.dataset.val;
    $$('button', group).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    store.save();
    applyAppearance();
    if (key === 'rate') speak('Voici la nouvelle vitesse.');
  }));

  $$('[data-toggle]', root).forEach((input) => input.addEventListener('change', () => {
    s[input.dataset.toggle] = input.checked;
    store.save();
    applyAppearance();
    if (input.dataset.toggle === 'sound' && input.checked) sound.right();
  }));

  onClick(root, '[data-backup]', () => {
    download(`flashcardz-sauvegarde-${isoDate()}.json`, JSON.stringify(store.backupData()));
  });
  onClick(root, '[data-restore]', () => openImport({ tab: 'file' }));
  onClick(root, '[data-wipe]', async () => {
    const ok = await confirmBox({
      title: 'Tout effacer ?',
      text: 'Tous les decks et toute la progression de cet appareil seront supprimés. Impossible de revenir en arrière.',
      ok: 'Tout effacer',
      danger: true
    });
    if (!ok) return;
    store.wipeAll();
    show('home');
    toast('Tout a été effacé');
  });
}
