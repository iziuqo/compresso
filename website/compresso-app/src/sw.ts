/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

/**
 * Everything this app needs is precached: the shell, the fonts, the icons and
 * the compression worker chunk. There is no runtime strategy for user content
 * because no user content ever touches the network — images never leave the
 * device, so "offline" here is simply the normal operating mode.
 */
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/**
 * The app answers at /compresso — no trailing slash — but the precache is keyed
 * by /compresso/index.html. Workbox only appends a directory index to URLs that
 * already end in a slash, so without this route a cold offline visit to the
 * canonical URL finds nothing. Every navigation this worker sees is inside its
 * own scope, so binding them all to the shell is exactly right.
 */
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Activation is host-driven: a queue mid-flight must not be torn out from under
// the user by an update that happened to finish downloading.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string })?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', () => self.clients.claim());
