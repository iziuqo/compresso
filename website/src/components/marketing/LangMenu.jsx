'use client';

import { useEffect, useRef, useState } from 'react';
import { LOCALES, locales } from '../../i18n';

/**
 * The app's language menu, in the marketing surface's materials.
 *
 * Native name first, English name beneath, a rule in the left margin under the
 * active one. Never flags — a flag is a country, and es / pt-BR / zh-Hans don't
 * map onto one. It replaces a native <select>, which could not show two names
 * per row and rendered as an OS widget that belonged to no design at all.
 */
export default function LangMenu({ locale, onChange, label = 'Language' }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="mk-lang" ref={root}>
      <button
        type="button"
        className="mk-lang__trigger mk-label"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
      >
        {LOCALES[locale]?.native || locale}
      </button>

      <div
        className={`mk-lang__sheet ${open ? 'is-open' : ''}`}
        role="listbox"
        aria-label={label}
      >
        {locales.map((l, i) => (
          <button
            key={l}
            type="button"
            role="option"
            aria-selected={l === locale}
            className="mk-lang__row"
            style={{ '--i': i }}
            onClick={() => { onChange(l); setOpen(false); }}
          >
            <span className="mk-lang__native">{LOCALES[l].native}</span>
            <span className="mk-lang__english mk-label">{LOCALES[l].english}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
