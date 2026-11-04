/* Télécharger un fichier, copier du texte, lire un fichier choisi. */

import { toast } from './toast.js';

export function download(filename, text, mime = 'application/json') {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch {
    toast('Téléchargement impossible ici, utilise Copier');
  }
}

export async function copyText(text, message = 'Copié') {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
    return true;
  } catch {
    toast('Copie bloquée : sélectionne le texte à la main');
    return false;
  }
}

export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
