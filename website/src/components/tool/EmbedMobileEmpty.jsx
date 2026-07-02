'use client';

import EmbedMobileShell from './EmbedMobileShell';

const EXAMPLES = [
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=80', name: 'landscape.jpg', key: 'exLandscape' },
  { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80', name: 'portrait.jpg', key: 'exPortrait' },
  { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', name: 'abstract.jpg', key: 'exAbstract' },
];

export default function EmbedMobileEmpty({ t, dropzoneProps }) {
  const { dragOver, onDragOver, onDragLeave, onDrop, onClick, onKeyDown, inputRef, onFileChange, onExample } = dropzoneProps;

  return (
    <EmbedMobileShell
      t={t}
      stage={(
        <div
          className={`demo-widget-drop ${dragOver ? 'demo-widget-drop-active' : ''}`}
          onClick={onClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-label={t.playground.dropzone}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A4.5 4.5 0 0118 19.5H6.75z" />
          </svg>
          <span className="demo-widget-drop-text">{t.playground.dropzoneShort || 'Tap to upload'}</span>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </div>
      )}
      bar={(
        <div className="demo-widget-samples" role="list" aria-label={t.playground.examples}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.name}
              type="button"
              role="listitem"
              onClick={(e) => { e.stopPropagation(); onExample(ex.url, ex.name); }}
              className="demo-widget-sample"
            >
              <img src={ex.url} alt="" loading="lazy" draggable={false} />
            </button>
          ))}
        </div>
      )}
    />
  );
}
