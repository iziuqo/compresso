/**
 * One App Store screen in its device frame, in the visitor's language. Cut
 * from the store kit by scripts/generate-early-assets.mjs, so it is always a
 * real screen of the build that ships. The intrinsic size is declared, so the
 * box is reserved before the file lands.
 */
export default function Phone({ slug, screen, alt, className = '', priority = false }) {
  const src = `/early/${slug}/${screen}`;
  return (
    <picture className={`ea-phone ${className}`}>
      <source type="image/avif" srcSet={`${src}.avif`} />
      <img
        src={`${src}.webp`}
        alt={alt}
        width={640}
        height={1403}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
      />
    </picture>
  );
}
