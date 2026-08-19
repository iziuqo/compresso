/**
 * One icon set, one grid, one stroke.
 *
 * Everything is drawn on a 16×16 box at 1.4 stroke with round caps and joins, so
 * the glyphs sit at the same optical weight as 10px tracked labels beside them.
 * Before this they were inline one-offs at 9/11/15px with three different stroke
 * widths, which is the kind of thing you don't notice individually and feel
 * collectively.
 */
type Props = { size?: number; className?: string };

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  className,
});

export const Close = ({ size = 15, className }: Props) => (
  <svg {...base(size, className)}><path d="M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2" /></svg>
);

export const Share = ({ size = 15, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M8 10.2V2.2M8 2.2L5.3 4.9M8 2.2l2.7 2.7" />
    <path d="M2.9 9.4v3.2a1.1 1.1 0 001.1 1.1h8a1.1 1.1 0 001.1-1.1V9.4" />
  </svg>
);

export const Plus = ({ size = 15, className }: Props) => (
  <svg {...base(size, className)}><path d="M8 3.6v8.8M3.6 8h8.8" /></svg>
);

export const Chevron = ({ size = 12, className }: Props) => (
  <svg {...base(size, className)}><path d="M4.4 6.4L8 10l3.6-3.6" /></svg>
);

export const Check = ({ size = 15, className }: Props) => (
  <svg {...base(size, className)}><path d="M3 8.4l3.4 3.3L13 4.8" /></svg>
);

/** The compare handle. Two chevrons back to back — the one glyph every
 *  before/after slider in the wild uses, because it reads as "pull me". */
export const Drag = ({ size = 15, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M6.3 5.2L3.6 8l2.7 2.8M9.7 5.2L12.4 8l-2.7 2.8" />
  </svg>
);
