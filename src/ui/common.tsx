import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n';

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="sheet-body">
          <div className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label={t.close}>
              ✕
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

export function PinInput({
  value,
  onChange,
  placeholder = 'PIN',
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      className="pin-input"
      type="password"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={`chip${lang === 'en' ? ' on' : ''}`}
        aria-pressed={lang === 'en'}
        onClick={() => setLang('en')}
      >
        🇬🇧 EN
      </button>
      <button
        type="button"
        className={`chip${lang === 'fr' ? ' on' : ''}`}
        aria-pressed={lang === 'fr'}
        onClick={() => setLang('fr')}
      >
        🇫🇷 FR
      </button>
    </div>
  );
}

export const MIN_PIN = 4;
