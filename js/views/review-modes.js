/* Les trois façons de répondre pendant une révision. Chacune remplit la zone sous la carte.
   ctx (fourni par review.js) :
     sides       : { front, back, … } textes de la carte
     isFlipped() : la carte montre-t-elle la réponse ?
     flip()      : retourne la carte (mode Retourner)
     reveal()    : montre la réponse (modes Écrire et QCM)
     grade(ok)   : enregistre la réponse et passe à la carte suivante */

import { checkTyped, normalize } from '../core/answers.js';
import { html, mount, $, $$ } from '../ui/html.js';
import { sound } from '../ui/feedback.js';

/* ---------- Retourner : on se teste dans sa tête, puis on dit si on savait ---------- */
export function flipMode(zone, ctx) {
  if (!ctx.isFlipped()) {
    mount(zone, html`
      <button class="btn primary big block" data-flip>Voir la réponse</button>
      <p class="keys">Espace pour retourner</p>
    `);
    $('[data-flip]', zone).addEventListener('click', ctx.flip);
    return;
  }
  mount(zone, html`
    <div class="grade">
      <button class="btn ko" data-grade="0">Je ne savais pas<small>revient vite</small></button>
      <button class="btn ok" data-grade="1">Je savais<small>boîte suivante</small></button>
    </div>
    <p class="keys">← ou 1 : je ne savais pas · → ou 2 : je savais · ou fais glisser la carte</p>
  `);
  $$('[data-grade]', zone).forEach((b) => b.addEventListener('click', () => ctx.grade(b.dataset.grade === '1')));
}

/* ---------- Écrire : la réponse tapée est corrigée, petites fautes tolérées ---------- */
const TYPED_MESSAGES = {
  exact: "Bravo, c'est juste !",
  close: 'Presque ! Petite faute, on compte juste.',
  wrong: 'Pas tout à fait.',
  skipped: 'Pas grave, la voici.'
};

function typedVerdict(zone, ctx, result, given) {
  const ok = result === 'exact' || result === 'close';
  ctx.reveal();
  if (ok) sound.right(); else sound.wrong();

  mount(zone, html`
    <div class="verdict ${ok ? 'ok' : 'ko'}">
      ${TYPED_MESSAGES[given ? result : 'skipped']}
      ${result !== 'exact' && html`
        <span class="expected">
          ${given && html`Tu as écrit : <span class="pre">${given}</span><br>`}
          Réponse : <span class="pre">${ctx.sides.back}</span>
        </span>`}
    </div>
    <div class="row">
      ${given && html`<button class="btn" data-override>${ok ? 'Compter faux' : "En fait, j'avais bon"}</button>`}
      <button class="btn primary" data-next>Suivante</button>
    </div>
    <p class="keys">Entrée pour continuer</p>
  `);
  const next = $('[data-next]', zone);
  next.addEventListener('click', () => ctx.grade(ok));
  $('[data-override]', zone)?.addEventListener('click', () => ctx.grade(!ok));
  next.focus();
}

export function typeMode(zone, ctx) {
  mount(zone, html`
    <form class="answer-zone" autocomplete="off">
      <label class="sr-only" for="typed">Ta réponse</label>
      <input id="typed" class="input" placeholder="Écris ta réponse"
        autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done">
      <div class="row">
        <button type="button" class="btn" data-skip>Je ne sais pas</button>
        <button type="submit" class="btn primary">Valider</button>
      </div>
    </form>
  `);
  const input = $('#typed', zone);
  setTimeout(() => input.focus(), 50);

  $('[data-skip]', zone).addEventListener('click', () => typedVerdict(zone, ctx, 'wrong', ''));
  $('form', zone).addEventListener('submit', (e) => {
    e.preventDefault();
    const given = input.value.trim();
    if (!given) { input.focus(); return; }
    typedVerdict(zone, ctx, checkTyped(given, ctx.sides.back), given);
  });
}

/* ---------- QCM : 4 propositions tirées du deck ---------- */
export function qcmMode(zone, ctx, choices) {
  const correct = normalize(ctx.sides.back);
  let answered = false;

  mount(zone, html`
    <div class="choices">
      ${choices.map((text, i) => html`
        <button class="choice" data-i="${i}"><span class="k">${i + 1}</span><span>${text}</span></button>
      `)}
    </div>
    <p class="keys">Touches 1 à 4</p>
  `);

  $$('.choice', zone).forEach((btn) => btn.addEventListener('click', () => {
    if (answered) return;
    answered = true;
    const ok = normalize(choices[Number(btn.dataset.i)]) === correct;

    for (const b of $$('.choice', zone)) {
      b.disabled = true;
      if (normalize(choices[Number(b.dataset.i)]) === correct) b.classList.add('right');
    }
    if (!ok) btn.classList.add('wrong');
    ctx.reveal();
    if (ok) sound.right(); else sound.wrong();

    zone.insertAdjacentHTML('beforeend', String(html`
      <button class="btn primary big block" data-next>${ok ? 'Bien joué, suivante' : 'Suivante'}</button>
    `));
    const next = $('[data-next]', zone);
    next.addEventListener('click', () => ctx.grade(ok));
    next.focus();
  }));
}

/* Touches 1 à 4 en mode QCM. */
export function pressChoice(zone, key) {
  const btn = $(`.choice[data-i="${Number(key) - 1}"]`, zone);
  if (btn && !btn.disabled) btn.click();
}
