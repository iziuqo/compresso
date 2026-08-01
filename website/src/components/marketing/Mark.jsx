import Logo from '../Logo';

export default function Mark() {
  return (
    <a href="#top" className="mk-mark">
      <Logo size={16} className="mk-mark__glyph" />
      <span className="mk-mark__word">compresso</span>
    </a>
  );
}
