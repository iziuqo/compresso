import Logo from './Logo';

export default function Footer({ t, basePath = '' }) {
  return (
    <footer className="band-dark py-16 sm:py-20 border-t border-line-dark">
      <div className="site-wrap">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 sm:gap-12 mb-12 sm:mb-16">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Logo size={28} />
              <span className="text-sm font-semibold text-white">Compresso</span>
            </div>
            <p className="text-sm text-white/55 max-w-xs leading-[1.5]">{t.footer.tagline}</p>
          </div>

          <div>
            <h4 className="footer-heading">{t.footer.lib}</h4>
            <ul className="space-y-3 text-sm text-white/55">
              <li><a href="https://www.npmjs.com/package/compresso" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.npm}</a></li>
              <li><a href="https://github.com/iziuqo/compresso" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.github}</a></li>
              <li><a href="https://unpkg.com/compresso.js/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.cdn}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">{t.footer.resources}</h4>
            <ul className="space-y-3 text-sm text-white/55">
              <li><a href={`${basePath}/docs/`} className="hover:text-white transition-colors">{t.footer.docs}</a></li>
              <li><a href="https://github.com/iziuqo/compresso/tree/main/examples" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.examples}</a></li>
              <li><a href="https://github.com/iziuqo/compresso/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.contributing}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">{t.footer.project}</h4>
            <ul className="space-y-3 text-sm text-white/55">
              <li><a href="https://github.com/iziuqo/compresso/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.license}</a></li>
              <li><a href="https://github.com/iziuqo/compresso/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.security}</a></li>
              <li><a href="https://github.com/iziuqo/compresso/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t.footer.codeOfConduct}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-line-dark pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/45 leading-snug">
          <span>&copy; {new Date().getFullYear()} Compresso. MIT + Commons Clause.</span>
          <a href={`${basePath}/tool/`} className="hover:text-white transition-colors text-sm font-semibold text-white/70">
            Open tool →
          </a>
        </div>
      </div>
    </footer>
  );
}
