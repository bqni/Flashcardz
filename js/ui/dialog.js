/* Fenêtres par-dessus la page (<dialog>), et fenêtre de confirmation.
   Les alert()/confirm() du navigateur ne sont pas utilisés : bloqués dans certains contextes,
   et impossibles à mettre en forme. */

import { html, mount, $, $$ } from './html.js';
import { icons } from './icons.js';

/* Ouvre une fenêtre avec un titre. Tout bouton [data-close] la ferme.
   setup(dialog) branche les boutons. Renvoie l'élément <dialog>. */
export function openDialog(title, body, setup) {
  const dlg = document.createElement('dialog');
  mount(dlg, html`
    <div class="dlg">
      <div class="dlg-head">
        <h2>${title}</h2>
        <button class="icon-btn" data-close aria-label="Fermer">${icons.close}</button>
      </div>
      ${body}
    </div>
  `);
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // clic à côté
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));

  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
  if (setup) setup(dlg);
  return dlg;
}

/* Demande une confirmation. Renvoie une promesse : true si la personne confirme. */
export function confirmBox({ title, text, ok, danger = false }) {
  return new Promise((resolve) => {
    let answer = false;
    const body = html`
      <p>${text}</p>
      <div class="row">
        <button class="btn" data-close>Annuler</button>
        <button class="btn ${danger ? 'ko' : 'primary'}" data-yes>${ok}</button>
      </div>
    `;
    const dlg = openDialog(title, body, (d) => {
      const yes = $('[data-yes]', d);
      yes.addEventListener('click', () => { answer = true; d.close(); });
      yes.focus();
    });
    dlg.addEventListener('close', () => resolve(answer));
  });
}
