/* Constantes de l'appli. Pour changer une couleur de deck, une langue ou une taille, c'est ici. */

export const VERSION = '2.0.0';

/* Adresse publique, utilisée pour les liens de partage quand l'appli tourne ailleurs (aperçu). */
export const SITE_URL = 'https://bqni.github.io/Flashcardz/';

/* Clé de stockage dans le navigateur. Changer la clé = repartir de zéro. */
export const STORAGE_KEY = 'flashcardz:v2';

/* Couleurs proposées pour les decks (onglet de l'intercalaire). */
export const DECK_COLORS = ['#2445ad', '#c03f2b', '#1d8656', '#d08a1a', '#7a3fb0', '#1f8ca0'];

/* Langues pour la lecture à voix haute : [code, nom affiché]. */
export const LANGS = [
  ['fr-FR', 'Français'],
  ['en-GB', 'Anglais'],
  ['de-DE', 'Allemand'],
  ['es-ES', 'Espagnol'],
  ['it-IT', 'Italien'],
  ['pt-PT', 'Portugais'],
  ['ar-SA', 'Arabe']
];

/* Tailles de texte : [multiplicateur, nom affiché]. */
export const TEXT_SIZES = [
  [1, 'Normal'],
  [1.15, 'Grand'],
  [1.3, 'Très grand'],
  [1.5, 'Énorme']
];

export const DEFAULT_SETTINGS = {
  theme: 'auto',      // auto | light | dark
  size: 1,            // voir TEXT_SIZES
  font: 'atkinson',   // atkinson | lexend | system
  airy: false,        // interlignage et espacement des lettres plus grands
  anim: true,         // carte qui se retourne en douceur
  sound: false,
  autoSpeak: false,   // lit chaque carte à voix haute
  rate: 1             // vitesse de la voix
};

export const DEFAULT_SESSION = {
  mode: 'flip',       // flip (retourner) | type (écrire) | qcm
  dir: 'qa',          // qa | aq | mix
  count: 20           // 0 = toutes
};

/* Au-delà, le lien de partage ne tient plus dans un QR code lisible. */
export const QR_MAX_LENGTH = 2300;

export const QR_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
