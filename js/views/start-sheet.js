/* Fenêtre avant une révision : mode de réponse, sens, nombre de cartes.
   Les choix sont gardés pour la prochaine fois. */

import * as store from '../core/store.js';
import { html, $, $$ } from '../ui/html.js';
import { icons } from '../ui/icons.js';
import { plural, dayLabel } from '../ui/format.js';
import { openDialog } from '../ui/dialog.js';
import { startSession } from './review.js';

const OPTIONS = {
  mode: [['flip', 'Retourner'], ['type', 'Écrire'], ['qcm', 'QCM']],
  dir: [['qa', 'Question → réponse'], ['aq', 'Réponse → question'], ['mix', 'Mélangé']],
  count: [[10, '10'], [20, '20'], [50, '50'], [0, 'Toutes']]
};

function segmented(key, label, value) {
  return html`
    <div class="field">
      <span class="label">${label}</span>
      <div class="seg full" role="group" aria-label="${label}" data-seg="${key}">
        ${OPTIONS[key].map(([v, text]) => html`
          <button type="button" data-val="${v}" aria-pressed="${String(v) === String(value)}">${text}</button>
        `)}
      </div>
    </div>
  `;
}

function intro(st, practice, forced) {
  if (practice && !forced) {
    return html`
      <p>Tout est à jour pour ce deck. Prochaine révision prévue ${dayLabel(st.nextDue)}.</p>
      <p class="muted small">Tu peux quand même t'entraîner : ça ne change pas ta progression.</p>
    `;
  }
  if (practice) return html`<p class="muted small">Entraînement libre sur tout le deck : ça ne change pas ta progression.</p>`;
  return html`
    <p>
      <b>${plural(st.due, 'carte', 'cartes')}</b> à réviser
      ${st.fresh > 0 && html` et <b>${plural(st.fresh, 'nouvelle', 'nouvelles')}</b>`}.
    </p>
  `;
}

export function openStartSheet(deckId, forcePractice = false) {
  const deck = store.deckById(deckId);
  if (!deck || !deck.cards.length) return;

  const st = store.statsFor(deck);
  const prefs = store.sessionPrefs();
  const practice = forcePractice || st.due + st.fresh === 0;

  const body = html`
    ${intro(st, practice, forcePractice)}
    ${segmented('mode', 'Comment répondre', prefs.mode)}
    ${segmented('dir', 'Sens', prefs.dir)}
    ${segmented('count', 'Nombre de cartes', prefs.count)}
    <button class="btn primary big block" data-start>${icons.play}${practice ? "S'entraîner" : "C'est parti"}</button>
  `;

  openDialog(deck.name, body, (dlg) => {
    $$('[data-seg]', dlg).forEach((group) => group.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      $$('button', group).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      const key = group.dataset.seg;
      prefs[key] = key === 'count' ? Number(btn.dataset.val) : btn.dataset.val;
      store.save();
    }));

    const start = $('[data-start]', dlg);
    start.addEventListener('click', () => {
      dlg.close();
      startSession({ deckId, practice });
    });
    start.focus();
  });
}
