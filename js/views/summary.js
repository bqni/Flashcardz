/* Bilan de fin de révision. */

import * as store from '../core/store.js';
import { html, mount, onClick } from '../ui/html.js';
import { icons } from '../ui/icons.js';
import { plural, dayLabel } from '../ui/format.js';
import { sound } from '../ui/feedback.js';
import { appRoot, go } from '../router.js';
import { startSession } from './review.js';

function encouragement(percent) {
  if (percent === 100) return 'Sans faute, bravo !';
  if (percent >= 75) return 'Très bien, tu maîtrises presque tout.';
  if (percent >= 50) return 'Bien, encore un petit effort sur les ratées.';
  return "Ça rentre petit à petit, c'est normal au début.";
}

function nextReview(deck) {
  const st = store.statsFor(deck);
  const left = st.due + st.fresh;
  return left ? `aujourd'hui (il en reste ${left})` : dayLabel(st.nextDue);
}

export function renderSummary({ deckId, practice, total, right, missedIds }) {
  const deck = store.deckById(deckId);
  if (!deck) {
    go('home');
    return;
  }
  const missed = missedIds.map((id) => deck.cards.find((c) => c.id === id)).filter(Boolean);
  const percent = total ? Math.round(right / total * 100) : 0;

  const root = appRoot();
  mount(root, html`
    <div class="wrap summary">
      <header class="topbar">
        <button class="icon-btn" data-home aria-label="Retour aux decks">${icons.back}</button>
        <h2 class="grow">Bilan</h2>
      </header>

      <div class="score">
        <span class="big">${right}/${total}</span>
        <span>${plural(right, 'carte sue', 'cartes sues')} du premier coup</span>
        <span class="muted">${encouragement(percent)}</span>
      </div>

      ${practice
        ? html`<p class="muted small">Entraînement : ta progression n'a pas changé.</p>`
        : html`<p>Prochaine révision de ce deck : <b>${nextReview(deck)}</b>.</p>`}

      ${missed.length > 0 && html`
        <div class="missed">
          <h3>À retravailler</h3>
          <ul>${missed.map((c) => html`<li><b>${c.q}</b><span>${c.a}</span></li>`)}</ul>
        </div>`}

      <div class="row">
        ${missed.length > 0 && html`<button class="btn" data-again>${icons.practice}Revoir les ratées</button>`}
        <button class="btn primary" data-home>Retour aux decks</button>
      </div>
    </div>
  `);

  onClick(root, '[data-home]', () => go('home'));
  onClick(root, '[data-again]', () => startSession({ deckId, ids: missed.map((c) => c.id) }));
  if (total && right === total) sound.right();
}
