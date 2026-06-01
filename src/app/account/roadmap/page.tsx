import { redirect } from "next/navigation";

// The Roadmap is now the main /account dashboard. Old bookmarks/links to
// /account/roadmap land here and are forwarded.
export default function RoadmapRedirectPage() {
  redirect("/account");
}
