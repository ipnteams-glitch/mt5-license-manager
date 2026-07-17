// /register — สมัครตัวแทน (server component)
import { auth } from "@/lib/auth";
import { getAgentByEmail } from "@/lib/supabase";
import { redirect } from "next/navigation";
import RegisterClient from "./RegisterClient";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { ref } = await searchParams;

  // Already an agent → redirect to agent page
  const existing = await getAgentByEmail(session.user.email);
  if (existing) redirect("/agent");

  return (
    <RegisterClient email={session.user.email} name={session.user.name || ""} refCode={ref || ""} />
  );
}
