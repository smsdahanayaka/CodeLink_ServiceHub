import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (session) {
    // Redirect to dashboard - the dashboard page is at (dashboard)/page.tsx
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
