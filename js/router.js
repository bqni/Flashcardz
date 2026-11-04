/* Navigation entre les écrans.
   Chaque écran s'enregistre dans main.js : register('home', renderHome).
   Un écran peut bloquer la sortie (modifications non enregistrées) avec setLeaveGuard,
   et ranger ses affaires en partant avec setCleanup. */

const screens = {};
let leaveGuard = null;
let isDirty = () => false;
let cleanup = null;
let currentName = null;

export const appRoot = () => document.getElementById('app');

export function register(name, render) {
  screens[name] = render;
}

/* fn() → true (ou une promesse de true) si on peut quitter l'écran.
   dirty() → true s'il y a des modifications non enregistrées (pour prévenir avant de fermer l'onglet). */
export function setLeaveGuard(fn, dirty = () => true) {
  leaveGuard = fn;
  isDirty = fn ? dirty : () => false;
}

export function setCleanup(fn) {
  cleanup = fn;
}

export function currentScreen() {
  return currentName;
}

export function hasUnsavedChanges() {
  return !!leaveGuard && isDirty();
}

/* Affiche un écran sans repasser par les gardes (utilisé par un écran pour en enchaîner un autre). */
export function show(name, params = {}) {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  currentName = name;
  window.scrollTo(0, 0);
  screens[name](params);
}

export async function go(name, params = {}) {
  if (leaveGuard) {
    if (!(await leaveGuard())) return;
    setLeaveGuard(null);
  }
  show(name, params);
}
