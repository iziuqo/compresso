import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { mono, ui } from './system';

/** A photo filling the frame, as a phone shows it. `src` is relative to public/. */
export function Photo({ src, style }: { src: string; style?: CSSProperties }) {
  return <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }} />;
}

/** Bytes are data, so they look like data: Geist Mono, figures that don't shift as they change. */
export function Mono({ size, children, style }: { size: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{ fontFamily: mono, fontSize: size, lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style }}>
      {children}
    </span>
  );
}

/** The ground everything sits on: true black, white ink. */
export function Ground({ children }: { children: ReactNode }) {
  return <AbsoluteFill style={{ background: 'var(--void)', color: 'var(--ink)', fontFamily: ui }}>{children}</AbsoluteFill>;
}
