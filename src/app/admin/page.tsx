import {
  listAllOrders,
  listAllProducts,
  listCoupons,
  listCustomers,
  listReviews,
  requireStaff,
} from "@/lib/data/admin";
import { getAllBanners, getAllBrands, getSettings } from "@/lib/data/catalog";
import { isDemo } from "@/lib/data/mode";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

/**
 * /admin — role-gated back office in the same playful skin.
 * Live mode: requires a signed-in user present in staff_roles (RLS-enforced
 * on top of this gate). Demo mode: open, with a banner.
 */
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminPage() {
  const staff = await requireStaff();

  if (!staff) {
    return <AdminLoginForm />;
  }

  const [orders, products, customers, coupons, reviews, settings, banners, brands] =
    await Promise.all([
      listAllOrders(),
      listAllProducts(),
      listCustomers(),
      listCoupons(),
      listReviews(),
      getSettings(),
      getAllBanners(),
      getAllBrands(),
    ]);

  return (
    <AdminShell
      orders={orders}
      products={products}
      customers={customers}
      coupons={coupons}
      reviews={reviews}
      settings={settings}
      banners={banners}
      brands={brands}
      isDemo={isDemo()}
    />
  );
}
