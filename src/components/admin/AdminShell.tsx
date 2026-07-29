"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Coupon,
  CustomerRecord,
  Order,
  OrderStatus,
  Product,
  Review,
  StoreSettings,
} from "@/lib/types";
import { BUSINESS, inr } from "@/lib/constants";
import { Badge, Card, Modal, Pill } from "@/components/ui";
import { logoutAdminAction, setOrderStatusAction, updateProductStockAction } from "@/app/admin/actions";
import {
  CouponsTab,
  CustomersTab,
  ProductsTab,
  ReportsTab,
  ReviewsTab,
  SettingsTab,
} from "./tabs";

export interface AdminProps {
  orders: Order[];
  products: Product[];
  customers: CustomerRecord[];
  coupons: Coupon[];
  reviews: Review[];
  settings: StoreSettings;
  isDemo: boolean;
}

const TABS = [
  ["dashboard", "📊 Dashboard"],
  ["orders", "🚚 Orders"],
  ["products", "📦 Products"],
  ["customers", "👥 Customers"],
  ["coupons", "🏷️ Coupons"],
  ["reviews", "⭐ Reviews"],
  ["reports", "📈 Reports"],
  ["settings", "⚙️ Settings"],
] as const;

export function AdminShell(props: AdminProps) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("dashboard");

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
        <div className="flex gap-2 overflow-x-auto pb-3">
          {TABS.map(([id, label]) => (
            <Pill key={id} active={tab === id} onClick={() => setTab(id)}>
              {label}
            </Pill>
          ))}
        </div>

        {tab === "dashboard" && <Dashboard {...props} />}
        {tab === "orders" && <OrdersBoard orders={props.orders} />}
        {tab === "products" && <ProductsTab products={props.products} />}
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
                rel="noreferrer"
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
  const [busy, setBusy] = useState<string | null>(null);
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
            {/* Packing needs to know: no price slip, and a message to include. */}
            {o.is_gift && <Badge bg="#FBD0EA">🎁 GIFT</Badge>}
            {(o.status === "cancelled" || o.status === "returned") && (
              <Badge bg="#FFCBD9">{o.status}</Badge>
            )}
          </div>
          {o.is_gift && o.gift_message && (
            <div className="mt-1.5 rounded-tile border-2 border-ink bg-[#FFF6ED] px-3 py-2 text-[13px] italic">
              🎁 “{o.gift_message}”
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
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
            <Pill bg="#E4D6FF" onClick={() => setSlip(o)}>
              🖨️ Slip
            </Pill>
            {o.status !== "cancelled" && o.status !== "delivered" && (
              <Pill bg="#FFCBD9" onClick={() => busy !== o.id && move(o, "cancelled")}>
                ✕ Cancel
              </Pill>
            )}
          </div>
        </Card>
      ))}
      {slip && <PackingSlip order={slip} onClose={() => setSlip(null)} />}
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
