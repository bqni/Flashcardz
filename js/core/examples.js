/* Decks d'exemple créés au tout premier lancement (marqués "Exemple", supprimables). */

import { DECK_COLORS } from './config.js';
import { uid } from './ids.js';

const CAPITALS = [
  ['France', 'Paris'], ['Allemagne', 'Berlin'], ['Espagne', 'Madrid'], ['Italie', 'Rome'],
  ['Portugal', 'Lisbonne'], ['Belgique', 'Bruxelles'], ['Pologne', 'Varsovie'], ['Suède', 'Stockholm'],
  ['Grèce', 'Athènes'], ['Autriche', 'Vienne']
];

const HOUSE_WORDS = [
  ['la cuisine', 'the kitchen'], ['la chambre', 'the bedroom'], ['la salle de bain', 'the bathroom'],
  ['le salon', 'the living room'], ['le jardin', 'the garden'], ['la fenêtre', 'the window'],
  ['la porte', 'the door'], ["l'escalier", 'the stairs']
];

function deck(name, color, langA, cards) {
  return {
    id: uid(),
    name,
    color,
    langQ: 'fr-FR',
    langA,
    example: true,
    created: Date.now(),
    updated: Date.now(),
    cards: cards.map(([q, a]) => ({ id: uid(), q, a }))
  };
}

export function exampleData(today) {
  const capitals = deck(
    "Capitales d'Europe",
    DECK_COLORS[0],
    'fr-FR',
    CAPITALS.map(([country, city]) => ['Quelle est la capitale de ce pays ?\n' + country, city])
  );
  const english = deck('Anglais · la maison', DECK_COLORS[3], 'en-GB', HOUSE_WORDS);

  /* Un peu de progression sur le premier deck, pour que l'accueil montre les boîtes. */
  const plan = [[2, today], [2, today], [1, today], [3, today + 2], [3, today + 3], [5, today + 12]];
  const progress = { [capitals.id]: {} };
  plan.forEach(([b, d], i) => {
    progress[capitals.id][capitals.cards[i].id] = { b, d, n: 2, l: 0 };
  });

  return { decks: [capitals, english], progress };
}
