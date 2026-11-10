"""Builds "the press", the sonic logo every Short shares, from four foley
one-shots in sound/src (ElevenLabs sound effects, never used as they came out).

    python3 sound/build.py        needs numpy, scipy and ffmpeg

The shape: a rubbed-glass hum rising for 1.5 s, half a second of air, then the
press (a layered hit) and a glass tick. Every step is deterministic, so the
logo is identical in every Short. Writes public/sound/press-logo.wav and
press-hit.wav (the hit alone, for the clamp), mastered for phone speakers,
and the cleaned one-shots the Shorts place on their timelines: the glass
tick, a leaf shutter, a muted wood block and one tick of a mechanical counter.

The everyday stories (wave two) add foley and room tone from the same
source: one-shots trimmed like the rest, and beds (a room, a beach, a
kitchen, a heartbeat, a clock) generated as seamless loops and levelled to
one loudness, so each Short sets a bed's level by its role alone.
"""
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, resample, sosfilt

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'sound/src'
OUT = ROOT / 'public/sound'


def load(name):
    """Decode a one-shot to mono float at SR."""
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC / f'{name}.mp3', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.int16).astype(np.float64) / 32768


def filt(x, kind, f, order=4):
    return sosfilt(butter(order, f, btype=kind, fs=SR, output='sos'), x)


def speed(x, r):
    """Play r times faster, which also shifts pitch by r."""
    return resample(x, int(len(x) / r))


def trim(x, db=-24):
    """Start a one-shot 3 ms before it first comes within `db` of its peak."""
    k = int(SR * .002)
    env = np.convolve(np.abs(x), np.ones(k) / k, 'same')
    i = int(np.argmax(env > env.max() * 10 ** (db / 20)))
    return x[max(i - int(SR * .003), 0):]


def fade(x, a=.002, b=.02):
    n, ia, ib = len(x), int(SR * a), int(SR * b)
    e = np.ones(n)
    e[:ia] = np.linspace(0, 1, ia)
    e[n - ib:] = np.linspace(1, 0, ib) ** 2
    return x * e


def place(bus, x, t, g=1.0):
    i = int(t * SR)
    bus[i:i + len(x)] += x[:len(bus) - i] * g


def hit():
    """A clunk, a bright transient, and an octave-down body for weight on small speakers."""
    core = fade(trim(load('press-core'))[:int(SR * .45)], b=.15)
    snap = fade(filt(trim(load('press-snap'))[:int(SR * .12)], 'highpass', 1500), b=.06)
    body = fade(filt(speed(core, .5), 'lowpass', 420)[:int(SR * .5)], b=.25)
    body = np.tanh(body * 2.5) / np.tanh(2.5)  # gentle saturation: harmonics a phone can play
    tick = fade(trim(load('glass-tick'))[:int(SR * .6)], b=.35)
    bus = np.zeros(int(SR * .7))
    for x, t, g in ((core, 0, 1), (snap, 0, .55), (body, .004, .8), (tick, .11, .32)):
        place(bus, x, t, g)
    return fade(filt(bus, 'highpass', 60, 2), a=0, b=.12)


def hum(length=1.5):
    """Rubbed glass an octave down, looped smooth, rising two semitones, ending on a dead cut."""
    seg = speed(filt(load('glass-hum'), 'highpass', 120, 2), .5)
    n, xf = int(SR * length), int(SR * .08)
    bus, pos = np.zeros(n), 0
    while pos < n:  # crossfaded loop
        s = seg.copy()
        s[:xf] *= np.linspace(0, 1, xf)
        s[-xf:] *= np.linspace(1, 0, xf)
        bus[pos:pos + len(s)] += s[:n - pos]
        pos += len(s) - xf
    idx = np.cumsum(np.linspace(1, 2 ** (2 / 12), n))  # variable-rate read: the pitch rises
    bus = np.interp(idx / idx[-1] * (n - 1), np.arange(n), bus)
    k = int(SR * .05)
    bus = bus / (np.convolve(np.abs(bus), np.ones(k) / k, 'same') + 1e-3) * .05  # flatten the rub's wobble
    bus = filt(bus, 'lowpass', 2500, 2) * np.linspace(.15, 1, n) ** 2 * 1.8
    bus[-int(SR * .004):] *= np.linspace(1, 0, int(SR * .004))  # dead, but no click
    return bus


def save(name, x, louder=False):
    """16-bit WAV peaking at -1 dBFS. `louder` adds 4 dB through a limiter slow
    enough (2 ms) to keep the transient, for the press on phone speakers."""
    path = OUT / f'{name}.wav'
    wavfile.write(path, SR, (x / np.abs(x).max() * 10 ** (-1 / 20) * 32767).astype(np.int16))
    if louder:
        raw = path.rename(OUT / f'{name}.raw.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'volume=4dB,alimiter=limit=0.89:attack=2:release=80:level=false',
                        '-ar', str(SR), path], check=True)
        raw.unlink()


def one_shot(name, length, highpass=None, db=-24):
    """One hit from a source, from 3 ms before it starts (see trim), faded over its last 40%."""
    x = trim(load(name), db)[:int(SR * length)]
    return fade(filt(x, 'highpass', highpass, 2) if highpass else x, b=length * .4)


OUT.mkdir(parents=True, exist_ok=True)
h = hit()
logo = np.zeros(int(SR * 2.75))
place(logo, hum(), 0)
place(logo, h, 2.0)
save('press-logo', logo, louder=True)
save('press-hit', h, louder=True)
# The one-shots each Short places on its own timeline.
save('glass-tick', one_shot('glass-tick', .6))
save('shutter', one_shot('shutter', .14, highpass=300, db=-8))  # skip the faint pre-click
save('knock', one_shot('wood-block', .22, highpass=80))
save('counter-tick', one_shot('counter', .045, highpass=400))
# Wave two: the everyday stories.
for name, length, hp in (('tap', .25, 200), ('error', .9, 60), ('exhale', 1.6, 80), ('send', 1.2, 150), ('thud', .8, 50),
                         ('pop', .5, 150), ('chime', 1.8, 300), ('zip', 1.0, 120), ('flick', .5, 200), ('deflate', 1.0, 60)):
    save(name, one_shot(name, length, highpass=hp))


# Wave three: the sound logo spells the name. Com (the plate lands), press
# (the air leaving), o (one glass note). Built from the same recordings, so it
# sits with the rest; the glass note is the tick's own partials rung long.


def stretch(x, length, grain=.08, seed=3):
    """Air `length` s long from a short breath: grains from its steady middle, overlapped, never repeating in step."""
    rng = np.random.default_rng(seed)
    g, n = int(SR * grain), int(SR * length)
    body = x[int(len(x) * .15):int(len(x) * .7)]
    win, bus, pos = np.hanning(g), np.zeros(n + g), 0
    while pos < n:
        i = rng.integers(0, len(body) - g)
        bus[pos:pos + g] += body[i:i + g] * win
        pos += g // 4
    return bus[:n] / 2


def glide(x, start, end):
    """Read `x` at a rate moving from `start` to `end`: the pitch follows."""
    idx = np.cumsum(np.linspace(start, end, len(x)))
    idx = idx / idx[-1] * (len(x) - 1) * (start + end) / 2
    return np.interp(np.clip(idx, 0, len(x) - 1), np.arange(len(x)), x)


def entrance_speed(n):
    """How fast the plate moves through the squeeze: the derivative of the app's entrance curve, by sampling it."""
    u = np.linspace(0, 1, 4096)
    x1, y1, x2, y2 = .16, 1, .3, 1
    bx = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3
    by = 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u ** 2 * y2 + u ** 3
    v = np.gradient(by, bx)
    return np.interp(np.linspace(0, 1, n), bx, v / v.max())


def com():
    """Com: the plate landing. A low soft thump, felt more than heard: the press's core, its body an octave down, no snap."""
    core = filt(fade(trim(load('press-core'))[:int(SR * .6)], b=.3), 'lowpass', 380)
    body = np.tanh(filt(speed(core, .5), 'lowpass', 160)[:int(SR * .7)] * 2) / np.tanh(2)
    bus = np.zeros(int(SR * .8))
    place(bus, core, 0, 1)
    place(bus, fade(body, b=.4), .006, .9)
    return fade(filt(bus, 'highpass', 32, 2), a=0, b=.3)


def press_air(length=2.5):
    """press: the air leaving as the plate squeezes, loudest while it moves fastest, falling an octave, a faint glass creak at the start."""
    n = int(SR * length)
    hiss = filt(stretch(trim(load('exhale')), length), 'lowpass', 7000)
    low = filt(stretch(trim(load('deflate')), length, grain=.12, seed=5), 'lowpass', 900)
    air = glide(hiss + low * 1.4, 1.0, .5) * (entrance_speed(n) * .85 + .15) ** 1.2
    creak = filt(speed(load('glass-hum')[:int(SR * .9)], 1.5), 'highpass', 900)[:int(SR * .5)]
    place(air, fade(creak, a=.05, b=.25), .02, .12)
    return fade(air, a=.004, b=.6)


def glass_o(length=4.0):
    """o: one struck glass. The tick's own attack, then its partials (1308, 2616 and 6126 Hz) ringing on, each pair a hair apart so the ring breathes."""
    attack = fade(trim(load('glass-tick'))[:int(SR * .12)], b=.06)
    t = np.arange(int(SR * length)) / SR
    ring = sum(g * np.exp(-t / tau) * (np.sin(2 * np.pi * f * t) + np.sin(2 * np.pi * (f + beat) * t + 1.1))
               for f, g, tau, beat in ((1308, 1, 1.4, .7), (2616, .45, .8, 1.3), (6126, .12, .3, 2.1)))
    ring *= np.minimum(1, t / .004)
    bus = np.zeros(len(t))
    place(bus, ring / np.abs(ring).max() * .5, 0)
    place(bus, attack, 0, .9)
    return fade(bus, a=0, b=1.2)


def swell(length=1.6):
    """The studio's lights coming up: the rubbed glass, low and soft, in and out."""
    x = filt(hum(length), 'lowpass', 700)
    return x * np.sin(np.linspace(0, np.pi, len(x))) ** 1.5


def bloom(length=2.5):
    """Air that opens and settles as the photo's colours flood through the slot."""
    x = filt(stretch(trim(load('exhale')), length, grain=.14, seed=9), 'lowpass', 3500)
    u = np.linspace(0, 1, len(x))
    return x * np.minimum(1, u / .35) ** 2 * np.exp(-np.maximum(0, u - .35) * 2.2)


def room(length=8.0):
    """Studio quiet: air under 200 Hz, looped seamlessly, at -20 dBFS RMS like the other beds."""
    rng = np.random.default_rng(1)
    x = filt(np.cumsum(rng.standard_normal(int(SR * length) + SR)) * .02, 'bandpass', [25, 200], 2)[SR:]
    k = int(SR * .5)
    x[:k] = x[:k] * np.linspace(0, 1, k) + x[-k:] * np.linspace(1, 0, k)
    x = x[:-k]
    return x / np.sqrt(np.mean(x ** 2)) * 10 ** (-20 / 20)


for name, x in (('com', com()), ('press-air', press_air()), ('glass-o', glass_o()), ('swell', swell()), ('bloom', bloom()),
                ('rise', glide(press_air(1.0)[::-1], .7, 1.0))):
    save(name, x, louder=name == 'com')
wavfile.write(OUT / 'room.wav', SR, (np.clip(room(), -1, 1) * 32767).astype(np.int16))


def bed(name):
    """A seamless loop at -20 dBFS RMS: generated looping, so only its ends get a 20 ms crossfade."""
    x = filt(load(name), 'highpass', 40, 2)
    k = int(SR * .02)
    x[:k] = x[:k] * np.linspace(0, 1, k) + x[-k:] * np.linspace(1, 0, k)
    x = x[:-k]
    return x / np.sqrt(np.mean(x ** 2)) * 10 ** (-20 / 20)


for name in ('night', 'beach', 'kitchen', 'heartbeat', 'clock'):
    x = bed(name)
    wavfile.write(OUT / f'{name}.wav', SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
print('wrote', OUT)
