export default function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0e1114" stroke="#20262d" />
      <path
        d="M9 21c2.2-6 5.4-9 9-9-1.2 2.4-1.2 4.5 0 6-3.6 0-6.8 1.2-9 3z"
        fill="#25e07a"
      />
      <path
        d="M14 11c2.2-6 5.4-9 9-9-1.2 2.4-1.2 4.5 0 6-3.6 0-6.8 1.2-9 3z"
        fill="#25e07a"
        opacity="0.55"
      />
    </svg>
  );
}
