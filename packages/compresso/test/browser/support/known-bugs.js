/** `itTracked()` for the browser tests, bound to the engine running them. See test/support/known-failures.js. */
import { it } from 'vitest';
import { server } from 'vitest/browser';
import { tracked } from '../../support/known-failures.js';

export const itTracked = tracked(it, server.browser);
