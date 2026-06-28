'use client';

import { useState, useEffect, useCallback } from 'react';

export default function InstallBanner({ t }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalled(true);
      return;
    }

    const dismissed = sessionStorage.getItem('compresso-install-dismissed');
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      showToast(t?.pwa?.installed || 'Compresso installed!');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [t]);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast(t?.pwa?.installing || 'Installing...');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('compresso-install-dismissed', '1');
  };

  if (installed || !showBanner) {
    return toast ? <Toast message={toast} /> : null;
  }

  return (
    <>
      {toast && <Toast message={toast} />}

      {/* Bottom banner — mobile-first, non-intrusive */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-0 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm animate-slide-up"
        role="alert"
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-200 p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 5v14M5 12l7 7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">
                {t?.pwa?.title || 'Install Compresso'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t?.pwa?.description || 'Optimize images offline, right from your phone. No internet needed.'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="gradient-bg text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t?.pwa?.install || 'Install app'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-2"
                >
                  {t?.pwa?.dismiss || 'Not now'}
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-300 hover:text-gray-500 transition-colors -mt-1 -mr-1"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Toast({ message }) {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
      <div className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-400" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  );
}
