import { LandingPage } from "@/components/landing/landing-page";

// Old finder links (/?max=...&view=map) are redirected to /find in src/proxy.ts,
// so this page stays fully static.
export default function Home() {
  return <LandingPage />;
}
