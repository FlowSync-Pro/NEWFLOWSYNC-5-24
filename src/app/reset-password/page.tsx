import type { Metadata } from "next";
import { ResetPasswordForm, TokenResetForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Set your password",
  description: "Choose a new password for your FlowSync account.",
  robots: { index: false },
};

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const email = typeof sp.email === "string" ? sp.email : "";
  const tokenFlow = !!(token && email);

  return (
    <div className="relative min-h-[70vh]">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative mx-auto flex max-w-md flex-col px-5 py-20">
        <h1 className="text-center text-3xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-center text-muted">
          {tokenFlow
            ? "Choose a new password for your account."
            : "You signed in with a temporary password. Choose a permanent one to continue."}
        </p>
        <div className="card mt-8 p-7">
          {tokenFlow ? <TokenResetForm token={token} email={email} /> : <ResetPasswordForm />}
        </div>
      </div>
    </div>
  );
}
