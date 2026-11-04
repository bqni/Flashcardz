/* Partager un deck (lien + QR code), l'exporter, et recevoir un deck partagé. */

import * as store from '../core/store.js';
import { SITE_URL, QR_MAX_LENGTH, QR_LIB_URL } from '../core/config.js';
import { encodeShare, decodeShare } from '../core/share-codec.js';
import { html, mount, $ } from '../ui/html.js';
import { icons } from '../ui/icons.js';
import { plural, slug } from '../ui/format.js';
import { isEmbedded, canNativeShare } from '../ui/env.js';
import { openDialog } from '../ui/dialog.js';
import { download, copyText } from '../ui/files.js';
import { toast } from '../ui/toast.js';
import { show } from '../router.js';

/* ---------- Export ---------- */
function deckFileContent(deck) {
  return JSON.stringify({
    format: 'flashcardz',
    version: 2,
    exported: new Date().toISOString(),
    deck: {
      name: deck.name,
      color: deck.color,
      langQ: deck.langQ,
      langA: deck.langA,
      cards: deck.cards.map(({ q, a }) => ({ q, a }))
    }
  }, null, 2);
}

/* Même format que l'import par copier-coller. */
function deckAsText(deck) {
  const line = (t) => t.replace(/\n/g, '\\n');
  return deck.cards.map((c) => `${line(c.q)} ; ${line(c.a)}`).join('\n');
}

export function openExport(deckId) {
  const deck = store.deckById(deckId);
  if (!deck) return;

  const body = html`
    <div class="menu-list">
      <button data-file>${icons.download}Télécharger le fichier (.json)</button>
      <button data-text>${icons.copy}Copier en texte (question ; réponse)</button>
    </div>
    <p class="hint">
      Le fichier se réimporte ici ou sur un autre appareil.
      Le texte se colle dans un document ou dans l'import d'un autre deck.
    </p>
  `;
  openDialog(`Exporter « ${deck.name} »`, body, (dlg) => {
    $('[data-file]', dlg).addEventListener('click', () => download(`${slug(deck.name)}.json`, deckFileContent(deck)));
    $('[data-text]', dlg).addEventListener('click', () => copyText(deckAsText(deck), plural(deck.cards.length, 'carte copiée', 'cartes copiées')));
  });
}

/* ---------- Lien + QR code ---------- */
function shareBaseUrl() {
  if (!isEmbedded && /^https?:$/.test(location.protocol)) return location.origin + location.pathname;
  return SITE_URL;
}

let qrLibrary = null;
function loadQrLibrary() {
  if (window.QRCode) return Promise.resolve();
  if (!qrLibrary) {
    qrLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = QR_LIB_URL;
      script.onload = resolve;
      script.onerror = () => { qrLibrary = null; reject(new Error('QR indisponible')); };
      document.head.appendChild(script);
    });
  }
  return qrLibrary;
}

function qrMessage(box, text) {
  mount(box, html`<p class="qr-msg">${text}</p>`);
}

async function drawQr(box, link) {
  try {
    await loadQrLibrary();
  } catch {
    qrMessage(box, 'QR code indisponible hors ligne. Le lien marche quand même.');
    return;
  }
  box.innerHTML = '';
  try {
    new window.QRCode(box, {
      text: link,
      width: 240,
      height: 240,
      colorDark: '#1a2440',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.L
    });
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'QR code du lien de partage');
  } catch {
    qrMessage(box, 'Deck trop long pour un QR code. Envoie le lien ou le fichier.');
  }
}

export async function openShare(deckId) {
  const deck = store.deckById(deckId);
  if (!deck) return;

  let link;
  try {
    link = `${shareBaseUrl()}#d=${await encodeShare(deck)}`;
  } catch {
    toast('Impossible de créer le lien');
    return;
  }
  const tooLong = link.length > QR_MAX_LENGTH;

  const body = html`
    <p class="muted small">La personne qui ouvre le lien récupère une copie du deck, sans ta progression.</p>
    <div class="qr" id="qr"><p class="qr-msg">${tooLong ? 'Deck trop long pour un QR code. Envoie le lien ou le fichier.' : 'Création du QR code…'}</p></div>
    <div class="linkbox">${link}</div>
    <div class="row">
      <button class="btn primary" data-copy>${icons.copy}Copier le lien</button>
      ${canNativeShare && html`<button class="btn" data-native>${icons.share}Envoyer…</button>`}
    </div>
  `;

  openDialog(`Partager « ${deck.name} »`, body, (dlg) => {
    $('[data-copy]', dlg).addEventListener('click', () => copyText(link, 'Lien copié'));
    $('[data-native]', dlg)?.addEventListener('click', () => {
      navigator.share({ title: deck.name, text: `Deck Flashcardz : ${deck.name}`, url: link }).catch(() => {});
    });
    if (!tooLong) drawQr($('#qr', dlg), link);
  });
}

/* ---------- Réception d'un lien …#d=… ---------- */
function clearHash() {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    try { location.hash = ''; } catch { /* rien */ }
  }
}

export async function checkSharedLink() {
  const hash = location.hash || '';
  if (!hash.startsWith('#d=')) return;

  let deck;
  try {
    deck = await decodeShare(hash.slice(3));
  } catch {
    toast('Ce lien de partage est abîmé');
    clearHash();
    return;
  }
  clearHash();
  if (!deck.cards.length) return;

  const body = html`
    <p><b>${deck.name}</b> · ${plural(deck.cards.length, 'carte', 'cartes')}</p>
    <div class="missed"><ul>
      ${deck.cards.slice(0, 3).map((c) => html`<li><b>${c.q}</b><span>${c.a}</span></li>`)}
    </ul></div>
    <div class="row">
      <button class="btn" data-close>Non merci</button>
      <button class="btn primary" data-add>Ajouter à mes decks</button>
    </div>
  `;
  openDialog("On t'a partagé un deck", body, (dlg) => {
    $('[data-add]', dlg).addEventListener('click', () => {
      const added = store.addImportedDeck(deck);
      dlg.close();
      show('home');
      toast(`« ${added.name} » ajouté`);
    });
  });
}
