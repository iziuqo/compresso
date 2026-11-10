// Images imported from the repo (Remotion's bundler turns them into URLs).
declare module '*.png' {
  const src: string;
  export default src;
}
