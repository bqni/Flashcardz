/* Ce que l'appli sait de l'endroit où elle tourne. */

/* Aperçu intégré (iframe, page claude.ai) : pas de service worker, pas de partage natif. */
export const isEmbedded = (() => {
  try {
    return window.self !== window.top || /claude/.test(location.hostname);
  } catch {
    return true;
  }
})();

export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* Lancée depuis l'écran d'accueil (appli installée). */
export const isInstalled = window.matchMedia('(display-mode: standalone)').matches
  || navigator.standalone === true;

export const canSpeak = 'speechSynthesis' in window;
export const canNativeShare = typeof navigator.share === 'function' && !isEmbedded;
