/* Point d'entrée : charge les données, enregistre les écrans, démarre l'appli. */

import * as store from './core/store.js';
import { register, show, hasUnsavedChanges } from './router.js';
import { applyAppearance } from './ui/appearance.js';
import { warmUpVoices } from './ui/feedback.js';
import { isEmbedded } from './ui/env.js';
import { toast } from './ui/toast.js';
import { renderHome } from './views/home.js';
import { renderEditor } from './views/editor.js';
import { enterReview } from './views/review.js';
import { renderSummary } from './views/summary.js';
import { renderSettings } from './views/settings.js';
import { checkSharedLink } from './views/share.js';

/* ---------- Écrans ---------- */
register('home', renderHome);
register('edit', renderEditor);
register('review', enterReview);
register('summary', renderSummary);
register('settings', renderSettings);

/* ---------- Données et apparence ---------- */
store.onSaveError(() => toast("Impossible d'enregistrer sur cet appareil"));
store.load();
applyAppearance();

/* ---------- Premier affichage ---------- */
show('home');
checkSharedLink();
window.addEventListener('hashchange', checkSharedLink);

/* ---------- Confort ---------- */
warmUpVoices();

window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges()) {
    e.preventDefault();
    e.returnValue = '';
  }
});

/* Demande au navigateur de ne pas effacer les données (surtout utile sur iPhone). */
navigator.storage?.persist?.().catch(() => {});

/* Fonctionnement hors ligne (seulement sur le vrai site, pas dans un aperçu). */
if ('serviceWorker' in navigator && location.protocol === 'https:' && !isEmbedded) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
