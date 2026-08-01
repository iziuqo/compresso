/** Two plates closing on each other. The same mark as the app and the favicon. */
export default function Logo({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 3.6H21L16.5 10H7.5Z" />
      <path d="M3 20.4H21L16.5 14H7.5Z" />
    </svg>
  );
}
