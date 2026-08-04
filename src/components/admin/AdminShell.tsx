"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Banner,
  Brand,
  Coupon,
  CustomerRecord,
  Order,
  OrderStatus,
  PendingApproval,
  Product,
  Review,
  StaffAccountPublic,
  StaffRole,
  StoreSettings,
} from "@/lib/types";
import { BUSINESS, inr } from "@/lib/constants";
import { Badge, Card, Modal, Pill } from "@/components/ui";
import { logoutAdminAction, refundOrderAction, setOrderStatusAction, updateProductStockAction } from "@/app/admin/actions";
import {
  AnalyticsTab,
  BoxMediaTab,
  CouponsTab,
  CustomersTab,
  ProductsTab,
  ReportsTab,
  ReviewsTab,
  SettingsTab,
} from "./tabs";
import { BannersTab, BrandsTab } from "./merch-tabs";
import { StaffTab } from "./StaffTab";
import { ApprovalsTab } from "./ApprovalsTab";

export interface AdminProps {
  orders: Order[];
  products: Product[];
  customers: CustomerRecord[];
  coupons: Coupon[];
  reviews: Review[];
  settings: StoreSettings;
  banners: Banner[];
  brands: Brand[];
  staffAccounts?: StaffAccountPublic[];
  pendingApprovals?: PendingApproval[];
  currentStaff?: { userId: string; username: string; role: StaffRole };
  isDemo: boolean;
}

const TABS = [
  ["dashboard", "📊 Dashboard"],
  ["analytics", "📈 Analytics"],
  ["orders", "🚚 Orders"],
  ["products", "📦 Products"],
  ["approvals", "🔔 Approvals"],
  ["staff", "👥 Staff & Roles"],
  ["boxMedia", "🖼️ Box Media"],
  ["banners", "🖼️ Banners"],
  ["brands", "🏭 Brands"],
  ["customers", "👥 Customers"],
  ["coupons", "🏷️ Coupons"],
  ["reviews", "⭐ Reviews"],
  ["reports", "📄 GST Reports"],
  ["settings", "⚙️ Settings"],
] as const;

const TAB_COLORS: Record<(typeof TABS)[number][0], { bg: string; activeBg: string }> = {
  dashboard: { bg: "#FFE1A8", activeBg: "#FFC857" },
  analytics: { bg: "#D6E8B0", activeBg: "#A7E052" },
  orders: { bg: "#C7E9FF", activeBg: "#70C2FF" },
  products: { bg: "#FFCBD9", activeBg: "#FF8DA9" },
  approvals: { bg: "#FFE1A8", activeBg: "#FFC857" },
  staff: { bg: "#B9EBDD", activeBg: "#52D1AF" },
  boxMedia: { bg: "#FFE66D", activeBg: "#FFD000" },
  banners: { bg: "#E2D4F9", activeBg: "#B892F7" },
  brands: { bg: "#FFD6A5", activeBg: "#FFAB52" },
  customers: { bg: "#B9EBDD", activeBg: "#52D1AF" },
  coupons: { bg: "#FFE66D", activeBg: "#FFD000" },
  reviews: { bg: "#FBD0EA", activeBg: "#F78BD1" },
  reports: { bg: "#A0D2EB", activeBg: "#4DA8DA" },
  settings: { bg: "#DDD0FE", activeBg: "#A78BFA" },
};

export function AdminShell(props: AdminProps) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("dashboard");
  const tabsRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      // Skip 7 tabs (~900px scroll width) per arrow click
      const scrollAmount = direction === "left" ? -900 : 900;
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="bg-ink px-3 py-[9px] text-center text-[14px] font-extrabold text-ribbon">
        🛠️ {BUSINESS.name} — Admin
        {props.isDemo && " · DEMO MODE (changes reset on restart)"}
      </div>
      <div className="mx-auto max-w-[1080px] px-5 pb-16 pt-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="btn-press rounded-pill border-2.5 border-ink bg-paper px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2"
            >
              ← Store
            </Link>
            <h1 className="font-display text-[24px] font-extrabold">Admin</h1>
          </div>
          <button
            type="button"
            onClick={async () => {
              await logoutAdminAction();
              router.refresh();
            }}
            className="btn-press rounded-pill border-2.5 border-ink bg-[#FFCBD9] px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2 hover:bg-[#E24B4A] hover:text-white transition-all cursor-pointer"
          >
            🔒 Lock Admin
          </button>
        </div>

        {/* Tab Navigation Section with Left (◀) & Right (▶) Arrows */}
        <div className="relative mb-4 flex items-center gap-1.5 rounded-card border-3 border-ink bg-[#FFFDF7] p-2 shadow-hard-3">
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            aria-label="Scroll tabs left"
            className="btn-press shrink-0 flex h-9 w-9 items-center justify-center rounded-full border-2.5 border-ink bg-[#FFE1A8] font-display text-[14px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] active:scale-90 transition-all cursor-pointer"
            title="Scroll left"
          >
            ◀
          </button>

          <div
            ref={tabsRef}
            className="flex flex-1 gap-2 overflow-x-auto scrollbar-none no-scrollbar scroll-smooth py-0.5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {TABS.map(([id, label]) => {
              const colors = TAB_COLORS[id];
              const isActive = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  style={{ background: isActive ? colors.activeBg : colors.bg }}
                  className={`btn-press whitespace-nowrap rounded-pill border-2.5 border-ink px-4 py-2 font-display text-[13px] font-extrabold text-ink transition-all cursor-pointer ${isActive
                      ? "shadow-hard-3 scale-105 border-3 ring-2 ring-ink/20"
                      : "shadow-hard-2 hover:opacity-100 opacity-90"
                    }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollTabs("right")}
            aria-label="Scroll tabs right"
            className="btn-press shrink-0 flex h-9 w-9 items-center justify-center rounded-full border-2.5 border-ink bg-[#FFE1A8] font-display text-[14px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] active:scale-90 transition-all cursor-pointer"
            title="Scroll right"
          >
            ▶
          </button>
        </div>

        {tab === "dashboard" && <Dashboard {...props} />}
        {tab === "analytics" && <AnalyticsTab orders={props.orders} products={props.products} customers={props.customers} />}
        {tab === "orders" && <OrdersBoard orders={props.orders} />}
        {tab === "products" && <ProductsTab products={props.products} settings={props.settings} />}
        {tab === "approvals" && <ApprovalsTab pendingApprovals={props.pendingApprovals ?? []} />}
        {tab === "staff" && <StaffTab staffAccounts={props.staffAccounts ?? []} />}
        {tab === "boxMedia" && <BoxMediaTab settings={props.settings} />}
        {tab === "banners" && <BannersTab banners={props.banners} />}
        {tab === "brands" && <BrandsTab brands={props.brands} />}
        {tab === "customers" && <CustomersTab customers={props.customers} orders={props.orders} />}
        {tab === "coupons" && <CouponsTab coupons={props.coupons} />}
        {tab === "reviews" && <ReviewsTab reviews={props.reviews} products={props.products} />}
        {tab === "reports" && <ReportsTab orders={props.orders} products={props.products} />}
        {tab === "settings" && <SettingsTab settings={props.settings} />}
      </div>
    </div>
  );
}

/* ── CSV Exporter Helper ─────────────────────────────────────────────────── */
function exportOrdersToCSV(orders: Order[]) {
  const headers = [
    "Order No",
    "Customer Name",
    "Phone",
    "Status",
    "Payment Method",
    "Payment Status",
    "Items Count",
    "Total (INR)",
    "Placed At",
  ];
  const rows = orders.map((o) => [
    o.order_no,
    `"${(o.address_snapshot.name || "").replace(/"/g, '""')}"`,
    `"${o.address_snapshot.phone || ""}"`,
    o.status,
    o.payment_method,
    o.payment_status,
    o.items.reduce((s, i) => s + i.qty, 0),
    o.total,
    new Date(o.placed_at).toLocaleString("en-IN"),
  ]);

  const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rasi_orders_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Dashboard: today's numbers on one screen ────────────────────────────── */
function Dashboard({ orders, products }: AdminProps) {
  const router = useRouter();
  const [restocking, setRestocking] = useState<string | null>(null);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const active = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned");
  const revenueSince = (d: Date) =>
    active.filter((o) => new Date(o.placed_at) >= d).reduce((s, o) => s + o.total, 0);
  const todayOrders = active.filter((o) => new Date(o.placed_at) >= startOfDay);
  const codUnreconciled = orders
    .filter((o) => o.payment_method === "cod" && o.payment_status === "cod_pending" && o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter(
    (p) => p.status === "active" && p.stock <= p.low_stock_threshold,
  );

  const metrics: [string, string | number, string][] = [
    ["Today's orders", todayOrders.length, "#C7E9FF"],
    ["Revenue today", inr(revenueSince(startOfDay)), "#FFE1A8"],
    ["Revenue this week", inr(revenueSince(startOfWeek)), "#D6E8B0"],
    ["Revenue this month", inr(revenueSince(startOfMonth)), "#FBD0EA"],
    ["COD to collect", inr(codUnreconciled), "#FFCBD9"],
  ];

  const handleRestock = async (productId: string) => {
    setRestocking(productId);
    await updateProductStockAction(productId, 10);
    setRestocking(null);
    router.refresh();
  };

  return (
    <div>
      {/* Quick Action Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border-3 border-ink bg-white p-3.5 shadow-hard-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-[15px] font-extrabold text-ink">⚡ Quick Tools:</span>
          <button
            type="button"
            onClick={() => exportOrdersToCSV(orders)}
            className="btn-press rounded-pill border-2 border-ink bg-[#D6E8B0] px-3 py-1 font-display text-[12px] font-extrabold shadow-hard-2 hover:opacity-90 cursor-pointer"
          >
            📥 Export Orders CSV
          </button>
        </div>
        <div className="text-[12px] font-bold text-mute">
          Live Store Metrics · Rasi Mom & Baby
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {metrics.map(([label, value, bg]) => (
          <div key={label} className="rounded-card border-3 border-ink p-4 shadow-hard-4" style={{ background: bg }}>
            <div className="text-[12px] font-extrabold uppercase text-[#5A5268]">{label}</div>
            <div className="mt-1 font-display text-[22px] font-extrabold">{value}</div>
          </div>
        ))}
      </div>

      <Card className="mt-4 p-[18px]">
        <h3 className="mb-2.5 font-display text-[18px] font-extrabold text-ink">⚠️ Inventory Alerts (Low Stock)</h3>
        {lowStock.length === 0 ? (
          <p className="text-[14px] text-mute">All active products are well stocked! 👍</p>
        ) : (
          <div className="grid gap-2">
            {lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b-2 border-dashed border-[#E5DBCC] pb-2 text-[14px]"
              >
                <div>
                  <span className="font-bold text-ink">{p.name_en}</span>
                  <span className="ml-2 rounded-full bg-[#FFE1A8] px-2 py-0.5 text-[11px] font-extrabold text-[#946800]">
                    {p.stock === 0 ? "Out of Stock" : `${p.stock} left`}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={restocking === p.id}
                  onClick={() => handleRestock(p.id)}
                  className="btn-press rounded-pill border-2 border-ink bg-[#C7E9FF] px-3 py-1 text-[12px] font-extrabold shadow-hard-2 hover:bg-[#D6E8B0] cursor-pointer disabled:opacity-50 transition-all"
                >
                  {restocking === p.id ? "Restocking..." : "⚡ Restock +10"}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4 p-[18px]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-[18px] font-extrabold text-ink">Recent Orders 🚚</h3>
          {orders.length > 0 && (
            <button
              type="button"
              onClick={() => exportOrdersToCSV(orders)}
              className="text-[12px] font-extrabold text-brand underline hover:text-ink transition-colors cursor-pointer"
            >
              Export All Orders CSV →
            </button>
          )}
        </div>
        {orders.length === 0 && <p className="text-[14px] text-mute">No orders placed yet.</p>}
        {orders.slice(0, 5).map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between border-b-2 border-dashed border-[#E5DBCC] py-2 text-[14px]"
          >
            <div>
              <span className="font-bold">{o.order_no}</span> · <span>{o.address_snapshot.name}</span>{" "}
              <span className="text-[12px] text-mute">({o.payment_method.toUpperCase()})</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-extrabold text-ink">{inr(o.total)}</span>
              <a
                href={`https://wa.me/91${o.address_snapshot.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                  `Hi ${o.address_snapshot.name}, greeting from Rasi Mom & Baby regarding order #${o.order_no}!`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-ink bg-[#D6E8B0] px-2.5 py-0.5 text-[11px] font-extrabold hover:bg-[#B9EBDD] transition-colors"
              >
                💬 WhatsApp
              </a>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ── Orders board: one-tap status pipeline + packing slip ────────────────── */
const PIPELINE: { status: OrderStatus; label: string }[] = [
  { status: "confirmed", label: "Confirmed" },
  { status: "packed", label: "Packed" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

/** Status buckets the owner actually asks for, in the order they ask for them. */
const ORDER_FILTERS: { id: string; label: string; match: (o: Order) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "new", label: "New", match: (o) => o.status === "new" || o.status === "confirmed" },
  { id: "packed", label: "Packed", match: (o) => o.status === "packed" },
  { id: "out", label: "Out for delivery", match: (o) => o.status === "out_for_delivery" },
  { id: "delivered", label: "Delivered", match: (o) => o.status === "delivered" },
  {
    id: "cod",
    label: "COD pending",
    match: (o) =>
      o.payment_method === "cod" &&
      o.payment_status === "cod_pending" &&
      o.status !== "cancelled",
  },
  {
    id: "cancelled",
    label: "Cancelled / returned",
    match: (o) => o.status === "cancelled" || o.status === "returned",
  },
];

function OrdersBoard({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [slip, setSlip] = useState<Order | null>(null);
  const [label, setLabel] = useState<Order | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Order | null>(null);
  const [confirmRefund, setConfirmRefund] = useState<Order | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const move = async (order: Order, status: OrderStatus) => {
    setBusy(order.id);
    await setOrderStatusAction(order.id, status);
    setBusy(null);
    router.refresh();
  };

  // Scrolling a year of orders to find one phone number is the single thing a
  // shop owner does most in this tab.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    const bucket = ORDER_FILTERS.find((f) => f.id === filter);
    return orders.filter((o) => {
      if (bucket && !bucket.match(o)) return false;
      if (!q) return true;
      const phone = o.address_snapshot.phone.replace(/\D/g, "");
      return (
        o.order_no.toLowerCase().includes(q) ||
        o.address_snapshot.name.toLowerCase().includes(q) ||
        (digits.length >= 3 && phone.includes(digits)) ||
        o.address_snapshot.pin.includes(q)
      );
    });
  }, [orders, query, filter]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-[18px] font-extrabold">
          🚚 Orders Management ({visible.length}
          {visible.length !== orders.length ? ` of ${orders.length}` : ""})
        </span>
        {orders.length > 0 && (
          <button
            type="button"
            onClick={() => exportOrdersToCSV(visible)}
            className="btn-press rounded-pill border-2 border-ink bg-[#D6E8B0] px-3.5 py-1.5 font-display text-[13px] font-extrabold shadow-hard-2 hover:opacity-90 cursor-pointer"
          >
            📥 Export Orders CSV
          </button>
        )}
      </div>

      {orders.length > 0 && (
        <div className="grid gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order no, name, phone or PIN…"
            aria-label="Search orders"
            className="w-full rounded-pill border-2.5 border-ink bg-paper px-4 py-2.5 font-body text-[15px] outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {ORDER_FILTERS.map((fl) => {
              const count = orders.filter(fl.match).length;
              return (
                <Pill
                  key={fl.id}
                  bg={filter === fl.id ? "#2B2140" : "#F2EAE0"}
                  color={filter === fl.id ? "#fff" : "#2B2140"}
                  onClick={() => setFilter(fl.id)}
                >
                  {fl.label} ({count})
                </Pill>
              );
            })}
          </div>
        </div>
      )}

      {orders.length === 0 && <p className="text-mute">Orders will appear here once customers place them.</p>}
      {orders.length > 0 && visible.length === 0 && (
        <Card className="p-6 text-center">
          <div className="text-[26px]">🔍</div>
          <p className="mt-1 font-display font-extrabold">No orders match that search</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-2 text-[14px] font-bold text-mute underline cursor-pointer"
          >
            Clear search and filters
          </button>
        </Card>
      )}
      {visible.map((o) => (
        <Card key={o.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-display font-extrabold">{o.order_no}</span> ·{" "}
              {o.address_snapshot.name} ·{" "}
              <span className="text-[14px] text-mute">{o.address_snapshot.phone}</span>
            </div>
            <div className="font-display font-extrabold text-brand">{inr(o.total)}</div>
          </div>
          <div className="mt-1 text-[14px] text-mute">
            {o.address_snapshot.line}, {o.address_snapshot.city} — {o.address_snapshot.pin}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[14px]">
            {o.items.map((i) => `${i.name_snapshot} ×${i.qty}`).join(" · ")}{" "}
            <Badge bg="#FFE1A8">{o.payment_method === "cod" ? "COD" : "Paid online"}</Badge>
            {o.coupon_code && <Badge bg="#D6E8B0">{o.coupon_code}</Badge>}
            {o.is_gift && <Badge bg="#FBD0EA">🎁 GIFT</Badge>}
            {o.delivery_mode === "express_3hr" && <Badge bg="#D6E8B0">⚡ 3-HR EXPRESS</Badge>}
            {o.delivery_mode === "store_pickup" && <Badge bg="#FFE1A8">🛍️ STORE PICKUP</Badge>}
            {(o.status === "cancelled" || o.status === "returned") && (
              <Badge bg="#FFCBD9">{o.status}</Badge>
            )}
          </div>
          {o.is_gift && o.gift_message && (
            <div className="mt-1.5 rounded-tile border-2 border-ink bg-[#FFF6ED] px-3 py-2 text-[13px] italic">
              🎁 “{o.gift_message}”
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {PIPELINE.map((step) => (
              <Pill
                key={step.status}
                bg={o.status === step.status ? "#D6E8B0" : "#F2EAE0"}
                onClick={() => busy !== o.id && move(o, step.status)}
              >
                {o.status === step.status ? "● " : ""}
                {step.label}
              </Pill>
            ))}

            {/* Visual Divider Barrier '|' between pipeline and action buttons */}
            <span className="mx-1 inline-flex items-center justify-center font-display font-black text-ink/40 text-[18px] select-none" aria-hidden="true">
              |
            </span>

            <Pill bg="#E4D6FF" onClick={() => setSlip(o)}>
              🖨️ Slip
            </Pill>
            <a
              href={`/admin/print/${o.order_no}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press inline-flex items-center rounded-pill border-2 border-ink bg-[#8CE0CE] px-3 py-1 text-[13px] font-extrabold text-ink shadow-hard-1 hover:bg-[#6FD4BD]"
            >
              🏷️ 4x6 Label
            </a>
            <Pill bg="#FFE1A8" onClick={() => setLabel(o)}>
              🏷️ Label
            </Pill>
            <Pill
              bg="#D6E8B0"
              onClick={() => {
                const phone = o.address_snapshot.phone.replace(/\D/g, "");
                const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
                const msg = encodeURIComponent(
                  `Hi ${o.address_snapshot.name}! 👋 Your order #${o.order_no} from Rasi Mom & Baby (Thoothukudi) has been updated to "${o.status.toUpperCase()}"! 🚚\n\nTrack your parcel here: ${window.location.origin}/?track=${o.order_no}`,
                );
                window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
              }}
            >
              📱 WhatsApp
            </Pill>
            {o.status !== "cancelled" && o.status !== "delivered" && (
              <Pill bg="#FFCBD9" onClick={() => busy !== o.id && setConfirmCancel(o)}>
                ✕ Cancel
              </Pill>
            )}
            {o.payment_status !== "refunded" && (
              <Pill bg="#FF5A78" color="#ffffff" onClick={() => busy !== o.id && setConfirmRefund(o)}>
                💸 Refund
              </Pill>
            )}
          </div>
        </Card>
      ))}
      {confirmCancel && (
        <Modal onClose={() => setConfirmCancel(null)}>
          <h3 className="font-display text-[20px] font-extrabold text-ink">Cancel this order?</h3>
          <p className="mt-2 text-[14px] text-mute">
            Order <span className="font-extrabold text-ink">#{confirmCancel.order_no}</span> for{" "}
            {confirmCancel.address_snapshot.name} will be marked cancelled. This can’t be undone.
          </p>
          <div className="mt-4 flex gap-2.5">
            <Pill bg="#E4E0EC" onClick={() => setConfirmCancel(null)}>
              Keep order
            </Pill>
            <Pill
              bg="#FFCBD9"
              onClick={() => {
                const target = confirmCancel;
                setConfirmCancel(null);
                if (busy !== target.id) move(target, "cancelled");
              }}
            >
              ✕ Yes, cancel order
            </Pill>
          </div>
        </Modal>
      )}
      {confirmRefund && (
        <Modal onClose={() => setConfirmRefund(null)}>
          <h3 className="font-display text-[20px] font-extrabold text-ink">Issue refund for this order?</h3>
          <p className="mt-2 text-[14px] text-mute">
            Order <span className="font-extrabold text-ink">#{confirmRefund.order_no}</span> ({inr(confirmRefund.total)}) for{" "}
            {confirmRefund.address_snapshot.name} will be marked refunded and Razorpay refund triggered if online.
          </p>
          <div className="mt-4 flex gap-2.5">
            <Pill bg="#E4E0EC" onClick={() => setConfirmRefund(null)}>
              Cancel
            </Pill>
            <Pill
              bg="#FF5A78"
              color="#ffffff"
              onClick={async () => {
                const target = confirmRefund;
                setConfirmRefund(null);
                setBusy(target.id);
                setRefundError(null);
                const res = await refundOrderAction(target.id);
                setBusy(null);
                if (!res.ok) {
                  // Money didn't move (or the DB update failed) — an admin
                  // silently seeing "success" here is exactly how a refund
                  // gets marked done without a customer ever being paid.
                  setRefundError(res.error ?? "Refund failed.");
                  return;
                }
                router.refresh();
              }}
            >
              💸 Yes, issue refund
            </Pill>
          </div>
        </Modal>
      )}
      {refundError && (
        <Modal onClose={() => setRefundError(null)}>
          <h3 className="font-display text-[20px] font-extrabold text-ink">⚠️ Refund failed</h3>
          <p className="mt-2 text-[14px] text-mute">{refundError}</p>
          <div className="mt-4">
            <Pill bg="#E4E0EC" onClick={() => setRefundError(null)}>
              Close
            </Pill>
          </div>
        </Modal>
      )}
      {slip && <PackingSlip order={slip} onClose={() => setSlip(null)} />}
      {label && <ShippingLabel order={label} onClose={() => setLabel(null)} />}
    </div>
  );
}

function PackingSlip({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div id="packing-slip">
        <style>{`@media print { body * { visibility: hidden } #packing-slip, #packing-slip * { visibility: visible } #packing-slip { position: fixed; inset: 0; background: #fff; padding: 24px } }`}</style>
        <h3 className="font-display text-[22px] font-extrabold">📦 {order.order_no}</h3>
        <p className="mt-1 text-[14px] text-mute">{BUSINESS.name}</p>
        <div className="mt-3 rounded-tile border-2.5 border-ink bg-paper p-3 text-[14px]">
          <div className="font-extrabold">{order.address_snapshot.name}</div>
          <div>
            {order.address_snapshot.line}, {order.address_snapshot.city} —{" "}
            {order.address_snapshot.pin}
          </div>
          <div>📞 {order.address_snapshot.phone}</div>
        </div>
        <table className="mt-3 w-full text-[14px]">
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx} className="border-b border-dashed border-[#E5DBCC]">
                <td className="py-1.5">{i.name_snapshot}</td>
                <td className="py-1.5 text-right font-extrabold">×{i.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex justify-between font-display font-extrabold">
          <span>{order.payment_method === "cod" ? `COLLECT ${inr(order.total)}` : "PAID ONLINE"}</span>
          <span>{inr(order.total)}</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2.5">
        <button
          onClick={() => window.print()}
          className="btn-press flex-1 rounded-pill border-3 border-ink bg-brand px-5 py-2.5 font-display font-extrabold text-white shadow-hard-3"
        >
          🖨️ Print
        </button>
        <button
          onClick={onClose}
          className="btn-press flex-1 rounded-pill border-3 border-ink bg-[#F2EAE0] px-5 py-2.5 font-display font-extrabold shadow-hard-3"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

function ShippingLabel({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div id="shipping-label" className="mx-auto max-w-[400px] border-4 border-ink bg-white p-5 shadow-hard-4">
        <style>{`@media print { body * { visibility: hidden } #shipping-label, #shipping-label * { visibility: visible } #shipping-label { position: fixed; top: 0; left: 0; width: 4in; height: 6in; background: #fff; padding: 16px; border: 3px solid #000; font-family: sans-serif; } }`}</style>

        {/* Header */}
        <div className="flex items-center justify-between border-b-3 border-ink pb-3">
          <div>
            <h2 className="font-display text-[20px] font-extrabold tracking-tight text-ink">{BUSINESS.name}</h2>
            <p className="text-[11px] font-bold text-mute">Palayamkottai Road, Thoothukudi</p>
          </div>
          <div className="text-right">
            <span className="inline-block rounded-pill border-2 border-ink bg-[#FFE1A8] px-2.5 py-0.5 font-display text-[12px] font-extrabold text-ink">
              {order.payment_method === "cod" ? `COD: ${inr(order.total)}` : "PAID PREPAID"}
            </span>
          </div>
        </div>

        {/* Order Barcode simulation */}
        <div className="my-3 text-center bg-paper p-2 rounded-tile border-2 border-ink">
          <div className="font-mono text-[22px] font-extrabold tracking-widest text-ink">*{order.order_no}*</div>
          <div className="text-[10px] font-extrabold uppercase text-mute">Order Barcode / Dispatch Serial</div>
        </div>

        {/* Delivery Address Box */}
        <div className="rounded-tile border-3 border-ink bg-[#FFFDF7] p-3">
          <div className="text-[11px] font-extrabold uppercase text-mute font-display">
            DELIVER TO (RECIPIENT):
          </div>
          <div className="mt-1 font-display text-[18px] font-extrabold text-ink leading-tight">
            {order.address_snapshot.name}
          </div>
          <div className="mt-1 font-body text-[14px] font-bold text-ink leading-relaxed">
            {order.address_snapshot.line}<br />
            {order.address_snapshot.city}, Tamil Nadu
          </div>
          <div className="mt-1 flex items-center justify-between border-t-2 border-dashed border-ink/20 pt-1.5 font-display">
            <span className="text-[16px] font-extrabold text-brand">PIN: {order.address_snapshot.pin}</span>
            <span className="text-[13px] font-extrabold text-ink">📞 {order.address_snapshot.phone}</span>
          </div>
        </div>

        {/* Package summary */}
        <div className="mt-3 rounded-tile border-2 border-ink p-2 text-[12px]">
          <div className="font-bold text-mute uppercase mb-0.5">Package Contents ({order.items.reduce((s, i) => s + i.qty, 0)} items):</div>
          <div className="font-semibold text-ink line-clamp-2">
            {order.items.map((i) => `${i.name_snapshot} (${i.qty})`).join(", ")}
          </div>
        </div>

        <div className="mt-3 text-center text-[10px] font-bold text-mute border-t border-ink/20 pt-2">
          Hand-packed with care in Thoothukudi · Express Courier Service
        </div>
      </div>

      <div className="mt-4 flex gap-2.5">
        <button
          onClick={() => window.print()}
          className="btn-press flex-1 rounded-pill border-3 border-ink bg-brand px-5 py-2.5 font-display font-extrabold text-white shadow-hard-3"
        >
          🏷️ Print Shipping Label (4x6&quot;)
        </button>
        <button
          onClick={onClose}
          className="btn-press flex-1 rounded-pill border-3 border-ink bg-[#F2EAE0] px-5 py-2.5 font-display font-extrabold shadow-hard-3"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
