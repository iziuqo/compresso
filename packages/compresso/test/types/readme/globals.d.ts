/**
 * What the READMEs' snippets take as given: the reader's own variables and
 * helpers, the frameworks they import (typed loosely: only compresso.js's
 * declarations are under test), and the CDN build's global.
 */
declare module 'react';
declare module 'vue';
declare module 'solid-js';
declare module '@angular/core';
declare module '@angular/common';

/** Plain JavaScript reads a file input's `files` from its change event's target, as the snippets do. */
interface EventTarget {
  readonly files: FileList;
}

/** The UMD build's global, from `<script src=".../compresso.umd.js">`. */
declare const Compresso: typeof import('compresso.js');

/** A picked image, and the photos and clip the planner examples work on. */
declare const file: File;
declare const photos: File[];
declare const photo: File;
declare const clip: File;
declare const originalSize: number;

/** The host's own encoder, which the planner examples plug in. */
declare function myDecode(photo: File, maxLongEdge: number): Promise<{ width: number; height: number; originalSize: number }>;
declare function myEncodedSize(format: string, quality: number): Promise<number>;
declare function myWrite(format: string, quality: number): Promise<Blob>;
declare function myFree(): void;
declare function myEncode(settings: unknown): Promise<{ result: Blob; bytes: number }>;
declare function myDelete(result: unknown): Promise<void>;
