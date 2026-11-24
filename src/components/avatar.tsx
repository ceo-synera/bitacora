export function Avatar({ name, className = "size-9 text-sm" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-medium text-white ${className}`} style={{ background: `hsl(${h} 45% 48%)` }}>
      {initials}
    </span>
  );
}
