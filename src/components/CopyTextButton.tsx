"use client";

import { useState } from "react";

/** Copies a block of text to the clipboard; shows "Copied" for a moment. */
export default function CopyTextButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch { setDone(false); }
      }}
      className="btn-primary rounded-full px-5 py-2.5 text-sm"
    >
      {done ? "Copied" : label}
    </button>
  );
}
