import {
  listAllOrders,
  listAllProducts,
  listCoupons,
  listCustomers,
  listPendingApprovals,
  listReviews,
  listStaffAccounts,
  requireStaff,
} from "@/lib/data/admin";
import { getAllBanners, getAllBrands, getSettings } from "@/lib/data/catalog";
import { isDemo } from "@/lib/data/mode";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const staff = await requireStaff();

  if (!staff) {
    return <AdminLoginForm />;
  }

  const [orders, products, customers, coupons, reviews, settings, banners, brands, staffAccounts, pendingApprovals] =
    await Promise.all([
      listAllOrders(),
      listAllProducts(),
      listCustomers(),
      listCoupons(),
      listReviews(),
      getSettings(),
      getAllBanners(),
      getAllBrands(),
      listStaffAccounts(),
      listPendingApprovals(),
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
      staffAccounts={staffAccounts}
      pendingApprovals={pendingApprovals}
      currentStaff={staff}
      isDemo={isDemo()}
    />
  );
}
