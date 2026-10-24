# 💧 Peez — Suivi de règles privé

🇬🇧 [Read in English](README.md) · 🇫🇷 **Français**

**Application en ligne :** [**https://mkarian2.github.io/peez/**](https://mkarian2.github.io/peez/)

Peez est une application web progressive (PWA) privée et fonctionnant hors-ligne pour le suivi du cycle menstruel sur Android et ordinateur.

---

## Confidentialité & Sécurité

Bien que ce dépôt et le lien de l’application soient publics, **vos données restent strictement privées sur vos propres appareils** :

- **Aucun compte, aucun serveur, aucune base de données cloud :** GitHub Pages héberge uniquement le code statique de l’application. Rien de ce que vous saisissez n’est jamais envoyé à GitHub ou à un serveur.
- **Chiffré sur votre appareil :** Chaque entrée est chiffrée au repos dans le stockage local de votre navigateur (`IndexedDB`) avec **AES-256-GCM** (`WebCrypto`). Même les identifiants des dates sont hachés via HMAC.
- **Code PIN + Biométrie :** Votre coffre est déverrouillé par un code PIN (dérivé via **PBKDF2-SHA256** avec 600 000 itérations) et, en option, par empreinte digitale / Windows Hello via **WebAuthn PRF**.
- **Synchronisation chiffrée de bout en bout :** Vous pouvez appairer votre téléphone et votre ordinateur une seule fois à l’aide d’un QR code. Les appareils se synchronisent ensuite directement en pair-à-pair via WebRTC avec une clé de chiffrement supplémentaire dérivée de votre secret d’appairage.

> **Avertissement :** Les prévisions sont des estimations basées sur l’historique enregistré. **Peez ne doit pas être utilisé comme moyen de contraception** et n’est pas un dispositif médical.

---

## Fonctionnalités

- **Suivi quotidien :** Jours de règles, intensité du flux (spotting, léger, moyen, abondant), symptômes, humeur et notes libres.
- **Calendrier & prévisions :** Vue mensuelle mettant en évidence les règles enregistrées, les prochaines règles prévues, la fenêtre de fertilité et le jour d’ovulation estimé.
- **Statistiques :** Durée moyenne du cycle et des règles, variation d’un cycle à l’autre, graphique d’historique et symptômes les plus fréquents.
- **Exports (médecin & sauvegarde) :** Export d’un **bilan PDF** clair pour un médecin, d’un **tableau CSV**, ou d’un fichier de sauvegarde `.peez` chiffré par mot de passe.
- **Bilingue :** Interface disponible en **Français** et en **Anglais** (commutateur `🇬🇧 EN / 🇫🇷 FR` en haut de l’écran ou dans les Réglages).

---

## Comment installer l’application

### Android (Chrome)
1. Ouvrez [**https://mkarian2.github.io/peez/**](https://mkarian2.github.io/peez/) dans l’application **Chrome** (si vous avez ouvert le lien depuis une messagerie comme WhatsApp, appuyez d’abord sur **⋮ → Ouvrir dans Chrome**).
2. Appuyez sur le menu à trois points (**⋮**) en haut à droite → **Ajouter à l’écran d’accueil** → **Installer** (ou **Créer un raccourci**).
   - *Astuce pour Google Pixel :* Si l’icône n’apparaît pas sur l’écran d’accueil principal après quelques secondes, balayez vers le haut depuis le bas de l’écran pour trouver **Peez** dans votre **tiroir d’applications**, ou choisissez **Créer un raccourci**.
3. Ouvrez **Peez**, choisissez un code PIN et **conservez précieusement votre code de récupération**.

### Windows / macOS / Linux (Chrome ou Edge)
1. Ouvrez [**https://mkarian2.github.io/peez/**](https://mkarian2.github.io/peez/) dans **Chrome** ou **Edge**.
2. Cliquez sur l’icône **Installer Peez** à droite de la barre d’adresse.
3. Ouvrez **Peez**, choisissez un code PIN et notez votre code de récupération.

---

## Synchroniser téléphone & ordinateur

### 1. Appairer vos appareils (une seule fois)
1. Sur votre **ordinateur**, ouvrez Peez → **Réglages** → **Synchronisation entre appareils** → cliquez sur **Afficher le code**.
2. Sur votre **téléphone**, ouvrez Peez → **Réglages** → **Synchronisation entre appareils** → appuyez sur **Scanner le code** et visez le QR code affiché sur l’ordinateur (ou copiez/collez le code `PEEZ1:...`).

### 2. Synchroniser au quotidien
1. Ouvrez Peez sur **les deux** appareils.
2. Allez dans **Réglages** et appuyez sur **🔄 Synchroniser** sur chacun dans un intervalle de 2 minutes.
3. Vos appareils se connectent directement et fusionnent les modifications automatiquement (la modification la plus récente pour chaque jour l’emporte).

### Synchronisation hors-ligne par fichier (secours)
Pour transférer vos données sans connexion Internet, allez dans **Réglages → Vos données → Créer une sauvegarde chiffrée** sur un appareil, envoyez le fichier `.peez` sur l’autre appareil, puis choisissez **Restaurer / fusionner une sauvegarde**.

---

## Dépannage

Peez enregistre tout localement dans votre navigateur : il a donc besoin de l’autorisation d’enregistrer des **cookies et données de site** pour `https://mkarian2.github.io`. Sur ordinateur (Windows / macOS / Linux), certains réglages de confidentialité ou outils de nettoyage bloquent ou suppriment ces données, ce qui provoque :

- **Vous devez créer un nouveau code PIN à chaque ouverture de Peez** → le navigateur efface les données de site à sa fermeture.
- **Peez reste bloqué sur « Chargement… »** ou affiche **« Peez ne peut pas enregistrer de données »** → le navigateur bloque les données de site pour ce site.

**Solution :** autorisez les cookies et données de site pour ce site en particulier.

1. Ouvrez [**https://mkarian2.github.io/peez/**](https://mkarian2.github.io/peez/) dans un onglet normal du navigateur.
2. Cliquez sur l’icône à gauche de la barre d’adresse → **Paramètres des sites** (Chrome) / **Autorisations pour ce site** (Edge).
3. Réglez **Cookies et données de site** sur **Autoriser**.
4. Vérifiez aussi que le site n’est pas effacé à la fermeture du navigateur :
   - **Chrome :** `chrome://settings/content/siteData` → ajoutez `https://mkarian2.github.io` dans **Autorisés à enregistrer des données sur votre appareil**.
   - **Edge :** `edge://settings/content/cookies` → ajoutez `https://mkarian2.github.io` dans **Autoriser**.
5. Fermez puis rouvrez Peez (réinstallez-le s’il ne démarre toujours pas).

> [!NOTE]
> Si les données de site ont été effacées, vos saisies sur cet appareil sont perdues. Récupérez-les en synchronisant depuis un autre appareil ou à partir d’une sauvegarde chiffrée (fichier `.peez`).

---

## Développement local

```bash
npm install
npm run dev      # Lancer le serveur de développement
npm test         # Lancer les tests unitaires (Vitest)
npm run build    # Vérifier le typage et compiler la PWA dans dist/
```
