"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Meta (Facebook) Pixel — base code on every page; PageView on client route
// changes. Supports multiple pixel IDs for migration scenarios: each
// fbq('init', ID) registers an additional pixel, and any subsequent
// fbq('track', ...) call fires the event to ALL initialized pixels
// automatically. eventID-based dedup applies across all of them.
export default function MetaPixel({ pixelIds }: { pixelIds: string[] }) {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false; // initial PageView is fired by the inline init script
      return;
    }
    const w = window as unknown as { fbq?: (...a: unknown[]) => void };
    // Fires to every initialized pixel — no per-pixel loop needed.
    w.fbq?.("track", "PageView");
  }, [pathname]);

  if (pixelIds.length === 0) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="beforeInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          ${pixelIds.map((id) => `fbq('init', '${id}');`).join("\n          ")}
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {pixelIds.map((id) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={id}
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
            alt=""
          />
        ))}
      </noscript>
    </>
  );
}
