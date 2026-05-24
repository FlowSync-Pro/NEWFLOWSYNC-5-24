import type { Metadata } from "next";
import DriverDirectory from "@/components/DriverDirectory";

export const metadata: Metadata = {
  title: "Find a driver near you",
  description:
    "Browse verified, independent delivery and errand drivers and request a quote directly — grocery, food, furniture, courier, pharmacy, senior errands, moving, and auto parts.",
};

export default function FindADriverPage() {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <DriverDirectory />
      </div>
    </div>
  );
}
