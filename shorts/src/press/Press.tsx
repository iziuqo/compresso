import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { H, W } from '../system';
import { createPress, type Pose, type Press, type PressSetup } from './scene';

/**
 * The press as a Remotion layer: a full-frame WebGL canvas at the render's
 * own pixel density (Remotion's scale), built once per tab, drawn once per
 * frame. The first frame waits until the photos are decoded and the scene
 * is built. Photo paths in `setup` are relative to public/.
 */
export function usePress(setup: PressSetup) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [press, setPress] = useState<Press | null>(null);
  const [handle] = useState(() => delayRender('the press'));
  useEffect(() => {
    let built: Press | undefined;
    createPress(canvas.current!, { ...setup, photos: setup.photos.map((b) => ({ ...b, before: staticFile(b.before), after: staticFile(b.after) })) })
      .then((p) => { built = p; setPress(p); continueRender(handle); })
      .catch(cancelRender);
    return () => built?.dispose();
    // The setup is fixed for a composition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { canvas, press };
}

/** The canvas `usePress` draws on, drawn with `pose` on every frame; with no pose (the scene is covered) nothing is drawn. */
export function PressCanvas({ press, canvas, pose }: ReturnType<typeof usePress> & { pose: Pose | null }) {
  useLayoutEffect(() => { if (pose) press?.draw(pose); });
  const k = window.devicePixelRatio || 1;
  return <canvas ref={canvas} width={Math.round(W * k)} height={Math.round(H * k)} style={{ position: 'absolute', inset: 0, width: W, height: H }} />;
}
