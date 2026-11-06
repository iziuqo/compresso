import { Html5Audio, Sequence, staticFile } from 'remotion';

/** The sounds sound/build.py makes. Every Short is scored from these alone. */
export type Sound = 'press-logo' | 'press-hit' | 'glass-tick' | 'shutter' | 'knock' | 'counter-tick';

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
