import { redirect } from "next/navigation";
import { currentCustomer } from "@/lib/customer-session";
import { AccountDashboard } from "./account-client";

export const metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const me = await currentCustomer();
  if (!me) {
    redirect("/"); // Or redirect to a login route if we had one
  }

  // Passing the customer's identifier (email/phone) down so the dashboard knows who it is
  const identifier = me.sub;
  const isEmail = identifier.includes("@");

  return (
    <main className="mx-auto min-h-screen max-w-[1000px] px-5 py-8 text-ink">
      <AccountDashboard 
        initialName={me.name || "Customer"} 
        identifier={identifier} 
        isEmail={isEmail} 
      />
    </main>
  );
}
