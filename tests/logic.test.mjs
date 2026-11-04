/* Tests de la logique (sans navigateur). Lancer : node --test tests/ */

import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule, buildQueue, deckStats, legacyLevelToProgress, INTERVALS } from '../js/core/leitner.js';
import { checkTyped, normalize, pickChoices } from '../js/core/answers.js';
import { parsePaste, parseJsonImport } from '../js/core/parsing.js';
import { encodeShare, decodeShare } from '../js/core/share-codec.js';

const T = 20000; // un jour quelconque

test('une carte nouvelle sue passe en boîte 2', () => {
  const p = schedule(undefined, true, T);
  assert.equal(p.b, 2);
  assert.equal(p.d, T + INTERVALS[2]);
});

test('une carte ratée retourne en boîte 1, à revoir tout de suite', () => {
  const p = schedule({ b: 4, d: T, n: 3, l: 0 }, false, T);
  assert.deepEqual([p.b, p.d, p.l], [1, T, 1]);
});

test('ratée puis sue dans la même session : boîte 1, demain', () => {
  const p = schedule({ b: 1, d: T, n: 1, l: 1 }, true, T, true);
  assert.deepEqual([p.b, p.d], [1, T + 1]);
});

test('la boîte 5 est le maximum', () => {
  assert.equal(schedule({ b: 5, d: T }, true, T).b, 5);
});

test('la file prend les cartes en retard puis les nouvelles, sans dépasser la limite', () => {
  const deck = { cards: ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id })) };
  const prog = { a: { b: 2, d: T }, b: { b: 3, d: T + 5 }, c: { b: 1, d: T - 1 } };
  const q = buildQueue(deck, prog, T, 3);
  assert.equal(q.length, 3);
  assert.ok(q.includes('a') && q.includes('c'));
  assert.ok(!q.includes('b'));
  assert.equal(buildQueue(deck, prog, T, 0).length, 4);
});

test('statistiques du deck', () => {
  const deck = { cards: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
  const st = deckStats(deck, { a: { b: 5, d: T + 10 }, b: { b: 2, d: T } }, T);
  assert.deepEqual([st.total, st.fresh, st.due, st.mastered, st.nextDue], [3, 1, 1, 1, T + 10]);
});

test("l'ancien niveau 0..3 devient une boîte", () => {
  assert.equal(legacyLevelToProgress(0, T), null);
  assert.equal(legacyLevelToProgress(3, T).b, 4);
});

test('correction écrite : accents, articles, petites fautes, alternatives', () => {
  assert.equal(checkTyped('athenes', 'Athènes'), 'exact');
  assert.equal(checkTyped('kitchen', 'the kitchen'), 'exact');
  assert.equal(checkTyped('Stokholm', 'Stockholm'), 'close');
  assert.equal(checkTyped('Rom', 'Rome'), 'wrong');
  assert.equal(checkTyped('matou', 'chat / matou'), 'exact');
  assert.equal(checkTyped('', 'Paris'), 'wrong');
  assert.equal(normalize("L'escalier !"), 'escalier');
});

test('QCM : 4 choix dont le bon, ou null si pas assez de cartes', () => {
  const c = pickChoices('Paris', ['Rome', 'Berlin', 'Madrid', 'Paris']);
  assert.equal(c.length, 4);
  assert.ok(c.includes('Paris'));
  assert.equal(pickChoices('Paris', ['Rome', 'rome', 'Paris']), null);
});

test('collage : séparateurs détectés, lignes ignorées', () => {
  const r = parsePaste('1789 ; Révolution\n1989 ; Chute du mur\n# commentaire\n\nligne sans rien');
  assert.equal(r.cards.length, 2);
  assert.equal(r.skipped.length, 1);
  assert.equal(parsePaste('chien\tdog\nchat\tcat').cards[1].a, 'cat');
  assert.equal(parsePaste('a | b\nc | d').cards[0].q, 'a');
  assert.equal(parsePaste('Q ; ligne 1\\nligne 2').cards[0].a, 'ligne 1\nligne 2');
  assert.equal(parsePaste('x,y\nz,w', [',']).cards.length, 2);
});

test("import : format de l'ancienne appli Python", () => {
  const r = parseJsonImport([['Q1', 'R1', 2], ['Q2', 'R2'], ['', 'vide']], 'vieux deck');
  assert.equal(r.kind, 'deck');
  assert.equal(r.legacy, true);
  assert.equal(r.deck.cards.length, 2);
  assert.equal(r.deck.cards[0].level, 2);
  const r2 = parseJsonImport([{ question: 'Q', answer: 'R', level: 1 }]);
  assert.equal(r2.deck.cards[0].a, 'R');
});

test('import : deck exporté et sauvegarde', () => {
  const r = parseJsonImport({ format: 'flashcardz', deck: { name: 'D', cards: [{ q: 'a', a: 'b' }] } });
  assert.equal(r.deck.name, 'D');
  assert.equal(parseJsonImport({ format: 'flashcardz-backup', decks: [] }).kind, 'backup');
  assert.equal(parseJsonImport({ foo: 1 }), null);
});

test('lien de partage : aller-retour', async () => {
  const deck = { name: 'Test « é »', cards: [{ q: 'Quoi ?\nligne', a: 'Ça 🙂' }], langQ: 'fr-FR', langA: 'en-GB', color: '#2445ad' };
  const code = await encodeShare(deck);
  const back = await decodeShare(code);
  assert.equal(back.name, deck.name);
  assert.deepEqual(back.cards, [{ q: 'Quoi ?\nligne', a: 'Ça 🙂' }]);
  assert.equal(back.langA, 'en-GB');
});
