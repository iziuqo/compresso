'use client';

import { useEffect, useRef, useState } from 'react';
import CompressorApp from './tool/CompressorApp';
import StoryChapter from './StoryChapter';

export default function Playground({ t }) {
  const shellRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      const active = el === shellRef.current;
      setIsFullscreen(active);
      shellRef.current?.classList.toggle('demo-fullscreen-active', active);
      document.body.classList.toggle('demo-fullscreen-body', active);
    };

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();

    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      document.body.classList.remove('demo-fullscreen-body');
    };
  }, []);

  const shellClass = [
    'demo-shell flex flex-col',
    isFullscreen ? 'demo-fullscreen-active h-full min-h-0' : 'demo-wrap demo-stage',
  ].join(' ');

  return (
    <section id="playground" className="band-light section-block">
      <div className="playground-chrome site-wrap mb-8 sm:mb-10">
        <StoryChapter label={t.playground.label} title={t.playground.title} desc={t.playground.subtitle} />
      </div>
      <div id="demo-fullscreen-root" ref={shellRef} className={shellClass}>
        <CompressorApp
          t={t}
          variant="embed"
          fullscreenTargetRef={shellRef}
          isFullscreen={isFullscreen}
        />
      </div>
      <div className="playground-chrome site-wrap mt-10 sm:mt-12">
        <a href="#problem" className="story-bridge">
          {t.story.playgroundBridge}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </section>
  );
}
