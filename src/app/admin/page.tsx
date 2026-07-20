import Link from "next/link";
import {
  listAllOrders,
  listAllProducts,
  listCoupons,
  listCustomers,
  listReviews,
  requireStaff,
} from "@/lib/data/admin";
import { getSettings } from "@/lib/data/catalog";
import { isDemo } from "@/lib/data/mode";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

/**
 * /admin — role-gated back office in the same playful skin.
 * Live mode: requires a signed-in user present in staff_roles (RLS-enforced
 * on top of this gate). Demo mode: open, with a banner.
 */
export default async function AdminPage() {
  const staff = await requireStaff();

  if (!staff) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream p-6 text-ink">
        <div className="max-w-[440px] rounded-modal border-4 border-ink bg-paper p-8 text-center shadow-hard-6">
          <div className="text-[40px]">🔒</div>
          <h1 className="mt-2 font-display text-[24px] font-extrabold">Staff only</h1>
          <p className="mt-2 text-mute">
            Sign in on the store with a staff phone number, then come back here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-pill border-3 border-ink bg-brand px-5 py-2.5 font-display font-extrabold text-white shadow-hard-3"
          >
            ← Back to store
          </Link>
        </div>
      </main>
    );
  }

  const [orders, products, customers, coupons, reviews, settings] = await Promise.all([
    listAllOrders(),
    listAllProducts(),
    listCustomers(),
    listCoupons(),
    listReviews(),
    getSettings(),
  ]);

  return (
    <AdminShell
      orders={orders}
      products={products}
      customers={customers}
      coupons={coupons}
      reviews={reviews}
      settings={settings}
      isDemo={isDemo()}
    />
  );
}
