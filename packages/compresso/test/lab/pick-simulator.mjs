/**
 * Prints "<udid> <iOS version> <device name>" for an iPhone simulator on the
 * oldest or newest iOS runtime installed: `node pick-simulator.mjs oldest`.
 * CI boots it and opens the lab page in its Safari (see lab.test.js).
 */
import { execFileSync } from 'node:child_process';

const which = process.argv[2];
if (which !== 'oldest' && which !== 'newest') throw new Error('usage: node pick-simulator.mjs oldest|newest');
const { devices } = JSON.parse(execFileSync('xcrun', ['simctl', 'list', '--json', 'devices', 'available'], { encoding: 'utf8' }));
const iphones = Object.entries(devices)
  .filter(([runtime]) => runtime.includes('.iOS-'))
  .map(([runtime, list]) => ({ version: runtime.split('.iOS-')[1].split('-').map(Number), phone: list.find((d) => d.name.startsWith('iPhone')) }))
  .filter(({ phone }) => phone)
  .sort((a, b) => a.version[0] - b.version[0] || (a.version[1] ?? 0) - (b.version[1] ?? 0));
if (!iphones.length) throw new Error('no iPhone simulator is installed');
const { version, phone } = which === 'oldest' ? iphones[0] : iphones.at(-1);
console.log(phone.udid, version.join('.'), phone.name);
