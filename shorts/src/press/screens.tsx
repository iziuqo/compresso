/**
 * Everywhere's three screens (wave three, 10): a browser window, a tablet
 * and a phone, generic outlines, each showing the one press: copies of its
 * canvas, so the three are in sync to the frame. The phone is alone at
 * first; the other two come in round it; all three show the app at the
 * same moment and take the tap together; at dead front they slide together
 * into one press, and for the proof they come apart again with the pressed
 * print, its size on each.
 *
 * Also the app as the Shorts show it, in a phone or in each screen.
 */
import { type RefObject, useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, Freeze, Sequence } from 'remotion';
import { Recording, SCREEN, Touch } from '../story';
import { ease, H, px, sec, ui, W } from '../system';
import { B, mix, Size, span } from './ritual';

const CUT = [{ start: 0, end: 99 }];
type Rec = { flow: string; at: { go: number } };

/** The recording, opening on the purpose already chosen: it holds its first frame until it runs into the tap on "Make it lighter". In SCREEN units. */
export function App({ rec, t, airplane = false }: { rec: Rec; t: number; airplane?: boolean }) {
  return (
    <>
      <Sequence from={sec(B.phone)} durationInFrames={sec(B.tap - rec.at.go - B.phone)} layout="none">
        <Freeze frame={0}><Recording flow={rec.flow} from={0} cuts={CUT} time="9:41" airplane={airplane} /></Freeze>
      </Sequence>
      {t >= B.tap - rec.at.go && <Recording flow={rec.flow} from={sec(B.tap - rec.at.go)} cuts={CUT} time="9:41" airplane={airplane} />}
      <Touch x={196} y={813} at={sec(B.tap)} t={sec(t)} />
    </>
  );
}

type Rect = { x: number; y: number; w: number; h: number };
const lerp = (a: Rect, b: Rect, k: number): Rect => ({ x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), w: mix(a.w, b.w, k), h: mix(a.h, b.h, k) });
const FULL: Rect = { x: 0, y: 0, w: W, h: H };
const BAR = px(56); // the browser's address bar

/** Each screen, in px of a 1080-wide frame: where it stands, where it comes in from, its frame's corner and bezel. */
const SCREENS = [
  { kind: 'browser', at: { x: 87, y: 190, w: 906, h: 566 }, from: { dx: 1, dy: 0 }, r: 18, bezel: 0 },
  { kind: 'tablet', at: { x: 87, y: 900, w: 486, h: 648 }, from: { dx: -1, dy: 0 }, r: 34, bezel: 14 },
  { kind: 'phone', at: { x: 663, y: 880, w: 330, h: 715 }, from: { dx: 0, dy: 0 }, r: 52, bezel: 10 },
] as const;
/** The phone alone at the start, larger and centred. */
const ALONE: Rect = { x: px(240), y: px(370), w: px(600), h: px(1300) };
const scaled = ({ x, y, w, h }: Rect): Rect => ({ x: px(x), y: px(y), w: px(w), h: px(h) });

/** How far apart the three are: 1 as three screens, 0 slid together into the one press. */
export const apart = (t: number) => 1 - span(t, B.front, B.name, ease.glide) + span(t, B.lift, B.shown, ease.glide);

/** The three screens over the scene, drawn from `source` (the press's canvas), each with the size `bytes`, the app on them from the phone beat to the tap. */
export function Screens({ source, t, bytes, rec }: { source: RefObject<HTMLCanvasElement | null>; t: number; bytes: number; rec: Rec }) {
  const k = apart(t);
  if (k <= 0.001) return null;
  const come = span(t, B.line, B.line + 0.6, ease.glide); // the two others come in round the phone
  const app = span(t, B.phone + 0.3, B.app, ease.glide) - span(t, B.tap + 0.05, B.tap + 0.6, ease.glide);
  const sized = span(t, 0, 0.3) * (1 - span(t, B.phone, B.phone + 0.3)) + span(t, B.shown - 0.4, B.shown);
  return (
    <AbsoluteFill style={{ background: `rgb(0 0 0 / ${Math.min(1, k * 4)})` }}>
      {SCREENS.map((s) => {
        const at = scaled(s.at);
        const home = s.kind === 'phone' ? lerp(ALONE, at, come) : { ...at, x: at.x + s.from.dx * W * (1 - come) };
        const rect = lerp(FULL, home, k);
        const screen = s.kind === 'browser' ? { ...rect, y: rect.y + BAR * k, h: rect.h - BAR * k } : rect;
        const fit = screen.h / SCREEN.h;
        return (
          <div key={s.kind}>
            <Copy source={source} rect={screen} />
            {app > 0 && (
              <div style={{ position: 'absolute', left: screen.x, top: screen.y, width: screen.w, height: screen.h, overflow: 'hidden', background: '#000', opacity: app }}>
                <div style={{ position: 'absolute', left: (screen.w - SCREEN.w * fit) / 2, top: 0, width: SCREEN.w, height: SCREEN.h, transform: `scale(${fit})`, transformOrigin: '0 0' }}>
                  <App rec={rec} t={t} />
                </div>
              </div>
            )}
            <Chrome kind={s.kind} rect={rect} r={px(s.r)} bezel={px(s.bezel)} opacity={k} />
            <Size bytes={bytes} size={px(30)} style={{ left: screen.x + screen.w - px(20), top: screen.y + screen.h - px(48), transform: 'translateX(-100%)', opacity: sized * k }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** One screen's copy of the press: the whole frame, contained; the studio is black round it, and lightens what is under it, so overlapping copies add up to the one press as they slide together. */
function Copy({ source, rect }: { source: RefObject<HTMLCanvasElement | null>; rect: Rect }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const k = window.devicePixelRatio || 1;
  useLayoutEffect(() => {
    const c = ref.current, s = source.current;
    if (!c || !s) return;
    const g = c.getContext('2d')!;
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    const f = Math.min(c.width / s.width, c.height / s.height);
    g.drawImage(s, (c.width - s.width * f) / 2, (c.height - s.height * f) / 2, s.width * f, s.height * f);
  });
  return <canvas ref={ref} width={Math.max(1, Math.round(rect.w * k))} height={Math.max(1, Math.round(rect.h * k))}
    style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, mixBlendMode: 'lighten' }} />;
}

/** A screen's frame, generic: a bezel and a hairline; a browser's address bar with the site. */
function Chrome({ kind, rect, r, bezel, opacity }: { kind: string; rect: Rect; r: number; bezel: number; opacity: number }) {
  const hair = `0 0 0 ${px(1.5)}px rgb(255 255 255 / 0.28)`;
  return (
    <div style={{ position: 'absolute', left: rect.x - bezel, top: rect.y - bezel, width: rect.w + bezel * 2, height: rect.h + bezel * 2, borderRadius: r + bezel, opacity,
      border: `${bezel}px solid #1c1c1e`, boxShadow: hair, boxSizing: 'border-box' }}>
      {kind === 'browser' && (
        <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: px(10), padding: `0 ${px(22)}px`, background: '#1c1c1e', borderRadius: `${r}px ${r}px 0 0` }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: px(12), height: px(12), borderRadius: '50%', background: 'rgb(255 255 255 / 0.25)' }} />)}
          <span style={{ flex: 1, marginLeft: px(24), marginRight: px(60), height: px(34), borderRadius: px(17), background: 'rgb(255 255 255 / 0.08)',
            display: 'grid', placeItems: 'center', fontFamily: ui, fontSize: px(20), color: 'rgb(255 255 255 / 0.7)' }}>compresso.izaias.xyz</span>
        </div>
      )}
    </div>
  );
}
