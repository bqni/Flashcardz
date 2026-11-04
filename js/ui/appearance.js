/* Applique les réglages d'affichage (thème, taille, police, animations) sur la page. */

import { settings } from '../core/store.js';

let themeSetByApp = false;

export function applyAppearance() {
  const s = settings();
  const root = document.documentElement;

  /* "Auto" suit le téléphone. On ne retire l'attribut que si c'est nous qui l'avons posé. */
  if (s.theme === 'light' || s.theme === 'dark') {
    root.setAttribute('data-theme', s.theme);
    themeSetByApp = true;
  } else if (themeSetByApp) {
    root.removeAttribute('data-theme');
    themeSetByApp = false;
  }

  root.style.setProperty('--fs', String(s.size || 1));
  root.classList.toggle('font-lexend', s.font === 'lexend');
  root.classList.toggle('font-system', s.font === 'system');
  root.classList.toggle('airy', !!s.airy);
  root.classList.toggle('no-anim', !s.anim);
}
