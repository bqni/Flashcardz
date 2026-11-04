/* Icônes SVG (trait de 2px, couleur du texte). Pour en ajouter une : un chemin dans un viewBox 24×24. */

import { raw } from './html.js';

const stroke = (paths) => raw(
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>'
);

export const icons = {
  back: stroke('<path d="M15 18l-6-6 6-6"/>'),
  close: stroke('<path d="M6 6l12 12M18 6L6 18"/>'),
  settings: stroke('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  plus: stroke('<path d="M12 5v14M5 12h14"/>'),
  more: raw('<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>'),
  speak: stroke('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M19 6a8.5 8.5 0 010 12"/>'),
  share: stroke('<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>'),
  undo: stroke('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>'),
  trash: stroke('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  edit: stroke('<path d="M4 20h4L19 9l-4-4L4 16v4z"/>'),
  download: stroke('<path d="M12 3v12M8 11l4 4 4-4M5 21h14"/>'),
  upload: stroke('<path d="M12 15V3M8 7l4-4 4 4M5 21h14"/>'),
  play: stroke('<path d="M7 5l12 7-12 7V5z"/>'),
  practice: stroke('<path d="M20 12a8 8 0 11-2.3-5.6M20 4v4h-4"/>'),
  reset: stroke('<path d="M4 12a8 8 0 102.3-5.6M4 4v4h4"/>'),
  copy: stroke('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>')
};

/* Logo : deux fiches bristol empilées. */
export const brandMark = raw(
  '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">' +
  '<rect x="7" y="4" width="22" height="15" rx="2" fill="var(--rule-blue)"/>' +
  '<rect x="3" y="11" width="22" height="16" rx="2" fill="var(--card)" stroke="var(--ink)" stroke-width="1.6"/>' +
  '<path d="M3 16h22" stroke="var(--rule-red)" stroke-width="1.6"/>' +
  '<path d="M7 20.5h14M7 23.5h9" stroke="var(--rule-blue)" stroke-width="1.4" stroke-linecap="round"/>' +
  '</svg>'
);
