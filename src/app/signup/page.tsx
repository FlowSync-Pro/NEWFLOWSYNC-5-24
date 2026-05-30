import { redirect } from "next/navigation";

// Account creation now happens through paid checkout (/pricing). Any old
// "free signup" links/bookmarks land here and are sent to pricing.
export default function SignupPage() {
  redirect("/pricing");
}
