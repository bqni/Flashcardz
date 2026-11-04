/* Répétition espacée : la méthode des boîtes de Leitner.
   Boîte 0 = carte nouvelle (jamais vue).
   Boîtes 1 à 5 = la carte revient après INTERVALS[boîte] jours.
   Sue → boîte suivante. Ratée → retour en boîte 1, à revoir tout de suite.
   Boîte 5 = maîtrisée. Aucun accès au DOM ici : tout est testable. */

export const INTERVALS = [0, 1, 2, 4, 8, 16];
export const MAX_BOX = 5;

/* Numéro du jour (jours depuis 1970), basé sur la date locale. */
export function dayNumber(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
}

export function blankProgress() {
  return { b: 0, d: 0, n: 0, l: 0 }; // boîte, jour de la prochaine révision, vues, ratées
}

/* Nouvel état d'une carte après une réponse.
   lapsedThisSession : déjà ratée pendant cette session. Même réussie ensuite,
   elle repart doucement (boîte 1, demain) au lieu de monter d'un coup. */
export function schedule(prog, ok, today, lapsedThisSession = false) {
  const p = { ...blankProgress(), ...prog };
  p.n += 1;
  if (ok) {
    p.b = lapsedThisSession ? 1 : Math.min(MAX_BOX, Math.max(p.b, 1) + 1);
    p.d = today + INTERVALS[p.b];
  } else {
    p.l += 1;
    p.b = 1;
    p.d = today;
  }
  return p;
}

export function deckStats(deck, progress = {}, today) {
  const boxes = [0, 0, 0, 0, 0, 0];
  let due = 0;
  let nextDue = Infinity;
  for (const card of deck.cards) {
    const p = progress[card.id];
    const box = p ? p.b : 0;
    boxes[box] += 1;
    if (box > 0) {
      if (p.d <= today) due += 1;
      else nextDue = Math.min(nextDue, p.d);
    }
  }
  return {
    total: deck.cards.length,
    fresh: boxes[0],
    due,
    mastered: boxes[MAX_BOX],
    boxes,
    nextDue: nextDue === Infinity ? null : nextDue
  };
}

export function shuffle(list, rand = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* File d'une session : d'abord les cartes en retard (boîtes basses en priorité),
   puis des nouvelles, dans la limite demandée (0 = pas de limite). Puis mélange. */
export function buildQueue(deck, progress = {}, today, limit = 0, rand = Math.random) {
  const due = [];
  const fresh = [];
  for (const card of deck.cards) {
    const p = progress[card.id];
    if (!p || !p.b) fresh.push(card.id);
    else if (p.d <= today) due.push({ id: card.id, b: p.b, d: p.d });
  }
  due.sort((x, y) => x.b - y.b || x.d - y.d);

  const max = limit > 0 ? limit : Infinity;
  const picked = due.map((x) => x.id).slice(0, max);
  for (const id of shuffle(fresh, rand)) {
    if (picked.length >= max) break;
    picked.push(id);
  }
  return shuffle(picked, rand);
}

/* L'ancienne appli notait les cartes de 0 à 3. 0 → nouvelle, 1 → boîte 2, 2 → boîte 3,
   3 → boîte 4. Tout est à revoir aujourd'hui pour repartir sur de bonnes bases. */
export function legacyLevelToProgress(level, today) {
  if (!level) return null;
  return { b: Math.min(MAX_BOX, level + 1), d: today, n: level, l: 0 };
}
