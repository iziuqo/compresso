'use client';

const EXAMPLES = [
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80', name: 'landscape.jpg', key: 'exLandscape' },
  { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&q=80', name: 'portrait.jpg', key: 'exPortrait' },
  { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80', name: 'abstract.jpg', key: 'exAbstract' },
];

export default function Dropzone({
  t,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onKeyDown,
  inputRef,
  onFileChange,
  onExample,
  compact = false,
}) {
  return (
    <div className={`mx-auto animate-pro-dropzone-in ${compact ? 'w-full' : 'max-w-lg'}`}>
      <div
        className={`pro-dropzone transition-all duration-300 ${dragOver ? 'pro-dropzone-active' : ''} ${compact ? 'pro-dropzone-compact' : ''}`}
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label={t.playground.dropzone}
      >
        <div className={`pro-dropzone-icon ${compact ? 'pro-dropzone-icon-compact' : 'animate-pro-icon-float'}`}>
          <svg width={compact ? 22 : 28} height={compact ? 22 : 28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A4.5 4.5 0 0118 19.5H6.75z" />
          </svg>
        </div>
        <p className={`font-semibold text-ink mb-0.5 ${compact ? 'text-sm' : 'text-[0.9375rem]'}`}>{t.playground.dropzone}</p>
        {!compact && <p className="text-sm text-ink-faint">{t.playground.dropzoneHint}</p>}
        <p className="text-xs text-ink-faint/70 mt-4 hidden sm:flex items-center justify-center gap-1.5">
          <kbd className="pro-kbd">⌘V</kbd>
          <span>to paste</span>
          <span className="text-ink-faint/40">·</span>
          <span>drag & drop</span>
        </p>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      </div>

      <p className={`pro-group-label text-center mb-2 ${compact ? 'mt-3 text-[0.625rem]' : 'mt-8 mb-3'}`}>
        {t.playground.examples || 'Sample images'}
      </p>
      <div className={`${compact ? 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1' : 'grid grid-cols-3 gap-3'} pro-sample-stagger`}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.name}
            type="button"
            onClick={(e) => { e.stopPropagation(); onExample(ex.url, ex.name); }}
            className={`pro-sample ${compact ? 'pro-sample-compact shrink-0' : ''}`}
          >
            <img src={ex.url} alt="" loading="lazy" draggable={false} />
            <span className="pro-sample-label">{t.playground[ex.key]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
