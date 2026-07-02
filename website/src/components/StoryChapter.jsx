export default function StoryChapter({ label, title, desc, children, className = '', compact = false }) {
  return (
    <div className={`section-header ${compact ? 'section-header-compact' : ''} ${className}`}>
      {label && <p className="section-label">{label}</p>}
      {title && <h2 className="section-title">{title}</h2>}
      {desc && <p className="section-desc">{desc}</p>}
      {children}
    </div>
  );
}
