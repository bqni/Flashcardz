/* Menu "…" d'un deck : entraînement, modifier, partager, exporter, remise à zéro, suppression. */

import * as store from '../core/store.js';
import { html, $$ } from '../ui/html.js';
import { icons } from '../ui/icons.js';
import { plural } from '../ui/format.js';
import { openDialog, confirmBox } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { go, show } from '../router.js';
import { openStartSheet } from './start-sheet.js';
import { openShare, openExport } from './share.js';

async function resetDeck(deck) {
  const ok = await confirmBox({
    title: 'Remettre à zéro ?',
    text: `Toutes les cartes de « ${deck.name} » redeviennent nouvelles. Les cartes elles-mêmes ne sont pas touchées.`,
    ok: 'Remettre à zéro',
    danger: true
  });
  if (!ok) return;
  store.resetProgress(deck.id);
  show('home');
  toast('Progression remise à zéro');
}

async function deleteDeck(deck) {
  const ok = await confirmBox({
    title: 'Supprimer ce deck ?',
    text: `« ${deck.name} » et ses ${plural(deck.cards.length, 'carte', 'cartes')} seront effacés de cet appareil. `
      + "Pense à l'exporter avant si tu veux le garder.",
    ok: 'Supprimer',
    danger: true
  });
  if (!ok) return;
  store.deleteDeck(deck.id);
  show('home');
  toast('Deck supprimé');
}

/* [action, icône, libellé, fonction] */
const ACTIONS = [
  ['practice', icons.practice, 'Entraînement libre', (d) => openStartSheet(d.id, true)],
  ['edit', icons.edit, 'Modifier', (d) => go('edit', { deckId: d.id })],
  ['share', icons.share, 'Partager (lien, QR code)', (d) => openShare(d.id)],
  ['export', icons.download, 'Exporter', (d) => openExport(d.id)],
  ['reset', icons.reset, 'Remettre la progression à zéro', resetDeck],
  ['delete', icons.trash, 'Supprimer le deck', deleteDeck]
];

export function openDeckMenu(deckId) {
  const deck = store.deckById(deckId);
  if (!deck) return;

  const body = html`
    <div class="menu-list">
      ${ACTIONS.map(([key, icon, label]) => html`
        <button data-act="${key}" class="${key === 'delete' ? 'danger' : ''}">${icon}${label}</button>
      `)}
    </div>
  `;

  openDialog(deck.name, body, (dlg) => {
    $$('[data-act]', dlg).forEach((btn) => btn.addEventListener('click', () => {
      const action = ACTIONS.find(([key]) => key === btn.dataset.act);
      dlg.close();
      action[3](deck);
    }));
  });
}
