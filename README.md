# Flashcardz

Appli de révision par flashcards, avec la méthode des boîtes de Leitner.
Elle marche dans le navigateur, sur ordinateur comme sur téléphone, s'installe sur l'écran d'accueil
et fonctionne hors ligne. Aucune donnée n'est envoyée en ligne : tout reste sur l'appareil.

## Ce qu'elle fait

- **Révision espacée** : chaque carte sue monte d'une boîte et revient plus tard
  (boîte 1 demain, 2 dans 2 jours, 3 dans 4 jours, 4 dans 8 jours, 5 dans 16 jours).
  Une carte ratée revient en boîte 1 et repasse quelques cartes plus loin dans la même session.
- **3 façons de répondre** : retourner la carte, écrire la réponse (petites fautes et accents tolérés), QCM.
- **Sens au choix** : question → réponse, réponse → question, ou mélangé.
- **Import rapide** : coller une liste `question ; réponse` (marche aussi avec un copier-coller depuis Excel, Anki ou Quizlet),
  ou un fichier. Les decks `.json` de l'ancienne appli Python sont repris, avec leur progression.
- **Partage** : lien ou QR code. La personne récupère une copie du deck, sans la progression.
- **Accessibilité** : 4 tailles de texte, polices Atkinson Hyperlegible ou Lexend, texte aéré,
  lecture à voix haute (avec la langue de chaque côté de la carte), raccourcis clavier, glisser la carte sur téléphone,
  animations désactivables.
- **Sauvegarde complète** à exporter et restaurer (pour changer d'appareil).

## Mettre en ligne (GitHub Pages)

1. Mets tous les fichiers à la racine du dépôt (garde les dossiers tels quels).
2. Sur GitHub : **Settings → Pages → Source : Deploy from a branch → `main` / `/ (root)`**.
3. Après une minute, l'appli est en ligne sur `https://bqni.github.io/Flashcardz/`.

Si l'adresse change, mets-la à jour dans `js/core/config.js` (`SITE_URL`) : elle sert aux liens de partage.

**À chaque mise à jour**, change `CACHE_VERSION` dans `sw.js`, sinon les téléphones gardent l'ancienne version en cache.

## Tester sur ton ordinateur

Les modules JavaScript ne marchent pas en ouvrant `index.html` directement (double-clic).
Lance un petit serveur dans le dossier :

```
python3 -m http.server 8000
```

puis ouvre http://localhost:8000.

Tests de la logique (Node.js 20 ou plus) :

```
npm test
```

## Comment le code est rangé

```
index.html              la page (vide), charge les styles et js/main.js
manifest.webmanifest    nom, icônes et couleurs de l'appli installée
sw.js                   cache hors ligne (liste de tous les fichiers)
icons/                  icônes de l'appli

css/
  tokens.css            couleurs, polices, thème clair/sombre : tout part d'ici
  base.css              page, colonne, titres, barre du haut, utilitaires
  components.css        boutons, champs, interrupteurs, fenêtres, toast
  home.css              accueil (decks en intercalaires, barre des boîtes)
  editor.css            éditeur de deck
  review.css            carte de révision (fiche bristol), réponses, bilan
  settings.css          réglages

js/
  main.js               démarrage : charge les données, enregistre les écrans
  router.js             passage d'un écran à l'autre
  core/                 la logique, sans affichage (testée dans tests/)
    config.js           constantes : couleurs des decks, langues, tailles, réglages par défaut
    leitner.js          boîtes de Leitner : planning, statistiques, file de révision
    answers.js          correction des réponses écrites, choix du QCM
    parsing.js          lecture des imports (texte collé, JSON, ancien format)
    share-codec.js      encodage d'un deck dans un lien
    store.js            données sauvegardées dans le navigateur, et toutes les modifications
    examples.js         decks d'exemple du premier lancement
    ids.js              identifiants uniques
  ui/                   outils d'affichage
    html.js             gabarits html`…` (le texte est échappé automatiquement)
    icons.js            icônes SVG
    dialog.js           fenêtres et confirmations
    toast.js            petits messages
    feedback.js         sons et voix
    appearance.js       applique thème, taille, police
    format.js           pluriels, dates, noms de fichiers
    files.js            télécharger, copier, lire un fichier
    swipe.js            glisser la carte
    env.js              téléphone, appli installée, aperçu
  views/                un fichier par écran ou fenêtre
    home.js             accueil
    deck-menu.js        menu « … » d'un deck
    editor.js           créer / modifier un deck
    start-sheet.js      choix avant une révision
    review.js           révision (déroulé, annulation, clavier)
    review-modes.js     les 3 façons de répondre
    summary.js          bilan
    share.js            partage, export, réception d'un lien
    import.js           import
    settings.js         réglages

tests/logic.test.mjs    tests de js/core
```

## Modifier des choses courantes

- **Ajouter une langue pour la voix** : une ligne dans `LANGS` (`js/core/config.js`).
- **Changer les délais des boîtes** : `INTERVALS` dans `js/core/leitner.js`. Le texte des réglages suit tout seul.
- **Changer les couleurs** : `css/tokens.css` (les deux thèmes sont dedans).
- **Ajouter un écran** : un fichier dans `js/views/` qui exporte une fonction d'affichage,
  puis `register('nom', fonction)` dans `js/main.js`, et `go('nom')` pour y aller.
  Pense à l'ajouter dans `FILES` de `sw.js`.

## Formats acceptés à l'import

| Format | Exemple |
|---|---|
| Texte, une carte par ligne | `Révolution française ; 1789` (aussi `\|`, `=`, `->`, tabulation) |
| CSV | `question,réponse` |
| Ancienne appli Python | `[["question", "réponse", 2], …]` |
| Deck exporté | `{"format": "flashcardz", "deck": {…}}` |
| Sauvegarde complète | `{"format": "flashcardz-backup", …}` |

Dans le texte collé, `\n` devient un retour à la ligne, et une réponse `chat / matou` accepte les deux en mode Écrire.
