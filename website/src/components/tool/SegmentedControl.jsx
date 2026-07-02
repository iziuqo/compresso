'use client';

export default function SegmentedControl({ options, value, onChange, variant = 'light' }) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const isDark = variant === 'dark';
  const pillClass = isDark ? 'pro-toolbar-pill' : 'pro-segmented-pill';
  const btnClass = isDark ? 'pro-toolbar-btn' : 'pro-segmented-btn';
  const btnActiveClass = isDark ? 'pro-toolbar-btn-active' : 'pro-segmented-btn-active';
  const containerClass = isDark ? 'pro-toolbar' : 'pro-segmented';

  const pillStyle = isDark
    ? {
        width: `calc((100% - 8px) / ${options.length})`,
        transform: `translateX(${activeIndex * 100}%)`,
      }
    : {
        width: `${100 / options.length}%`,
        transform: `translateX(${activeIndex * 100}%)`,
      };

  return (
    <div className={containerClass} role="group">
      <span className={pillClass} style={pillStyle} aria-hidden="true" />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`${btnClass} ${value === opt.value ? btnActiveClass : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
