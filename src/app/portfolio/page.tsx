import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPortfolioByEmail } from "@/lib/sheets";
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

  return <PortfolioClient initialAccounts={accounts} />;
}
