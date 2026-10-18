# 💧 Peez — Private Period Tracker

**Live app:** [**https://mkarian2.github.io/peez/**](https://mkarian2.github.io/peez/)

Peez is a private, offline-first period tracker Progressive Web App (PWA) for Android and desktop.

---

## Privacy & Security

Although this repository and the web app link are public, **your data is completely private to your own devices**:

- **No accounts, no servers, no database:** GitHub Pages only hosts the static app code. Nothing you enter is ever sent to GitHub or any server.
- **Encrypted on your device:** Every entry is encrypted at rest inside your browser's local storage (`IndexedDB`) using **AES-256-GCM** (`WebCrypto`). Even record IDs (dates) are HMAC-hashed.
- **PIN + Biometrics:** Your vault is unlocked with a PIN (derived via **PBKDF2-SHA256** with 600,000 iterations) and optionally fingerprint / Windows Hello via **WebAuthn PRF**.
- **End-to-end encrypted device sync:** You can pair your phone and computer once with a QR code. Devices sync directly peer-to-peer over WebRTC using an additional encryption key derived from your private QR secret.

> **Disclaimer:** Predictions are estimates based on logged history. **Peez must not be used as contraception** and is not a medical device.

---

## Features

- **Daily logging:** Period days, flow intensity (spotting, light, medium, heavy), symptoms, moods, and free-text notes.
- **Calendar & predictions:** Monthly view highlighting logged periods, predicted periods, fertile windows, and estimated ovulation days.
- **Statistics:** Average cycle & period lengths, cycle-to-cycle variation, cycle history chart, and most frequent symptoms.
- **Doctor & backup exports:** Export a clean **PDF summary** for a doctor, a **CSV spreadsheet**, or a password-encrypted `.peez` backup file.

---

## How to Install

### Android (Chrome)
1. Open [**https://mkarian2.github.io/peez/**](https://mkarian2.github.io/peez/) in the **Chrome** app (if you tapped the link inside a messaging app, tap **⋮ → Open in Chrome** first).
2. Tap the three-dot menu (**⋮**) in the top-right corner → **Add to Home screen** → **Install** (or **Create shortcut**).
   - *Note for Google Pixel:* If the icon doesn't appear on the main home screen after a few seconds, swipe up from the bottom of the screen to find **Peez** in your **App Drawer**, or choose **Create shortcut**.
3. Open **Peez**, choose a PIN, and **save your recovery code** in a safe place.

### Windows / macOS / Linux (Chrome or Edge)
1. Open [**https://mkarian2.github.io/peez/**](https://mkarian2.github.io/peez/) in **Chrome** or **Edge**.
2. Click the **Install Peez** icon on the right side of the address bar.
3. Open **Peez**, choose a PIN, and save your recovery code.

---

## Syncing Between Phone & Laptop

### 1. Pair your devices once
1. On your **laptop**, open Peez → **Settings** → **Sync between devices** → click **Show pairing code**.
2. On your **phone**, open Peez → **Settings** → **Sync between devices** → tap **Scan pairing code** and scan the QR code on your laptop screen (or copy and paste the `PEEZ1:...` code).

### 2. Sync anytime
1. Open Peez on **both** devices.
2. Go to **Settings** and tap **🔄 Sync now** on both within 2 minutes of each other.
3. Your devices connect directly and merge changes automatically (the latest edit for each day wins).

### Offline / File Sync Fallback
If you want to transfer data without internet access, go to **Settings → Your data → Create encrypted backup** on one device, send the `.peez` file to the other device, and select **Restore / merge a backup**.

---

## Local Development

```bash
npm install
npm run dev      # Start local dev server
npm test         # Run unit tests (Vitest)
npm run build    # Type-check & build production PWA into dist/
```
