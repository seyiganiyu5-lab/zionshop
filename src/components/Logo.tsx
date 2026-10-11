import { useId } from "react";

export function LogoMark({ size = 32 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      <path d="M9 8.5h14v3.4L14.2 20.5H23v3H9v-3.4l8.8-8.6H9z" fill="#fff" />
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight text-fg">Zionshop</span>
    </span>
  );
}
