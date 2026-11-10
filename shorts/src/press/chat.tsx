/**
 * The Bubble's chat (wave three, 03): the send that stalls while the photo is
 * too heavy, and the payoff once it fits, the photo as a sent message, its
 * send done in a quarter second and the answers coming in. Wordless: a ring,
 * a share in figures, sizes, a heart.
 */
import { AbsoluteFill, Img } from 'remotion';
import { Glyph } from '../story';
import { ease, H, px, W } from '../system';
import { at, B, GUTTER, mix, Size, span } from './ritual';
import type { Pose, Press } from './scene';

/** The send: the share sent at each second while the photo is too heavy (it stalls), all of it in a quarter second once it fits. */
export const SENDING: [number, number][] = [[0.5, 0.03], [1, 0.06], [1.5, 0.09], [3, 0.11], [5, 0.12]];
export const SENT = B.through + 0.25;
/** The answers, coming in once it is sent; the light opens after the last one's heart. */
export const REPLIES = [24, 24.5, 25];
export const CHAT_OPEN = REPLIES[2] + 0.45;
/** Where the photo lands, in shares of the frame: right-aligned as sent messages are, cropped 4:3. */
const PHOTO = { w: 0.62, top: 0.3, h: (0.62 * W) / H * 0.75 };
/** Where the light opens from: the sent photo. */
export const CHAT_LIGHT: [number, number] = [1 - GUTTER - PHOTO.w / 2, PHOTO.top + PHOTO.h / 2];

/** The send's indicator: a ring that fills with the share sent, the share in figures, and a tick once it is all sent. */
export function Sending({ t }: { t: number }) {
  const stalled = SENDING.reduce((k, [a, share]) => (t >= a ? share : k), 0);
  const share = mix(stalled, 1, span(t, B.through, SENT, ease.standard));
  const tick = span(t, SENT, SENT + 0.2, ease.standard);
  const r = 9, c = 2 * Math.PI * r;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(12), fontVariantNumeric: 'tabular-nums' }}>
      <svg width={px(40)} height={px(40)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r={r} opacity={0.25} />
        <circle cx="12" cy="12" r={r} strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 12 12)" />
        {tick > 0 && <path d="M8 12.4 10.9 15.3 16.2 9.6" pathLength={1} strokeDasharray={`${tick} 1`} />}
      </svg>
      {Math.round(share * 100)}%
    </span>
  );
}

/**
 * The payoff: the pressed photo leaves the bubble in the scene as the photo
 * in a sent message with its new size, its send completes, and the answers
 * come in, empty bubbles from the left, the last with a heart.
 */
export function Chat({ press, p, t }: { press: Press; p: Pose; t: number }) {
  const k = span(t, B.through - 0.1, B.through + 0.45, ease.glide);
  // From the bubble's outline in the scene (its bounds in the frame) to the message.
  const corners = [press.slot.top, press.slot.bottom].flatMap((y) => [-1, 1].map((z) => press.project(p, press.gateX, y, z * press.slot.half)));
  const [x0, x1] = [Math.min(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[0]))];
  const [y0, y1] = [Math.min(...corners.map((c) => c[1])), Math.max(...corners.map((c) => c[1]))];
  const { w, top, h } = PHOTO, left = 1 - GUTTER - w;
  const box = { left: mix(x0, left, k) * W, top: mix(y0, top, k) * H, width: mix(x1 - x0, w, k) * W, height: mix(y1 - y0, h, k) * H };
  return (
    <AbsoluteFill>
      <Img src={press.photos[press.photos.length - 1].after} style={{ position: 'absolute', ...box, objectFit: 'cover', opacity: span(t, B.through - 0.1, B.through + 0.15),
        borderRadius: px(40), borderBottomRightRadius: px(10) }} />
      <Size bytes={press.total.to} size={px(36)} style={{ ...at([left + 0.01, top + h + 0.012]), opacity: k }} />
      <div style={{ position: 'absolute', ...at([1 - GUTTER, top + h + 0.012], [1, 0]), fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: px(36), letterSpacing: '0.06em', color: 'var(--ink)', opacity: k }}>
        <Sending t={t} />
      </div>
      {REPLIES.map((a, i) => {
        const r = span(t, a, a + 0.35, ease.entrance);
        const heart = span(t, a + 0.2, a + 0.45, ease.entrance);
        return r > 0 && (
          <div key={a} style={{ position: 'absolute', ...at([GUTTER, top + h + 0.06 + i * 0.048]), width: px([340, 240, 290][i]), height: px(72), borderRadius: px(36), borderBottomLeftRadius: px(10),
            background: 'rgb(255 255 255 / 0.1)', boxShadow: `inset 0 0 0 ${px(1.5)}px rgb(255 255 255 / 0.14)`, opacity: r, marginLeft: -(1 - r) * px(420) }}>
            {i === REPLIES.length - 1 && (
              <div style={{ position: 'absolute', right: -px(14), bottom: -px(18), width: px(44), height: px(44), borderRadius: '50%', background: '#1c1c1e',
                boxShadow: `0 0 0 ${px(3)}px var(--void)`, display: 'grid', placeItems: 'center', transform: `scale(${heart})` }}>
                <Glyph name="heart" size={px(24)} color="#fff" />
              </div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
