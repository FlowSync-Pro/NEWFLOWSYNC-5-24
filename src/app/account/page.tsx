import type { Metadata } from "next";
import AccountEditor from "@/components/AccountEditor";

export const metadata: Metadata = {
  title: "Edit your account",
  description: "Update your driver profile, upload your documents, and get verified on FlowSync.",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <div className="relative">
      <div className="glow-radial pointer-events-none absolute inset-0 h-72" />
      <div className="relative">
        <AccountEditor />
      </div>
    </div>
  );
}
