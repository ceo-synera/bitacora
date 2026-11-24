export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#4f46e5" />
      <path d="M20 14h20a6 6 0 0 1 6 6v30H24a4 4 0 0 1-4-4V14z" fill="#fff" />
      <path d="M26 24h14M26 31h14M26 38h9" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
      <circle cx="46" cy="46" r="8" fill="#fbbf24" stroke="#4f46e5" strokeWidth="3" />
      <path d="M46 41v5l3 2" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
