import { createContext, useContext } from 'react';
import type { Flow } from './domain/types';

export type Lang = 'en' | 'fr';

const STORAGE_KEY = 'peez-lang';

export function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'fr') return saved;
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr')) {
      return 'fr';
    }
  } catch {
    // ignore storage errors
  }
  return 'en';
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function localeFor(lang: Lang): string {
  return lang === 'fr' ? 'fr-FR' : 'en-GB';
}

export const FLOW_LABELS: Record<Lang, Record<Flow, string>> = {
  en: {
    spotting: 'Spotting',
    light: 'Light',
    medium: 'Medium',
    heavy: 'Heavy',
  },
  fr: {
    spotting: 'Spotting',
    light: 'Léger',
    medium: 'Moyen',
    heavy: 'Abondant',
  },
};

export const SYMPTOM_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    Cramps: 'Cramps',
    Headache: 'Headache',
    Bloating: 'Bloating',
    'Back pain': 'Back pain',
    'Tender breasts': 'Tender breasts',
    Acne: 'Acne',
    Fatigue: 'Fatigue',
    Nausea: 'Nausea',
    Cravings: 'Cravings',
    Insomnia: 'Insomnia',
    Diarrhea: 'Diarrhea',
    Constipation: 'Constipation',
  },
  fr: {
    Cramps: 'Crampes',
    Headache: 'Maux de tête',
    Bloating: 'Ballonnements',
    'Back pain': 'Mal de dos',
    'Tender breasts': 'Seins sensibles',
    Acne: 'Acné',
    Fatigue: 'Fatigue',
    Nausea: 'Nausées',
    Cravings: 'Fringales',
    Insomnia: 'Insomnie',
    Diarrhea: 'Diarrhée',
    Constipation: 'Constipation',
  },
};

export const MOOD_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    Happy: 'Happy',
    Calm: 'Calm',
    Sensitive: 'Sensitive',
    Sad: 'Sad',
    Irritable: 'Irritable',
    Anxious: 'Anxious',
    Energetic: 'Energetic',
    'Low energy': 'Low energy',
  },
  fr: {
    Happy: 'Heureuse',
    Calm: 'Calme',
    Sensitive: 'Sensible',
    Sad: 'Triste',
    Irritable: 'Irritable',
    Anxious: 'Anxieuse',
    Energetic: 'Énergique',
    'Low energy': 'Peu d’énergie',
  },
};

export function translateTag(lang: Lang, tag: string): string {
  return SYMPTOM_LABELS[lang][tag] ?? MOOD_LABELS[lang][tag] ?? tag;
}

export const STRINGS = {
  en: {
    loading: 'Loading…',
    storageErrorTitle: 'Peez cannot store data',
    storageErrorBody:
      'Your browser is blocking this site from saving data, so Peez cannot work. Allow cookies and site data for this site in your browser settings (and make sure it is not cleared when the browser closes), then reopen Peez.',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    copy: 'Copy',
    back: 'Back',
    continueBtn: 'Continue',
    done: 'Done',
    lock: 'Lock',
    tabs: {
      calendar: 'Calendar',
      stats: 'Stats',
      settings: 'Settings',
    },
    setup: {
      welcomeTitle: 'Welcome to Peez',
      welcomeBody:
        'A private period tracker. Everything you log stays encrypted on your own devices — no account, no cloud.',
      disclaimer1: 'Predictions are estimates based on your history.',
      disclaimerBold: 'Peez must not be used as contraception',
      disclaimer2: 'and is not a medical device.',
      getStarted: 'Get started',
      restoreExistingBtn: '📥 Already used Peez? Restore a backup',
      restoreTitle: 'Restore your data',
      restoreBody:
        'Select your .peez backup file and enter the PIN or recovery code you used when you created it.',
      restoreSecretPlaceholder: 'PIN, recovery code, or backup password',
      restoreV1PinHint: 'Choose a new PIN (4+ digits) to lock Peez on this device:',
      choosePinTitle: 'Choose a PIN',
      choosePinSub: 'Your PIN encrypts your data. 6 or more digits is recommended.',
      repeatPin: 'Repeat PIN',
      pinTooShort: (min: number) => `Use at least ${min} digits (6+ recommended).`,
      pinMismatch: 'The two PINs do not match.',
      settingUp: 'Setting up…',
      recoveryTitle: 'Your recovery code',
      recoveryBody1: 'If you ever forget your PIN on this device, this code is the',
      recoveryOnly: 'only',
      recoveryBody2:
        'way to unlock it. Note: clearing browser cookies/site data erases local storage, so also save a backup file.',
      saveInitialBackupBtn: '💾 Download starter backup (.peez)',
      recoverySavedCheck: 'I saved my recovery code',
      bioTitle: 'Unlock with fingerprint?',
      bioSub: 'You can always use your PIN as well. You can change this later in Settings.',
      waiting: 'Waiting…',
      enableBio: 'Enable fingerprint / Windows Hello',
      notNow: 'Not now',
    },
    envWarning: {
      inAppBrowser:
        '⚠️ You opened Peez inside an in-app browser, which regularly deletes saved data. Tap ⋮ and open Peez in Chrome or Safari instead.',
      iosTab:
        '📲 On iPhone/iPad, Safari deletes website data after 7 days of inactivity unless installed. Tap Share → Add to Home Screen to keep your data safe.',
    },
    backupPrompt: {
      title: 'Protect your history',
      body: 'Clearing browser cookies or phone cleanups can erase local site data. Save an encrypted backup file in 1 tap.',
      saveBtn: '💾 Save backup',
      laterBtn: 'Later',
    },
    lockScreen: {
      lockedTitle: 'Peez is locked',
      unlock: 'Unlock',
      unlocking: 'Unlocking…',
      useBio: '👆 Use fingerprint / Windows Hello',
      forgotPin: 'Forgot PIN?',
      resetTitle: 'Reset PIN',
      resetSub: 'Enter the recovery code you saved when setting up Peez, then choose a new PIN.',
      newPinPlaceholder: 'New PIN',
      newPinShort: (min: number) => `New PIN must have at least ${min} digits.`,
      checking: 'Checking…',
      resetAndUnlock: 'Reset PIN & unlock',
    },
    home: {
      welcomeHeadline: 'Welcome!',
      welcomeSub: 'Tap the first day of your last period in the calendar to start predictions.',
      periodDay: (day: number) => `Period · day ${day}`,
      nextExpectedAround: (date: string) => `Next one expected around ${date}`,
      periodLate: (days: number) => `Period ${days} day${days > 1 ? 's' : ''} late`,
      expectedCycleDay: (date: string, cycleDay: number) => `Expected ${date} · cycle day ${cycleDay}`,
      periodExpectedToday: 'Period expected today',
      periodInDays: (days: number) => `Period in ${days} day${days > 1 ? 's' : ''}`,
      aroundDateCycleDay: (date: string, range: number, cycleDay: number) =>
        `Around ${date} (±${range}d) · cycle day ${cycleDay}`,
      fertileNow: (end: string) => `Fertile window now · until ${end}`,
      fertileRange: (start: string, end: string) => `Fertile window ${start} – ${end}`,
      betterAfterCycles: 'Predictions get better after a few cycles.',
      logToday: 'Log today',
    },
    calendar: {
      weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      prevMonth: 'Previous month',
      nextMonth: 'Next month',
      legendPeriod: 'Period',
      legendPredicted: 'Predicted',
      legendFertile: 'Fertile',
      legendOvulation: 'Ovulation',
    },
    editor: {
      futureNotice: 'This day is in the future — you can still add notes.',
      period: 'Period',
      symptoms: 'Symptoms',
      mood: 'Mood',
      notes: 'Notes',
      notesPlaceholder: 'Anything else…',
      clearDay: 'Clear day',
    },
    stats: {
      title: 'Stats',
      empty: 'Log a few periods to see your statistics here.',
      avgCycle: 'Avg. cycle',
      avgPeriod: 'Avg. period',
      variation: 'Variation',
      periodsLogged: 'Periods logged',
      shortest: 'Shortest',
      longest: 'Longest',
      dayUnit: 'd',
      daysUnit: 'days',
      cycleHistory: 'Cycle history',
      cycleLength: 'Cycle length',
      periodLength: 'Period length',
      mostFrequent: 'Most frequent',
      periodsTable: 'Periods',
      colStart: 'Start',
      colLength: 'Length',
      colCycle: 'Cycle',
      current: 'current',
    },
    sync: {
      scanInstructions1: 'On the',
      otherDevice: 'other device',
      scanInstructions2: ', open Peez → Settings → Sync →',
      scanPairingCode: 'Scan pairing code',
      scanInstructions3: ', and point it at this code:',
      qrAlt: 'Pairing QR code',
      cantScan: "Can't scan? Copy the code as text",
      copyCode: 'Copy code',
      keepPrivate: 'Keep this code private — anyone with it could sync with your data.',
      pastePlaceholder: '…or paste the code (PEEZ1:…)',
      pairBtn: 'Pair',
      invalidCode: 'That is not a valid Peez pairing code.',
      pairedToast: 'Paired! Now tap "Sync now" on both devices.',
      starting: 'Starting…',
      syncedStatus: (n: number) => `Synced ✓ — ${n} change${n === 1 ? '' : 's'} received.`,
      unpairConfirm: 'Unpair this device? You will need to scan a new pairing code to sync again.',
      pairedOn: (date: string) => `Paired ${date}`,
      lastSynced: (dt: string) => ` · last synced ${dt}`,
      neverSynced: ' · never synced',
      syncInstructions: 'Open Peez on both devices and tap "Sync now" on each (within 2 minutes).',
      syncNow: '🔄 Sync now',
      unpairDevice: 'Unpair this device',
      notPairedInfo:
        'Pair this device with your other device once. Pick one to show the code, and scan it with the other.',
      showPairingCode: 'Show pairing code',
      cameraError: 'Could not access the camera. You can paste the pairing code instead.',
    },
    settings: {
      languageSection: 'Language / Langue',
      syncSection: 'Sync between devices',
      securitySection: 'Security',
      changePin: 'Change PIN',
      fingerprint: 'Fingerprint / Windows Hello',
      fingerprintEnabledToast: 'Fingerprint unlock enabled',
      newRecoveryCode: 'New recovery code',
      autoLock: 'Auto-lock',
      lockImmediately: 'Immediately',
      lock1m: 'After 1 minute',
      lock5m: 'After 5 minutes',
      lock15m: 'After 15 minutes',
      lockNow: 'Lock now',
      defaultsSection: 'Cycle defaults',
      defaultsSub: 'Used until enough cycles are logged to compute your own averages.',
      cycleLengthDays: 'Cycle length (days)',
      periodLengthDays: 'Period length (days)',
      dataSection: 'Your data',
      exportPdf: 'Export PDF summary (for a doctor)',
      exportCsv: 'Export CSV spreadsheet',
      createBackup: 'Create encrypted backup',
      restoreBackup: 'Restore / merge a backup',
      deleteAllData: 'Delete all data on this device',
      aboutSection: 'About',
      aboutText:
        'Peez stores everything encrypted on this device only. Predictions are estimates and must not be used as contraception or medical advice.',
      versionLabel: 'Version',
      buildNumberLabel: 'Build',
      pinChangedToast: 'PIN changed',
      newPinPlaceholder: 'New PIN',
      repeatNewPinPlaceholder: 'Repeat new PIN',
      recoveryModalTitle: 'Recovery code',
      newRecoveryInfo: 'Your new recovery code (the old one no longer works):',
      generateRecoveryWarn: 'This creates a new recovery code and invalidates the previous one.',
      generateRecoveryBtn: 'Generate new code',
      backupModalTitle: 'Encrypted backup',
      backupModalInfo:
        'Your backup file (.peez) is automatically encrypted with your PIN and recovery code. You can download it in one tap, or optionally add an extra password.',
      backupPwPlaceholder: 'Optional extra backup password',
      encrypting: 'Encrypting…',
      downloadBackup: '💾 Download backup (.peez)',
      backupDownloadedToast: 'Backup downloaded',
      restoreModalTitle: 'Restore a backup',
      restoreModalInfo:
        'The backup is merged with existing data: the most recent version of each day wins. If the backup is from a different vault, enter its PIN, recovery code, or password.',
      restoreSecretOptionalPlaceholder: 'PIN / recovery code / password (if needed)',
      restoring: 'Restoring…',
      restoreBtn: 'Restore',
      backupMergedToast: (n: number) => `Backup merged — ${n} change${n === 1 ? '' : 's'} applied`,
      storageStatusLabel: 'Local storage protection',
      storagePersistedBadge: '✓ Persistent + 3x mirrored',
      storageMirroredBadge: '✓ 3x mirrored (IndexedDB + OPFS + Local)',
      lastBackupLabel: (date: string) => `Last backup: ${date}`,
      neverBackedUp: 'No backup file saved yet',
      wipeModalTitle: 'Delete all data',
      wipeModalInfo1: 'This permanently deletes every entry, your PIN and pairing',
      wipeModalBold: 'on this device',
      wipeModalInfo2: '. Other synced devices keep their copy.',
      wipeConfirmPlaceholder: 'Type "DELETE" to confirm',
      deleteEverything: 'Delete everything',
    },
    pdf: {
      title: 'Menstrual cycle summary',
      generated: (date: string) => `Generated ${date} with Peez`,
      overview: 'Overview',
      avgCycle: (days: number, basedOn: number) =>
        `Average cycle length: ${days} days${basedOn ? ` (last ${basedOn} cycles)` : ' (default — not enough data)'}`,
      avgPeriod: (days: number) => `Average period length: ${days} days`,
      shortestLongest: (min: number, max: number) => `Shortest / longest cycle: ${min} / ${max} days`,
      periodsRecorded: (n: number) => `Periods recorded: ${n}`,
      nextPredicted: (date: string, range: number) => `Next period predicted around: ${date} (±${range} days)`,
      periodHistory: 'Period history',
      periodRow: (start: string, end: string, len: number, cyc?: number) =>
        `${start} – ${end}   ·   ${len} days${cyc ? `   ·   cycle ${cyc} days` : ''}`,
      symptomsTitle: 'Symptoms (days logged)',
      notesTitle: 'Notes',
    },
  },
  fr: {
    loading: 'Chargement…',
    storageErrorTitle: 'Peez ne peut pas enregistrer de données',
    storageErrorBody:
      'Votre navigateur empêche ce site d’enregistrer des données, Peez ne peut donc pas fonctionner. Autorisez les cookies et données de site pour ce site dans les paramètres du navigateur (et vérifiez qu’ils ne sont pas effacés à la fermeture), puis rouvrez Peez.',
    close: 'Fermer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    copy: 'Copier',
    back: 'Retour',
    continueBtn: 'Continuer',
    done: 'Terminé',
    lock: 'Verrouiller',
    tabs: {
      calendar: 'Calendrier',
      stats: 'Stats',
      settings: 'Réglages',
    },
    setup: {
      welcomeTitle: 'Bienvenue sur Peez',
      welcomeBody:
        'Un suivi de règles privé. Tout ce que vous notez reste chiffré sur vos propres appareils — sans compte et sans cloud.',
      disclaimer1: 'Les prévisions sont des estimations basées sur votre historique.',
      disclaimerBold: 'Peez ne doit pas être utilisé comme moyen de contraception',
      disclaimer2: 'et n’est pas un dispositif médical.',
      getStarted: 'Commencer',
      restoreExistingBtn: '📥 Déjà utilisé Peez ? Restaurer une sauvegarde',
      restoreTitle: 'Restaurer vos données',
      restoreBody:
        'Sélectionnez votre fichier de sauvegarde .peez et saisissez le code PIN ou le code de récupération utilisé lors de sa création.',
      restoreSecretPlaceholder: 'Code PIN, code de récupération ou mot de passe',
      restoreV1PinHint: 'Choisissez un nouveau code PIN (4+ chiffres) pour verrouiller Peez sur cet appareil :',
      choosePinTitle: 'Choisissez un code PIN',
      choosePinSub: 'Votre code PIN chiffre vos données. 6 chiffres ou plus sont recommandés.',
      repeatPin: 'Répétez le code PIN',
      pinTooShort: (min: number) => `Utilisez au moins ${min} chiffres (6+ recommandés).`,
      pinMismatch: 'Les deux codes PIN ne correspondent pas.',
      settingUp: 'Configuration…',
      recoveryTitle: 'Votre code de récupération',
      recoveryBody1: 'Si vous oubliez votre code PIN sur cet appareil, ce code est le',
      recoveryOnly: 'seul',
      recoveryBody2:
        'moyen de le déverrouiller. Attention : effacer les cookies/données du navigateur supprime le stockage local, pensez donc aussi à enregistrer un fichier de sauvegarde.',
      saveInitialBackupBtn: '💾 Télécharger une sauvegarde initiale (.peez)',
      recoverySavedCheck: 'J’ai bien noté mon code de récupération',
      bioTitle: 'Déverrouiller par empreinte ?',
      bioSub: 'Vous pourrez toujours utiliser votre code PIN. Modifiable à tout moment dans les Réglages.',
      waiting: 'En attente…',
      enableBio: 'Activer l’empreinte / Windows Hello',
      notNow: 'Plus tard',
    },
    envWarning: {
      inAppBrowser:
        '⚠️ Vous avez ouvert Peez dans le navigateur intégré d’une application, qui efface régulièrement les données. Appuyez sur ⋮ et ouvrez Peez dans Chrome ou Safari.',
      iosTab:
        '📲 Sur iPhone/iPad, Safari efface les données des sites après 7 jours d’inactivité s’ils ne sont pas installés. Appuyez sur Partager → Sur l’écran d’accueil pour protéger vos données.',
    },
    backupPrompt: {
      title: 'Protégez votre historique',
      body: 'Effacer les cookies du navigateur ou nettoyer le téléphone peut supprimer les données locales. Enregistrez une sauvegarde chiffrée en 1 clic.',
      saveBtn: '💾 Sauvegarder',
      laterBtn: 'Plus tard',
    },
    lockScreen: {
      lockedTitle: 'Peez est verrouillé',
      unlock: 'Déverrouiller',
      unlocking: 'Déverrouillage…',
      useBio: '👆 Utiliser l’empreinte / Windows Hello',
      forgotPin: 'Code PIN oublié ?',
      resetTitle: 'Réinitialiser le PIN',
      resetSub:
        'Saisissez le code de récupération enregistré lors de la configuration, puis choisissez un nouveau code PIN.',
      newPinPlaceholder: 'Nouveau PIN',
      newPinShort: (min: number) => `Le nouveau PIN doit contenir au moins ${min} chiffres.`,
      checking: 'Vérification…',
      resetAndUnlock: 'Réinitialiser et déverrouiller',
    },
    home: {
      welcomeHeadline: 'Bienvenue !',
      welcomeSub: 'Touchez le premier jour de vos dernières règles dans le calendrier pour lancer les prévisions.',
      periodDay: (day: number) => `Règles · jour ${day}`,
      nextExpectedAround: (date: string) => `Prochaines prévues vers le ${date}`,
      periodLate: (days: number) => `Règles en retard de ${days} jour${days > 1 ? 's' : ''}`,
      expectedCycleDay: (date: string, cycleDay: number) => `Prévues le ${date} · jour ${cycleDay} du cycle`,
      periodExpectedToday: 'Règles prévues aujourd’hui',
      periodInDays: (days: number) => `Règles dans ${days} jour${days > 1 ? 's' : ''}`,
      aroundDateCycleDay: (date: string, range: number, cycleDay: number) =>
        `Vers le ${date} (±${range}j) · jour ${cycleDay} du cycle`,
      fertileNow: (end: string) => `Période fertile en cours · jusqu’au ${end}`,
      fertileRange: (start: string, end: string) => `Période fertile du ${start} au ${end}`,
      betterAfterCycles: 'Les prévisions s’affinent après quelques cycles.',
      logToday: 'Noter aujourd’hui',
    },
    calendar: {
      weekdays: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      prevMonth: 'Mois précédent',
      nextMonth: 'Mois suivant',
      legendPeriod: 'Règles',
      legendPredicted: 'Prévues',
      legendFertile: 'Fertile',
      legendOvulation: 'Ovulation',
    },
    editor: {
      futureNotice: 'Ce jour est dans le futur — vous pouvez tout de même ajouter une note.',
      period: 'Règles',
      symptoms: 'Symptômes',
      mood: 'Humeur',
      notes: 'Notes',
      notesPlaceholder: 'Autre chose…',
      clearDay: 'Effacer ce jour',
    },
    stats: {
      title: 'Statistiques',
      empty: 'Enregistrez quelques cycles pour voir vos statistiques ici.',
      avgCycle: 'Cycle moyen',
      avgPeriod: 'Règles moy.',
      variation: 'Variation',
      periodsLogged: 'Cycles notés',
      shortest: 'Plus court',
      longest: 'Plus long',
      dayUnit: 'j',
      daysUnit: 'jours',
      cycleHistory: 'Historique des cycles',
      cycleLength: 'Durée du cycle',
      periodLength: 'Durée des règles',
      mostFrequent: 'Plus fréquents',
      periodsTable: 'Historique des règles',
      colStart: 'Début',
      colLength: 'Durée',
      colCycle: 'Cycle',
      current: 'en cours',
    },
    sync: {
      scanInstructions1: 'Sur ',
      otherDevice: 'l’autre appareil',
      scanInstructions2: ', ouvrez Peez → Réglages → Synchronisation →',
      scanPairingCode: 'Scanner le code',
      scanInstructions3: ', et visez ce QR code :',
      qrAlt: 'QR code d’appairage',
      cantScan: 'Impossible de scanner ? Copier le code texte',
      copyCode: 'Copier le code',
      keepPrivate: 'Gardez ce code confidentiel — toute personne l’ayant pourrait synchroniser vos données.',
      pastePlaceholder: '…ou collez le code (PEEZ1:…)',
      pairBtn: 'Appairer',
      invalidCode: 'Ce code d’appairage Peez n’est pas valide.',
      pairedToast: 'Appairé ! Appuyez maintenant sur « Synchroniser » sur les deux appareils.',
      starting: 'Démarrage…',
      syncedStatus: (n: number) => `Synchronisé ✓ — ${n} modification${n > 1 ? 's' : ''} reçue${n > 1 ? 's' : ''}.`,
      unpairConfirm:
        'Dissocier cet appareil ? Vous devrez scanner un nouveau code pour synchroniser à nouveau.',
      pairedOn: (date: string) => `Appairé le ${date}`,
      lastSynced: (dt: string) => ` · dernière synchro ${dt}`,
      neverSynced: ' · jamais synchronisé',
      syncInstructions:
        'Ouvrez Peez sur les deux appareils et appuyez sur « Synchroniser » sur chacun (dans les 2 minutes).',
      syncNow: '🔄 Synchroniser',
      unpairDevice: 'Dissocier cet appareil',
      notPairedInfo:
        'Appairez cet appareil une seule fois avec votre autre appareil. Affichez le code sur l’un et scannez-le avec l’autre.',
      showPairingCode: 'Afficher le code',
      cameraError: 'Impossible d’accéder à la caméra. Vous pouvez coller le code texte à la place.',
    },
    settings: {
      languageSection: 'Langue / Language',
      syncSection: 'Synchronisation entre appareils',
      securitySection: 'Sécurité',
      changePin: 'Changer le code PIN',
      fingerprint: 'Empreinte / Windows Hello',
      fingerprintEnabledToast: 'Déverrouillage par empreinte activé',
      newRecoveryCode: 'Nouveau code de récupération',
      autoLock: 'Verrouillage auto',
      lockImmediately: 'Immédiatement',
      lock1m: 'Après 1 minute',
      lock5m: 'Après 5 minutes',
      lock15m: 'Après 15 minutes',
      lockNow: 'Verrouiller maintenant',
      defaultsSection: 'Valeurs par défaut du cycle',
      defaultsSub: 'Utilisées tant que vous n’avez pas enregistré assez de cycles pour calculer vos moyennes.',
      cycleLengthDays: 'Durée du cycle (jours)',
      periodLengthDays: 'Durée des règles (jours)',
      dataSection: 'Vos données',
      exportPdf: 'Exporter un bilan PDF (pour le médecin)',
      exportCsv: 'Exporter un tableau CSV',
      createBackup: 'Créer une sauvegarde chiffrée',
      restoreBackup: 'Restaurer / fusionner une sauvegarde',
      deleteAllData: 'Supprimer toutes les données sur cet appareil',
      aboutSection: 'À propos',
      aboutText:
        'Peez stocke tout de manière chiffrée uniquement sur cet appareil. Les prévisions sont des estimations et ne doivent pas être utilisées comme contraception ou avis médical.',
      versionLabel: 'Version',
      buildNumberLabel: 'Build',
      pinChangedToast: 'Code PIN modifié',
      newPinPlaceholder: 'Nouveau PIN',
      repeatNewPinPlaceholder: 'Répétez le nouveau PIN',
      recoveryModalTitle: 'Code de récupération',
      newRecoveryInfo: 'Votre nouveau code de récupération (l’ancien ne fonctionne plus) :',
      generateRecoveryWarn: 'Cela crée un nouveau code de récupération et invalide le précédent.',
      generateRecoveryBtn: 'Générer un nouveau code',
      backupModalTitle: 'Sauvegarde chiffrée',
      backupModalInfo:
        'Votre fichier de sauvegarde (.peez) est automatiquement chiffré avec votre code PIN et votre code de récupération. Téléchargez-le en un clic, ou ajoutez un mot de passe supplémentaire facultatif.',
      backupPwPlaceholder: 'Mot de passe supplémentaire (facultatif)',
      encrypting: 'Chiffrement…',
      downloadBackup: '💾 Télécharger la sauvegarde (.peez)',
      backupDownloadedToast: 'Sauvegarde téléchargée',
      restoreModalTitle: 'Restaurer une sauvegarde',
      restoreModalInfo:
        'La sauvegarde est fusionnée avec vos données existantes : la version la plus récente de chaque jour est conservée. Si la sauvegarde provient d’un autre coffre, saisissez son PIN, code de récupération ou mot de passe.',
      restoreSecretOptionalPlaceholder: 'PIN / code de récupération / mot de passe (si demandé)',
      restoring: 'Restauration…',
      restoreBtn: 'Restaurer',
      backupMergedToast: (n: number) =>
        `Sauvegarde fusionnée — ${n} modification${n > 1 ? 's' : ''} appliquée${n > 1 ? 's' : ''}`,
      storageStatusLabel: 'Protection du stockage local',
      storagePersistedBadge: '✓ Persistant + triple copie',
      storageMirroredBadge: '✓ Triple copie (IndexedDB + OPFS + Local)',
      lastBackupLabel: (date: string) => `Dernière sauvegarde : ${date}`,
      neverBackedUp: 'Aucun fichier de sauvegarde enregistré',
      wipeModalTitle: 'Supprimer toutes les données',
      wipeModalInfo1: 'Cela supprime définitivement toutes les entrées, votre code PIN et l’appairage',
      wipeModalBold: 'sur cet appareil',
      wipeModalInfo2: '. Vos autres appareils synchronisés conservent leur copie.',
      wipeConfirmPlaceholder: 'Tapez « DELETE » pour confirmer',
      deleteEverything: 'Tout supprimer',
    },
    pdf: {
      title: 'Bilan du cycle menstruel',
      generated: (date: string) => `Généré le ${date} avec Peez`,
      overview: 'Résumé',
      avgCycle: (days: number, basedOn: number) =>
        `Durée moyenne du cycle : ${days} jours${basedOn ? ` (${basedOn} derniers cycles)` : ' (par défaut — données insuffisantes)'}`,
      avgPeriod: (days: number) => `Durée moyenne des règles : ${days} jours`,
      shortestLongest: (min: number, max: number) => `Cycle le plus court / le plus long : ${min} / ${max} jours`,
      periodsRecorded: (n: number) => `Cycles enregistrés : ${n}`,
      nextPredicted: (date: string, range: number) => `Prochaines règles prévues vers le : ${date} (±${range} jours)`,
      periodHistory: 'Historique des règles',
      periodRow: (start: string, end: string, len: number, cyc?: number) =>
        `${start} – ${end}   ·   ${len} jours${cyc ? `   ·   cycle de ${cyc} jours` : ''}`,
      symptomsTitle: 'Symptômes (jours notés)',
      notesTitle: 'Notes',
    },
  },
};

export type Translations = (typeof STRINGS)['en'];

export interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => undefined,
  t: STRINGS.en,
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
