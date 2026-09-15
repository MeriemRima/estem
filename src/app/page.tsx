import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingView } from "@/components/landing-view";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <LandingView />;
}

