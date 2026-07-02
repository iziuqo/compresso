export default function StoryChapter({ label, title, desc, children, className = '' }) {
  return (
    <div className={`section-header ${className}`}>
      {label && <p className="section-label">{label}</p>}
      {title && <h2 className="section-title">{title}</h2>}
      {desc && <p className="section-desc">{desc}</p>}
      {children}
    </div>
  );
}
