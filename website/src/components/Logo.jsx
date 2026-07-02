export default function Logo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" className="fill-cobalt" />
      <circle cx="16" cy="16" r="9.5" stroke="white" strokeWidth="3.5" fill="none" />
    </svg>
  );
}
