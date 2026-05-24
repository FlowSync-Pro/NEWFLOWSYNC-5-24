import { Suspense } from "react";
import type { Metadata } from "next";
import SignupFlow from "@/components/SignupFlow";

export const metadata: Metadata = {
  title: "Become a driver — FlowSync",
  description: "Sign up, pick your service, and build a profile that matches the work you do.",
};

export default function SignupPage() {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-80" />
      <div className="relative">
        <Suspense fallback={<div className="py-24 text-center text-muted">Loading…</div>}>
          <SignupFlow />
        </Suspense>
      </div>
    </div>
  );
}
