import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlowSync — Drive every kind of delivery",
    short_name: "FlowSync",
    description:
      "The driver-owned marketplace for grocery, food, furniture, courier, pharmacy, senior errands, moving, and auto parts delivery.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090b",
    theme_color: "#07090b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
