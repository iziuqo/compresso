export default function Footer({ t, basePath = '' }) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 font-bold text-lg mb-3">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="32" height="32" rx="8" className="fill-brand-500" />
                <path d="M8 16C8 11.58 11.58 8 16 8V12C13.79 12 12 13.79 12 16H8Z" fill="white" opacity="0.7" />
                <path d="M16 8C20.42 8 24 11.58 24 16H20C20 13.79 18.21 12 16 12V8Z" fill="white" />
                <path d="M24 16C24 20.42 20.42 24 16 24V20C18.21 20 20 18.21 20 16H24Z" fill="white" opacity="0.7" />
                <path d="M16 24C11.58 24 8 20.42 8 16H12C12 18.21 13.79 20 16 20V24Z" fill="white" />
              </svg>
              Compresso
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{t.footer.tagline}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-3">{t.footer.lib}</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="https://www.npmjs.com/package/compresso" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t.footer.npm}</a></li>
              <li><a href="https://github.com/iziuqo/compresso" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t.footer.github}</a></li>
              <li><a href="https://unpkg.com/compresso.js/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t.footer.cdn}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-3">{t.footer.resources}</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href={`${basePath}/docs/`} className="hover:text-gray-700 transition-colors">{t.footer.docs}</a></li>
              <li><a href="https://github.com/iziuqo/compresso/tree/main/examples" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t.footer.examples}</a></li>
              <li><a href="https://github.com/iziuqo/compresso/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t.footer.contributing}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-3">{t.footer.project}</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="https://github.com/iziuqo/compresso/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t.footer.license}</a></li>
              <li><a href="https://github.com/iziuqo/compresso/blob/main/SECURITY.md" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t.footer.security}</a></li>
              <li><a href="https://github.com/iziuqo/compresso/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t.footer.codeOfConduct}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} Compresso. MIT License.
        </div>
      </div>
    </footer>
  );
}
