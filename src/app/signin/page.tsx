import type { Metadata } from "next";
import { AuthPanel } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your FlowSync driver account.",
  robots: { index: false },
};

export default function SignInPage() {
  return (
    <div className="relative min-h-[70vh]">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto flex max-w-md flex-col px-5 py-20">
        <h1 className="text-center text-3xl font-bold tracking-tight">Your driver account</h1>
        <p className="mt-2 text-center text-muted">Sign in or create an account to manage your profile and documents.</p>
        <div className="card mt-8 p-7">
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}
