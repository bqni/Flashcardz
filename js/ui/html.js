/* Petit moteur de gabarits : html`<p>${texte}</p>`.
   Tout ce qui est inséré est échappé automatiquement (pas de faille si une carte contient du HTML),
   sauf ce qui vient déjà de html`` ou de raw(). Les tableaux sont collés bout à bout,
   et null / false / undefined n'affichent rien, ce qui permet ${condition && html`…`}. */

class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function render(value) {
  if (value == null || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < values.length) out += render(values[i]);
  });
  return new SafeHtml(out);
}

/* Pour du HTML de confiance écrit dans le code (icônes SVG). */
export const raw = (markup) => new SafeHtml(markup);

/* Remplace le contenu d'un élément par un gabarit (ou une liste de gabarits). */
export function mount(el, template) {
  el.innerHTML = render(template);
  return el;
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* Branche un clic sur chaque élément qui correspond. */
export function onClick(root, selector, handler) {
  $$(selector, root).forEach((el) => el.addEventListener('click', (e) => handler(el, e)));
}
