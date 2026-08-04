import { notFound } from "next/navigation";
import { getOrderByOrderNo, requireStaff } from "@/lib/data/admin";
import { BUSINESS, inr } from "@/lib/constants";
import { PrintTrigger } from "./print-trigger";

export const dynamic = "force-dynamic";

export default async function AdminOrderPrintPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const staff = await requireStaff();
  if (!staff) {
    return (
      <div className="p-8 text-center font-display text-ink">
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-sm text-mute">Please log in as admin to access order dispatch labels.</p>
      </div>
    );
  }

  const { orderNo } = await params;
  const order = await getOrderByOrderNo(orderNo);

  if (!order) {
    notFound();
  }

  const addr = order.address_snapshot;
  const isCod = order.payment_method === "cod";

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-black print:bg-white print:p-0">
      <PrintTrigger />

      {/* 4x6 thermal paper container: 100mm x 150mm approx (384px x 576px at standard DPI) */}
      <div className="mx-auto w-[100mm] min-h-[150mm] border-2 border-black bg-white p-3 shadow-md print:w-[100mm] print:h-[150mm] print:border-0 print:p-2 print:shadow-none">
        
        {/* Header: Shop Info */}
        <div className="border-b-2 border-black pb-2 text-center">
          <h2 className="font-display text-[16px] font-extrabold uppercase tracking-tight text-black">
            {BUSINESS.name}
          </h2>
          <p className="text-[10px] leading-tight font-medium text-gray-700">
            Thoothukudi · Tel: {BUSINESS.phone}
          </p>
        </div>

        {/* Order Barcode Visual & Number */}
        <div className="my-2 border-b-2 border-dashed border-black pb-2 text-center">
          <div className="mx-auto flex h-10 w-4/5 items-center justify-center bg-black px-2 py-1">
            <span className="font-mono text-[18px] font-extrabold tracking-widest text-white">
              ||| |||| || ||| |||| ||
            </span>
          </div>
          <span className="font-mono text-[14px] font-black tracking-wider text-black">
            {order.order_no}
          </span>
          <div className="text-[10px] font-semibold text-gray-600">
            Placed: {new Date(order.placed_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </div>
        </div>

        {/* Payment Status Banner */}
        <div
          className={`mb-2.5 rounded border-2 px-2 py-1 text-center font-display text-[13px] font-extrabold uppercase tracking-wide ${
            isCod
              ? "border-black bg-black text-white"
              : order.payment_status === "paid"
                ? "border-black bg-gray-200 text-black"
                : order.payment_status === "refunded"
                  ? "border-black bg-gray-200 text-black"
                  : "border-red-600 bg-red-600 text-white"
          }`}
        >
          {isCod
            ? `⚠️ COLLECT CASH ON DELIVERY: ${inr(order.total)}`
            : order.payment_status === "paid"
              ? "✓ PAID ONLINE"
              : order.payment_status === "refunded"
                ? "REFUNDED"
                : "⚠️ UNPAID — DO NOT DISPATCH"}
        </div>

        {/* Deliver To Address Box */}
        <div className="mb-2.5 rounded border-1.5 border-black p-2">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
            Deliver To:
          </div>
          <div className="font-display text-[14px] font-extrabold leading-tight text-black">
            {addr.name}
          </div>
          <div className="text-[11px] font-semibold text-black">{addr.phone}</div>
          <div className="mt-1 text-[11px] leading-tight text-gray-800">
            {addr.line}
          </div>
          <div className="text-[11px] font-bold text-black">
            {addr.city} — <span className="font-mono text-[12px] font-black">{addr.pin}</span>
          </div>
        </div>

        {/* Item Packing Checklist */}
        <div className="border-t-2 border-black pt-1.5">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
            Packing Checklist ({order.items.reduce((s, i) => s + i.qty, 0)} items):
          </div>
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-gray-400 font-bold">
                <th className="py-0.5">Item</th>
                <th className="py-0.5 text-center">Qty</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-1 pr-1 font-medium leading-tight text-black">
                    [ ] {item.name_snapshot}
                  </td>
                  <td className="py-1 text-center font-bold text-black">
                    x{item.qty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {order.is_gift && (
          <div className="mt-2 rounded bg-gray-100 p-1 text-[10px] italic font-semibold text-black border border-gray-400">
            🎁 Gift Order: {order.gift_message || "No gift note."}
          </div>
        )}
      </div>
    </div>
  );
}
