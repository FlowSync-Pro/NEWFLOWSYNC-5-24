import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your FlowSync password.",
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-[70vh]">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto flex max-w-md flex-col px-5 py-20">
        <h1 className="text-center text-3xl font-bold tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-center text-muted">Enter your email and we&apos;ll send you a reset link.</p>
        <div className="card mt-8 p-7">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
