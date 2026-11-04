/* Écran de création / modification d'un deck.
   On travaille sur une copie (draft) : rien n'est enregistré tant qu'on n'appuie pas sur Enregistrer,
   et Annuler annule vraiment. */

import * as store from '../core/store.js';
import { DECK_COLORS, LANGS } from '../core/config.js';
import { parsePaste } from '../core/parsing.js';
import { uid } from '../core/ids.js';
import { html, mount, $, $$, onClick } from '../ui/html.js';
import { icons } from '../ui/icons.js';
import { plural } from '../ui/format.js';
import { confirmBox } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { appRoot, go, setLeaveGuard, show } from '../router.js';

/* ---------- Gabarits ---------- */
function langSelect(id, label, value) {
  return html`
    <div class="field">
      <label for="${id}">${label}</label>
      <select id="${id}" class="input">
        ${LANGS.map(([code, name]) => html`<option value="${code}" ${code === value ? 'selected' : ''}>${name}</option>`)}
      </select>
    </div>
  `;
}

function colorPicker(selected) {
  return html`
    <div class="field">
      <span class="label" id="lbl-color">Couleur</span>
      <div class="swatches" role="group" aria-labelledby="lbl-color">
        ${DECK_COLORS.map((c, i) => html`
          <button class="swatch" style="background:${c}" data-color="${c}"
            aria-pressed="${c === selected}" aria-label="Couleur ${i + 1}"></button>
        `)}
      </div>
    </div>
  `;
}

function bulkPanel() {
  return html`
    <details class="bulk">
      <summary>Ajouter plein de cartes d'un coup</summary>
      <div class="inner">
        <p class="hint">
          Une carte par ligne : la question, un séparateur, la réponse.
          Séparateurs acceptés : <code>;</code> <code>|</code> <code>=</code> <code>-&gt;</code>
          ou une tabulation (copier-coller depuis Excel, Anki, Quizlet).
          Écris <code>\\n</code> pour un retour à la ligne.
        </p>
        <textarea id="f-bulk" class="input" rows="6"
          placeholder="Révolution française ; 1789&#10;Chute du mur de Berlin ; 1989&#10;Fin de la Seconde Guerre mondiale ; 1945"></textarea>
        <div class="row">
          <span class="hint grow" id="bulk-info" aria-live="polite"></span>
          <button class="btn primary" id="bulk-add" disabled>Ajouter</button>
        </div>
      </div>
    </details>
  `;
}

function cardEditor(card, index) {
  const n = index + 1;
  return html`
    <div class="edit-card" data-id="${card.id}">
      <div class="edit-card-head">
        <span class="n">Carte ${n}</span>
        <button class="icon-btn" data-del="${card.id}" aria-label="Supprimer la carte ${n}">${icons.trash}</button>
      </div>
      <label class="sr-only" for="q-${card.id}">Question de la carte ${n}</label>
      <textarea class="input" id="q-${card.id}" data-side="q" rows="1" placeholder="Question">${card.q}</textarea>
      <label class="sr-only" for="a-${card.id}">Réponse de la carte ${n}</label>
      <textarea class="input" id="a-${card.id}" data-side="a" rows="1" placeholder="Réponse">${card.a}</textarea>
    </div>
  `;
}

function editorPage(draft, isNew) {
  return html`
    <div class="wrap">
      <header class="topbar">
        <button class="icon-btn" data-back aria-label="Retour">${icons.back}</button>
        <h2 class="grow">${isNew ? 'Nouveau deck' : 'Modifier le deck'}</h2>
      </header>

      <div class="form">
        <div class="field">
          <label for="f-name">Nom du deck</label>
          <input id="f-name" class="input" maxlength="120" placeholder="Ex. : Histoire · la guerre froide" value="${draft.name}">
        </div>

        ${colorPicker(store.validColor(draft.color))}

        <div class="grid2">
          ${langSelect('f-lq', 'Langue des questions', store.validLang(draft.langQ))}
          ${langSelect('f-la', 'Langue des réponses', store.validLang(draft.langA))}
        </div>
        <p class="hint">La langue sert à la lecture à voix haute.</p>

        ${bulkPanel()}

        <h3 id="count-title"></h3>
        <div class="cards-list" id="cards"></div>
        <button class="btn block" id="add-card">${icons.plus}Ajouter une carte</button>

        <div class="sticky-save">
          <button class="btn" data-cancel>Annuler</button>
          <button class="btn primary" data-save>Enregistrer</button>
        </div>
      </div>
    </div>
  `;
}

/* ---------- Écran ---------- */
function autosize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight + 2, 320) + 'px';
}

export function renderEditor({ deckId }) {
  const original = deckId ? store.deckById(deckId) : null;
  if (deckId && !original) {
    show('home');
    return;
  }
  const draft = original ? structuredClone(original) : store.newDeckDraft();
  let dirty = false;
  const markDirty = () => { dirty = true; };

  setLeaveGuard(async () => !dirty || confirmBox({
    title: 'Quitter sans enregistrer ?',
    text: 'Tes modifications sur ce deck seront perdues.',
    ok: 'Quitter',
    danger: true
  }), () => dirty);

  const root = appRoot();
  mount(root, editorPage(draft, !original));
  const list = $('#cards', root);

  /* --- liste des cartes --- */
  function renderCards(focusCardId) {
    $('#count-title', root).textContent = plural(draft.cards.length, 'carte', 'cartes');
    mount(list, draft.cards.map(cardEditor));
    $$('textarea', list).forEach(autosize);
    if (focusCardId) {
      const el = $(`#q-${focusCardId}`, list);
      if (el) {
        el.focus();
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }

  function addCard() {
    const card = { id: uid(), q: '', a: '' };
    draft.cards.push(card);
    markDirty();
    renderCards(card.id);
  }

  list.addEventListener('input', (e) => {
    const t = e.target;
    if (t.tagName !== 'TEXTAREA') return;
    const box = t.closest('.edit-card');
    const card = draft.cards.find((c) => c.id === box.dataset.id);
    if (card) card[t.dataset.side] = t.value;
    box.classList.remove('invalid');
    markDirty();
    autosize(t);
  });

  list.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addCard();
    }
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    draft.cards = draft.cards.filter((c) => c.id !== btn.dataset.del);
    markDirty();
    renderCards();
  });

  /* --- infos du deck --- */
  $('#f-name', root).addEventListener('input', (e) => { draft.name = e.target.value; markDirty(); });
  $('#f-lq', root).addEventListener('change', (e) => { draft.langQ = e.target.value; markDirty(); });
  $('#f-la', root).addEventListener('change', (e) => { draft.langA = e.target.value; markDirty(); });
  onClick(root, '[data-color]', (btn) => {
    draft.color = btn.dataset.color;
    $$('[data-color]', root).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    markDirty();
  });

  /* --- ajout en masse --- */
  const bulk = $('#f-bulk', root);
  const bulkInfo = $('#bulk-info', root);
  const bulkBtn = $('#bulk-add', root);

  bulk.addEventListener('input', () => {
    const { cards, skipped } = parsePaste(bulk.value);
    bulkBtn.disabled = !cards.length;
    bulkBtn.textContent = cards.length ? `Ajouter ${plural(cards.length, 'carte', 'cartes')}` : 'Ajouter';
    if (!bulk.value.trim()) bulkInfo.textContent = '';
    else if (!cards.length) bulkInfo.textContent = 'Aucune carte reconnue : vérifie le séparateur entre question et réponse.';
    else bulkInfo.textContent = plural(cards.length, 'carte reconnue', 'cartes reconnues')
      + (skipped.length ? `, ${plural(skipped.length, 'ligne ignorée', 'lignes ignorées')}` : '');
  });

  bulkBtn.addEventListener('click', () => {
    const { cards } = parsePaste(bulk.value);
    if (!cards.length) return;
    draft.cards = draft.cards.filter((c) => c.q.trim() || c.a.trim()); // retire les cartes vides
    for (const c of cards) draft.cards.push({ id: uid(), q: c.q, a: c.a });
    bulk.value = '';
    bulk.dispatchEvent(new Event('input'));
    markDirty();
    renderCards();
    toast(plural(cards.length, 'carte ajoutée', 'cartes ajoutées'));
  });

  /* --- boutons --- */
  $('#add-card', root).addEventListener('click', addCard);
  onClick(root, '[data-back]', () => go('home'));
  onClick(root, '[data-cancel]', () => go('home'));
  onClick(root, '[data-save]', () => {
    for (const c of draft.cards) {
      c.q = c.q.trim();
      c.a = c.a.trim();
    }
    draft.cards = draft.cards.filter((c) => c.q || c.a);

    const incomplete = draft.cards.filter((c) => !c.q || !c.a);
    if (incomplete.length) {
      renderCards();
      for (const c of incomplete) $(`[data-id="${c.id}"]`, list)?.classList.add('invalid');
      $('.edit-card.invalid', list)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast(incomplete.length > 1 ? `${incomplete.length} cartes sont incomplètes` : 'Une carte est incomplète');
      return;
    }

    draft.name = draft.name.trim() || 'Sans titre';
    store.saveDeck(draft);
    dirty = false;
    setLeaveGuard(null);
    show('home');
    toast('Deck enregistré');
  });

  renderCards();
  if (!original) $('#f-name', root).focus();
}
