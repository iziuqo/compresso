import Svg, { Path, Rect } from 'react-native-svg';

/**
 * The web app's icon set (website/compresso-app/src/ui/icons.tsx): one 16×16
 * grid, one 1.4 stroke, round caps. Purpose glyphs are new, drawn the same way.
 * Icons are always paired with a visible word; they are never the only label.
 */
type Props = { size?: number; color: string };

const Icon = ({ size = 22, color, children }: Props & { children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color}
    strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {children}
  </Svg>
);

export const Close = (p: Props) => <Icon {...p}><Path d="M3.4 3.4l9.2 9.2M12.6 3.4l-9.2 9.2" /></Icon>;
export const Back = (p: Props) => <Icon {...p}><Path d="M10 3.4L5.4 8l4.6 4.6" /></Icon>;
export const Check = (p: Props) => <Icon {...p}><Path d="M3 8.4l3.4 3.3L13 4.8" /></Icon>;
export const Down = (p: Props) => <Icon {...p}><Path d="M3.4 6l4.6 4.6L12.6 6" /></Icon>;
export const Plus = (p: Props) => <Icon {...p}><Path d="M8 3.6v8.8M3.6 8h8.8" /></Icon>;
export const Drag = (p: Props) => <Icon {...p}><Path d="M6.3 5.2L3.6 8l2.7 2.8M9.7 5.2L12.4 8l-2.7 2.8" /></Icon>;
export const Share = (p: Props) => (
  <Icon {...p}>
    <Path d="M8 10.2V2.2M8 2.2L5.3 4.9M8 2.2l2.7 2.7" />
    <Path d="M2.9 9.4v3.2a1.1 1.1 0 001.1 1.1h8a1.1 1.1 0 001.1-1.1V9.4" />
  </Icon>
);
export const Gear = (p: Props) => (
  <Icon {...p}>
    <Path d="M12.72 6.69 L14.22 6.98 L14.22 9.02 L12.72 9.31 L12.26 10.42 L13.11 11.68 L11.68 13.11 L10.42 12.26 L9.31 12.72 L9.02 14.22 L6.98 14.22 L6.69 12.72 L5.58 12.26 L4.32 13.11 L2.89 11.68 L3.74 10.42 L3.28 9.31 L1.78 9.02 L1.78 6.98 L3.28 6.69 L3.74 5.58 L2.89 4.32 L4.32 2.89 L5.58 3.74 L6.69 3.28 L6.98 1.78 L9.02 1.78 L9.31 3.28 L10.42 3.74 L11.68 2.89 L13.11 4.32 L12.26 5.58Z" />
    <Path d="M8 10a2 2 0 100-4 2 2 0 000 4z" />
  </Icon>
);
export const Sliders = (p: Props) => (
  <Icon {...p}><Path d="M2.5 5h11M2.5 11h11" /><Path d="M6 3.4v3.2M10 9.4v3.2" /></Icon>
);
export const Download = (p: Props) => (
  <Icon {...p}>
    <Path d="M8 2.2v8M8 10.2L5.3 7.5M8 10.2l2.7-2.7" />
    <Path d="M2.9 10.6v2a1.1 1.1 0 001.1 1.1h8a1.1 1.1 0 001.1-1.1v-2" />
  </Icon>
);
export const Shield = (p: Props) => (
  <Icon {...p}><Path d="M8 1.9l5 1.9v3.9c0 3.1-2.1 5.4-5 6.4-2.9-1-5-3.3-5-6.4V3.8l5-1.9z" /><Path d="M5.8 8l1.6 1.6 2.9-3" /></Icon>
);

export const Gallery = (p: Props) => (
  <Icon {...p}><Rect x={2.2} y={2.6} width={11.6} height={10.8} rx={1.4} /><Path d="M2.6 11.2l3.4-3.4 2.6 2.6 1.6-1.6 3.2 3.2" /><Path d="M10.6 6.2a.9.9 0 100-1.8.9.9 0 000 1.8z" /></Icon>
);

/* purpose glyphs */
export const Message = (p: Props) => (
  <Icon {...p}><Path d="M2.6 4.2a1.6 1.6 0 011.6-1.6h7.6a1.6 1.6 0 011.6 1.6v5a1.6 1.6 0 01-1.6 1.6H7.2L4.4 13.2v-2.4h-.2a1.6 1.6 0 01-1.6-1.6v-5z" /></Icon>
);
export const Mail = (p: Props) => (
  <Icon {...p}><Rect x={2.2} y={3.6} width={11.6} height={8.8} rx={1.4} /><Path d="M2.6 4.6L8 8.6l5.4-4" /></Icon>
);
export const Form = (p: Props) => (
  <Icon {...p}><Rect x={3.2} y={1.9} width={9.6} height={12.2} rx={1.3} /><Path d="M5.6 5.4h4.8M5.6 8h4.8M5.6 10.6h2.6" /></Icon>
);
export const Space = (p: Props) => (
  <Icon {...p}><Rect x={2.2} y={2.2} width={11.6} height={11.6} rx={1.6} /><Path d="M5.4 10.6L10.6 5.4M7.2 5.4h3.4v3.4" /></Icon>
);
export const Globe = (p: Props) => (
  <Icon {...p}><Path d="M8 13.8A5.8 5.8 0 108 2.2a5.8 5.8 0 000 11.6z" /><Path d="M2.4 8h11.2M8 2.2c1.6 1.6 2.4 3.6 2.4 5.8S9.6 12.2 8 13.8C6.4 12.2 5.6 10.2 5.6 8S6.4 3.8 8 2.2z" /></Icon>
);

/** The Compresso mark (website/public/logo.svg): two plates pressing in. Filled, not stroked. */
export const Mark = ({ size = 22, color }: Props) => (
  <Svg width={size} height={size} viewBox="0 0 512 512" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path d="M104 128 H408 L332 236 H180 Z" fill={color} />
    <Path d="M104 384 H408 L332 276 H180 Z" fill={color} />
  </Svg>
);
