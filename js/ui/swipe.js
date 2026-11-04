/* Faire glisser un élément à gauche ou à droite (la carte retournée).
   onSwipe(direction) reçoit 'left' ou 'right'. enabled() dit si le geste est permis maintenant.
   baseTransform : transformation à garder pendant le glissement (la carte est retournée). */

const THRESHOLD = 90; // pixels pour valider

export function attachSwipe(el, { enabled, onSwipe, baseTransform = '' }) {
  let startX = null;
  let startY = null;
  let dx = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    if (!enabled() || e.button > 0) return;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    moved = false;
  });

  el.addEventListener('pointermove', (e) => {
    if (startX === null) return;
    dx = e.clientX - startX;
    const horizontal = Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - startY);
    if (!moved && horizontal) {
      moved = true;
      el.classList.add('dragging');
      try { el.setPointerCapture(e.pointerId); } catch { /* rien */ }
    }
    if (moved) el.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg) ${baseTransform}`;
  });

  const end = () => {
    if (startX === null) return;
    startX = null;
    el.classList.remove('dragging');
    if (moved && Math.abs(dx) > THRESHOLD) onSwipe(dx > 0 ? 'right' : 'left');
    else el.style.transform = '';
    setTimeout(() => { moved = false; }, 0); // le clic qui suit un glissement est ignoré
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  return { wasDragged: () => moved };
}
