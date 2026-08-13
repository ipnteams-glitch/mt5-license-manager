// ponytail: /portfolio — real-time + quota display
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPortfolioByEmail, getMemberByEmail, getPortfolioQuota } from "@/lib/supabase";
import type { PortfolioAccount } from "@/types";
import PortfolioClient from "./PortfolioClient";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  let accounts: PortfolioAccount[] = [];
  try {
    accounts = await getPortfolioByEmail(session.user.email);
  } catch (e) {
    console.error("Portfolio fetch failed:", e);
  }

  let quota = 0;
  try {
    const member = await getMemberByEmail(session.user.email);
    quota = getPortfolioQuota(member);
  } catch (e) {
    console.error("Quota fetch failed:", e);
  }

  return <PortfolioClient initialAccounts={accounts} initialQuota={quota} />;
}
