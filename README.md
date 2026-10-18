# 💧 Peez — Private Period Tracker

Peez is a private, offline-first period tracker Progressive Web App (PWA) for Android (Pixel) and Windows.

- **No accounts, no cloud database:** All data is encrypted at rest in the browser's IndexedDB using AES-256-GCM (`WebCrypto`).
- **PIN + Fingerprint / Windows Hello:** Unlocked with a PIN (PBKDF2, 600,000 iterations) and optionally biometric authentication via WebAuthn PRF.
- **Direct device-to-device sync:** Pair the phone and laptop once via QR code. Synchronization runs directly peer-to-peer over WebRTC (introduced by PeerJS) with an extra end-to-end encryption layer derived from the pairing secret.
- **Full offline support:** Once installed, the app works completely offline.

---

## 1. Deploy to GitHub Pages (one-time setup)

GitHub Pages only serves the static application code over HTTPS so the browser allows installing it as a PWA. **No user data is ever sent to GitHub.**

1. Create a new repository on GitHub (for example `peez` — it can be public on a free account so GitHub Pages is free; the repository only contains the app source code).
2. In your repository on GitHub, go to **Settings → Pages** and under **Build and deployment → Source**, select **GitHub Actions**.
3. Push this folder to your repository:
   ```bash
   git add -A
   git commit -m "Initial commit: Peez PWA"
   git remote add origin https://github.com/<your-username>/peez.git
   git push -u origin main
   ```
4. Wait ~1 minute for the **Deploy to GitHub Pages** action to finish. Your app will be live at:
   `https://<your-username>.github.io/peez/`

*(Notice: the workflow automatically detects your repository name and sets `BASE_PATH` accordingly, so you don't need to hardcode your username anywhere.)*

---

## 2. Install on her devices

### On her Pixel phone
1. Open `https://<your-username>.github.io/peez/` in **Chrome**.
2. Tap the three-dot menu (⋮) in the top-right corner → **Add to Home screen** → **Install**.
3. Open **Peez** from her home screen, choose a PIN, **save the recovery code**, and optionally enable fingerprint unlock.

### On her Windows laptop
1. Open `https://<your-username>.github.io/peez/` in **Chrome** or **Edge**.
2. Click the **Install Peez** icon in the right side of the address bar (computer screen with a down arrow).
3. Launch Peez, choose a PIN, save the recovery code, and optionally enable **Windows Hello**.

---

## 3. Pair & synchronize the two devices

### One-time pairing
1. On her **laptop**, open Peez → **Settings** → **Sync between devices** → click **Show pairing code**.
2. On her **Pixel**, open Peez → **Settings** → **Sync between devices** → tap **Scan pairing code** and point the camera at the laptop screen (or copy/paste the `PEEZ1:...` text code).

### Everyday sync
1. Open Peez on **both** the Pixel and the laptop.
2. Go to **Settings** and tap **🔄 Sync now** on both devices within 2 minutes of each other.
3. Both devices exchange their encrypted records directly and merge them (newest edit per day wins).

### Fallback sync / backups
If she has no internet access or the public matchmaking server is ever unreachable, she can go to **Settings → Your data → Create encrypted backup** on one device, send the `.peez` file to the other device (via Nearby Share, USB, email, etc.), and use **Restore / merge a backup**.

---

## Local development

```bash
npm install
npm run dev      # start local dev server
npm test         # run unit tests (Vitest)
npm run build    # type-check & build production PWA into dist/
```
