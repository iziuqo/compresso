'use client';

import { useState, useEffect, useCallback } from 'react';

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
}

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

    if (!isMobileDevice()) return;

    const dismissed = sessionStorage.getItem('compresso-install-dismissed');
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 4000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      showToast(t?.pwa?.installed || 'Compresso installed! Find it on your home screen.');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [t]);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
    if (outcome === 'accepted') {
      showToast(t?.pwa?.installing || 'Installing Compresso to your home screen...');
    }
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

      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-3 animate-slide-up safe-bottom"
        role="alert"
      >
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-200 p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <path d="M8 16C8 11.58 11.58 8 16 8V12C13.79 12 12 13.79 12 16H8Z" fill="white" />
                <path d="M16 8C20.42 8 24 11.58 24 16H20C20 13.79 18.21 12 16 12V8Z" fill="white" />
                <path d="M24 16C24 20.42 20.42 24 16 24V20C18.21 20 20 18.21 20 16H24Z" fill="white" />
                <path d="M16 24C11.58 24 8 20.42 8 16H12C12 18.21 13.79 20 16 20V24Z" fill="white" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">
                {t?.pwa?.title || 'Install Compresso'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t?.pwa?.description || 'Optimize images offline, right from your phone.'}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={handleInstall}
                  className="gradient-bg text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {t?.pwa?.install || 'Install'}
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
              className="text-gray-300 hover:text-gray-500 transition-colors -mt-1 -mr-1 p-1"
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
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-fade-in px-4 w-full max-w-sm">
      <div className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-400 flex-shrink-0" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="leading-snug">{message}</span>
      </div>
    </div>
  );
}
