import { Html5Audio, interpolate, Sequence, staticFile } from 'remotion';

/** The sounds sound/build.py makes. Every Short is scored from these alone. */
export type Sound = 'press-logo' | 'press-hit' | 'glass-tick' | 'shutter' | 'knock' | 'counter-tick'
  | 'tap' | 'error' | 'exhale' | 'send' | 'thud' | 'pop' | 'chime' | 'zip' | 'flick' | 'deflate'
  | 'com' | 'press-air' | 'glass-o' | 'swell' | 'bloom' | 'rise';

/** The looping beds sound/build.py makes for the everyday stories, all at one loudness. */
export type BedSound = 'night' | 'beach' | 'kitchen' | 'heartbeat' | 'clock' | 'room';

/** Semitones as a playback pitch: 12 is an octave up. */
export const semitones = (n: number) => 2 ** (n / 12);

/**
 * One sound starting at frame `at`. A negative frame starts it partway, which
 * is how a sound that began before a loop's first frame carries across it.
 */
export function Cue({ sound, at, volume = 1, pitch = 1 }: { sound: Sound; at: number; volume?: number; pitch?: number }) {
  return (
    <Sequence from={Math.round(at)} layout="none">
      <Html5Audio src={staticFile(`sound/${sound}.wav`)} volume={volume} toneFrequency={pitch} />
    </Sequence>
  );
}

/**
 * A bed looping under a whole Short, its level in dB at keyframes
 * `[frame, dB]` (straight lines between them, held at both ends). Below
 * -60 dB it is silent.
 */
export function Bed({ sound, levels }: { sound: BedSound; levels: [number, number][] }) {
  const db = (f: number) => interpolate(f, levels.map(([at]) => at), levels.map(([, v]) => v), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <Html5Audio src={staticFile(`sound/${sound}.wav`)} loop volume={(f) => (db(f) <= -60 ? 0 : 10 ** (db(f) / 20))} />;
}
