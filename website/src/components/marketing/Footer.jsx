import Logo from '../Logo';
import { APP_URL, GITHUB_URL, NPM_URL } from './links';

export default function Footer({ t, basePath = '' }) {
  return (
    <footer className="mk-foot">
      <div className="mk-wrap mk-foot__row">
        <span className="mk-mark">
          <Logo size={14} className="mk-mark__glyph" />
          <span className="mk-label">{t.footer.rights}</span>
        </span>
        <nav className="mk-foot__links" aria-label="Footer">
          <a className="mk-foot__link" href={APP_URL}>{t.nav.openApp}</a>
          <a className="mk-foot__link" href={`${basePath}/docs/`}>{t.nav.docs}</a>
          <a className="mk-foot__link" href={NPM_URL} target="_blank" rel="noopener noreferrer">npm</a>
          <a className="mk-foot__link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a className="mk-foot__link" href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
            {t.footer.license}
          </a>
        </nav>
      </div>
    </footer>
  );
}
