/* Fenêtre d'import : coller du texte, ou choisir un fichier
   (decks de l'ancienne appli, deck exporté, sauvegarde complète, texte ou CSV). */

import * as store from '../core/store.js';
import { parsePaste, parseJsonImport } from '../core/parsing.js';
import { html, mount, $, $$ } from '../ui/html.js';
import { icons } from '../ui/icons.js';
import { plural } from '../ui/format.js';
import { openDialog, confirmBox } from '../ui/dialog.js';
import { readTextFile } from '../ui/files.js';
import { applyAppearance } from '../ui/appearance.js';
import { toast } from '../ui/toast.js';
import { show } from '../router.js';

/* ---------- Gabarits ---------- */
function pastePane() {
  return html`
    <div data-pane="paste" class="answer-zone">
      <p class="hint">
        Une carte par ligne : <code>question ; réponse</code>.
        Marche aussi avec <code>|</code>, <code>=</code>, <code>-&gt;</code>
        ou un copier-coller depuis Excel, Anki ou Quizlet.
      </p>
      <label class="sr-only" for="imp-text">Texte à importer</label>
      <textarea id="imp-text" class="input" rows="7"
        placeholder="Photosynthèse ; Fabrication de matière organique grâce à la lumière&#10;Mitochondrie ; Centrale énergétique de la cellule"></textarea>
      <p class="hint" id="imp-info" aria-live="polite"></p>

      <div class="field">
        <label for="imp-target">Où les mettre</label>
        <select id="imp-target" class="input">
          <option value="">Nouveau deck</option>
          ${store.decks().map((d) => html`<option value="${d.id}">Ajouter à « ${d.name} »</option>`)}
        </select>
      </div>
      <div class="field" id="imp-name-field">
        <label for="imp-name">Nom du nouveau deck</label>
        <input id="imp-name" class="input" maxlength="120" placeholder="Ex. : SVT · la cellule">
      </div>
      <button class="btn primary block" id="imp-go" disabled>Importer</button>
    </div>
  `;
}

function filePane() {
  return html`
    <div data-pane="file" class="answer-zone" hidden>
      <p class="hint">
        Fichiers acceptés : les decks de l'ancienne appli (.json), un deck Flashcardz exporté,
        une sauvegarde complète, ou un fichier texte / CSV.
      </p>
      <label class="btn block" for="imp-file">${icons.upload}Choisir un fichier</label>
      <input id="imp-file" type="file" class="sr-only"
        accept=".json,.txt,.csv,.tsv,application/json,text/plain,text/csv">
      <div id="imp-file-result" aria-live="polite"></div>
    </div>
  `;
}

/* ---------- Onglet "Coller du texte" ---------- */
function setupPaste(dlg) {
  const text = $('#imp-text', dlg);
  const info = $('#imp-info', dlg);
  const button = $('#imp-go', dlg);
  const target = $('#imp-target', dlg);

  text.addEventListener('input', () => {
    const { cards, skipped } = parsePaste(text.value);
    button.disabled = !cards.length;
    button.textContent = cards.length ? `Importer ${plural(cards.length, 'carte', 'cartes')}` : 'Importer';
    if (!text.value.trim()) info.textContent = '';
    else if (!cards.length) info.textContent = 'Aucune carte reconnue : mets un ; entre la question et la réponse.';
    else info.textContent = plural(cards.length, 'carte reconnue', 'cartes reconnues')
      + (skipped.length ? `, ${plural(skipped.length, 'ligne ignorée', 'lignes ignorées')} (sans séparateur)` : '');
  });

  target.addEventListener('change', () => { $('#imp-name-field', dlg).hidden = !!target.value; });

  button.addEventListener('click', () => {
    const { cards } = parsePaste(text.value);
    if (!cards.length) return;
    if (target.value) {
      store.appendCards(target.value, cards);
      toast(plural(cards.length, 'carte ajoutée', 'cartes ajoutées'));
    } else {
      const deck = store.addImportedDeck({ name: $('#imp-name', dlg).value, cards });
      toast(`« ${deck.name} » ajouté`);
    }
    dlg.close();
    show('home');
  });
}

/* ---------- Onglet "Fichier" ---------- */
function readImport(text, fileName) {
  const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  try {
    return parseJsonImport(JSON.parse(text), baseName);
  } catch {
    /* pas du JSON : on essaie comme texte, avec la virgule en plus pour les CSV */
  }
  const { cards } = parsePaste(text, [',']);
  return cards.length ? { kind: 'deck', deck: { name: baseName, cards } } : null;
}

function showBackup(out, dlg, backup) {
  const date = backup.exported ? new Date(backup.exported).toLocaleDateString('fr-FR') : 'date inconnue';
  mount(out, html`
    <p>Sauvegarde du ${date} : ${plural(backup.decks.length, 'deck', 'decks')}.</p>
    <p class="hint">Restaurer remplace tous les decks et la progression de cet appareil.</p>
    <button class="btn ko block" data-restore>Restaurer la sauvegarde</button>
  `);
  $('[data-restore]', out).addEventListener('click', async () => {
    dlg.close();
    const ok = await confirmBox({
      title: 'Tout remplacer ?',
      text: 'Les decks actuels seront remplacés par ceux de la sauvegarde.',
      ok: 'Restaurer',
      danger: true
    });
    if (!ok) return;
    store.restoreBackup(backup);
    applyAppearance();
    show('home');
    toast('Sauvegarde restaurée');
  });
}

function showDeckPreview(out, dlg, { deck, legacy }) {
  const withProgress = legacy ? deck.cards.filter((c) => c.level > 0).length : 0;
  const first = deck.cards[0];
  mount(out, html`
    <div class="verdict ok">
      ${plural(deck.cards.length, 'carte trouvée', 'cartes trouvées')}
      <span class="expected">
        ${legacy && html`Deck de l'ancienne appli${withProgress > 0 && html`, ta progression sur ${plural(withProgress, 'carte', 'cartes')} est reprise`}.<br>`}
        Ex. : ${first.q.slice(0, 60)} → ${first.a.slice(0, 40)}
      </span>
    </div>
    <div class="field">
      <label for="imp-fname">Nom du deck</label>
      <input id="imp-fname" class="input" maxlength="120" value="${deck.name}">
    </div>
    <button class="btn primary block" data-add>Ajouter ce deck</button>
  `);
  $('[data-add]', out).addEventListener('click', () => {
    deck.name = $('#imp-fname', out).value || deck.name;
    const added = store.addImportedDeck(deck, legacy);
    dlg.close();
    show('home');
    toast(`« ${added.name} » ajouté`);
  });
}

function setupFile(dlg) {
  const out = $('#imp-file-result', dlg);
  $('#imp-file', dlg).addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let text;
    try {
      text = await readTextFile(file);
    } catch {
      mount(out, html`<p class="verdict ko">Impossible de lire ce fichier.</p>`);
      return;
    }
    const result = readImport(text, file.name);
    if (!result) {
      mount(out, html`
        <p class="verdict ko">
          Aucune carte trouvée dans « ${file.name} ».
          <span class="expected">Il faut un fichier .json de flashcards, ou un texte avec une carte par ligne.</span>
        </p>
      `);
    } else if (result.kind === 'backup') {
      showBackup(out, dlg, result.data);
    } else {
      showDeckPreview(out, dlg, result);
    }
  });
}

/* ---------- Fenêtre ---------- */
export function openImport({ tab = 'paste' } = {}) {
  const body = html`
    <div class="seg full" role="group" aria-label="Type d'import" data-tabs>
      <button type="button" data-tab="paste" aria-pressed="true">Coller du texte</button>
      <button type="button" data-tab="file" aria-pressed="false">Fichier</button>
    </div>
    ${pastePane()}
    ${filePane()}
  `;

  openDialog('Importer des cartes', body, (dlg) => {
    const selectTab = (name) => {
      $$('[data-tab]', dlg).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === name)));
      $$('[data-pane]', dlg).forEach((p) => { p.hidden = p.dataset.pane !== name; });
    };
    $('[data-tabs]', dlg).addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (btn) selectTab(btn.dataset.tab);
    });
    setupPaste(dlg);
    setupFile(dlg);
    selectTab(tab);
    if (tab === 'paste') $('#imp-text', dlg).focus();
  });
}
