'use client';

import { useEffect, useRef, useState } from 'react';
import Logo from '../Logo';
import { EARLY_ACCESS_URL } from '../marketing/links';

const PLATFORMS = [
  { id: 'android', label: 'Android', hint: 'androidHint' },
  { id: 'ios', label: 'iPhone', hint: 'iphoneHint' },
];

/** Strict enough to catch a typo, loose enough never to refuse a real address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The phone in the visitor's hand, so most people never touch the switch.
    iPadOS reports itself as a Mac, and only its touch points give it away. */
function detectPlatform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return null;
}

/** Where the visitor came from (?utm_source=whatsapp), so the sheet can tell. */
function readSource() {
  const q = new URLSearchParams(window.location.search);
  return q.get('utm_source') || q.get('ref') || 'direct';
}

/**
 * The signup card. It posts to the Apps Script web app, which stores the row
 * and sends the invite in `locale`. The body goes as text/plain on purpose: a
 * JSON content type would trigger a CORS preflight, which Apps Script does not
 * answer. The card then turns into its own receipt, in place, so the page
 * never jumps and the visitor's eye never has to find the result.
 */
export default function JoinForm({ e, locale, id }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => { setPlatform(detectPlatform()); }, []);

  async function submit(event) {
    event.preventDefault();
    const address = email.trim();
    if (!EMAIL.test(address)) { setError(e.errorEmail); emailRef.current?.focus(); return; }
    if (!platform) { setError(e.errorPhone); return; }

    setError(null);
    setStatus('sending');
    try {
      const res = await fetch(EARLY_ACCESS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          name: name.trim(),
          email: address,
          platform,
          locale,
          source: readSource(),
          website: event.currentTarget.website.value, // honeypot: people leave it empty
        }),
      });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error);
      setStatus('done');
    } catch (err) {
      console.warn('[early] signup failed', err);
      setError(e.errorFailed);
      setStatus('idle');
    }
  }

  async function share() {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) return await navigator.share({ title: 'Compresso', text: e.shareText, url });
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the share sheet was dismissed */ }
  }

  if (status === 'done') {
    const first = name.trim().split(/\s+/)[0];
    const [before, after] = e.doneBody.split('{email}');
    return (
      <div className="ea-card ea-done" id={id} role="status">
        <Logo size={28} className="ea-done__mark" />
        <p className="mk-label">{e.doneLabel}</p>
        <h2 className="ea-done__title">{first ? e.doneTitle.replace('{name}', first) : e.doneTitleNoName}</h2>
        <p className="ea-done__body">{before}<strong>{email.trim()}</strong>{after}</p>
        <div className="ea-done__share">
          <p className="ea-done__ask">{e.shareLabel}</p>
          <button type="button" className="mk-ghost" onClick={share}>{copied ? e.copied : e.share}</button>
        </div>
        <button type="button" className="ea-link" onClick={() => setStatus('idle')}>{e.doneChange}</button>
      </div>
    );
  }

  const hint = PLATFORMS.find((p) => p.id === platform)?.hint;
  const sending = status === 'sending';

  return (
    <form className="ea-card" id={id} onSubmit={submit} noValidate>
      <div className="ea-card__round">
        <span className="mk-label">{e.roundLabel}</span>
        <span className="mk-label">{e.roundDate}</span>
      </div>

      <label className="ea-field">
        <span className="mk-label">{e.nameLabel} <span className="ea-field__opt">· {e.optional}</span></span>
        <input
          className="ea-input" name="name" autoComplete="given-name" maxLength={60}
          placeholder={e.namePlaceholder} value={name} onChange={(ev) => setName(ev.target.value)}
        />
      </label>

      <label className="ea-field">
        <span className="mk-label">{e.emailLabel}</span>
        <input
          ref={emailRef} className="ea-input" name="email" type="email" inputMode="email"
          autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254}
          placeholder={e.emailPlaceholder} value={email} onChange={(ev) => setEmail(ev.target.value)}
          aria-invalid={error === e.errorEmail}
        />
      </label>

      <fieldset className="ea-field">
        <legend className="mk-label">{e.phoneLabel}</legend>
        <div className="ea-seg" role="radiogroup" aria-label={e.phoneLabel}>
          {PLATFORMS.map((p) => (
            <button
              key={p.id} type="button" role="radio" aria-checked={platform === p.id}
              className="ea-seg__opt" onClick={() => { setPlatform(p.id); setError(null); }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {hint && <p className="ea-hint" key={hint}>{e[hint]}</p>}
      </fieldset>

      {/* off-screen, not display:none, so form-filling bots still find it */}
      <input className="ea-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <button className="mk-pill mk-pill--lg ea-submit" type="submit" disabled={sending} aria-busy={sending}>
        {sending ? e.sending : e.submit}
      </button>
      <p className={`ea-fine ${error ? 'is-error' : ''}`} aria-live="polite">{error || e.privacy}</p>
    </form>
  );
}
