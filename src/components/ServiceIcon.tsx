import type { ServiceId } from "@/lib/services";

const PATHS: Record<ServiceId, React.ReactNode> = {
  grocery: (
    <>
      <path d="M3 4h2l2.4 12.5a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.78L21 8H6" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </>
  ),
  food: (
    <>
      <path d="M5 3v8a3 3 0 0 0 3 3v7M8 3v6M11 3v6" />
      <path d="M18 3c-1.5 1-2.5 3-2.5 6 0 2 1 2.5 2.5 2.5V21" />
    </>
  ),
  furniture: (
    <>
      <path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
      <path d="M3 11a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2" />
      <path d="M5 19v2M19 19v2" />
    </>
  ),
  courier: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </>
  ),
  pharmacy: (
    <>
      <path d="M9 3h6M12 3v4" />
      <rect x="6" y="7" width="12" height="14" rx="2" />
      <path d="M12 11v6M9 14h6" />
    </>
  ),
  senior: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21v-2a4 4 0 0 1 4-4h1" />
      <path d="M16 13v8M13 16h6" />
    </>
  ),
  moving: (
    <>
      <path d="M2 7h11v8H2zM13 10h4l3 3v2h-7" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  "auto-parts": (
    <>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" />
      <path d="M19.4 13a7.4 7.4 0 0 0 .1-2l1.9-1.4-2-3.4-2.2.9a7.5 7.5 0 0 0-1.7-1l-.3-2.3h-4l-.3 2.3a7.5 7.5 0 0 0-1.7 1l-2.2-.9-2 3.4L4.5 11a7.4 7.4 0 0 0 0 2l-1.9 1.4 2 3.4 2.2-.9a7.5 7.5 0 0 0 1.7 1l.3 2.3h4l.3-2.3a7.5 7.5 0 0 0 1.7-1l2.2.9 2-3.4z" />
    </>
  ),
};

export default function ServiceIcon({
  id,
  className = "h-6 w-6",
}: {
  id: ServiceId;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
