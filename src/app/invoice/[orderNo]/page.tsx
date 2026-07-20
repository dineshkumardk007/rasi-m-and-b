import { notFound } from "next/navigation";
import { trackOrder } from "@/lib/data/orders";
import { getActiveProducts } from "@/lib/data/catalog";
import { BUSINESS, inr } from "@/lib/constants";
import { PrintButton } from "./print-button";

/**
 * GST invoice — printable page (browser Print → Save as PDF gives the PDF).
 * Access-guarded like tracking: order_no + the phone used at checkout.
 * Prices are GST-inclusive; tax is broken out per line at the product's rate.
 */

interface Props {
  params: Promise<{ orderNo: string }>;
  searchParams: Promise<{ phone?: string }>;
}

export default async function InvoicePage({ params, searchParams }: Props) {
  const { orderNo } = await params;
  const { phone } = await searchParams;
  if (!phone) notFound();
  const order = await trackOrder(orderNo, phone);
  if (!order) notFound();

  const products = await getActiveProducts();
  const gstRateFor = (productId: string | null) =>
    products.find((p) => p.id === productId)?.gst_rate ?? 12;

  const lines = order.items.map((item) => {
    const rate = gstRateFor(item.product_id);
    const gross = item.price_snapshot * item.qty;
    const taxable = Math.round((gross * 100) / (100 + rate));
    return { ...item, rate, gross, taxable, tax: gross - taxable };
  });
  const totalTax = lines.reduce((s, l) => s + l.tax, 0);

  return (
    <main className="mx-auto max-w-[720px] bg-white p-8 font-body text-ink print:p-0">
      <style>{`@media print { .no-print { display: none } body { background: #fff } }`}</style>

      <header className="mb-6 flex items-start justify-between border-b-4 border-ink pb-4">
        <div>
          <div className="font-display text-[24px] font-extrabold">{BUSINESS.name}</div>
          <div className="text-[13px] text-mute">{BUSINESS.address}</div>
          <div className="text-[13px] text-mute">
            GSTIN: {BUSINESS.gstin ?? "— pending owner confirmation —"}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-[18px] font-extrabold">TAX INVOICE</div>
          <div className="text-[13px]">{order.order_no}</div>
          <div className="text-[13px] text-mute">
            {new Date(order.placed_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      </header>

      <section className="mb-6 text-[14px]">
        <div className="font-display font-extrabold uppercase text-mute">Bill to</div>
        <div>{order.address_snapshot.name}</div>
        <div>
          {order.address_snapshot.line}, {order.address_snapshot.city} —{" "}
          {order.address_snapshot.pin}
        </div>
        <div>📞 {order.address_snapshot.phone}</div>
      </section>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-ink text-left font-display">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Taxable</th>
            <th className="py-2 text-right">GST</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-dashed border-[#E5DBCC]">
              <td className="py-2">{l.name_snapshot}</td>
              <td className="py-2 text-right">{l.qty}</td>
              <td className="py-2 text-right">{inr(l.taxable)}</td>
              <td className="py-2 text-right">
                {inr(l.tax)} <span className="text-mute">({l.rate}%)</span>
              </td>
              <td className="py-2 text-right">{inr(l.gross)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="ml-auto mt-4 w-64 text-[14px]">
        <div className="flex justify-between py-1">
          <span>Subtotal</span>
          <span>{inr(order.subtotal)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span>Delivery</span>
          <span>{order.delivery_fee === 0 ? "Free" : inr(order.delivery_fee)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between py-1">
            <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
            <span>−{inr(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between py-1 text-[12px] text-mute">
          <span>Included GST</span>
          <span>{inr(totalTax)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t-2 border-ink py-2 font-display text-[17px] font-extrabold">
          <span>Total</span>
          <span>{inr(order.total)}</span>
        </div>
        <div className="text-[12px] text-mute">
          {order.payment_method === "cod" ? "Cash on delivery" : "Paid online (Razorpay)"}
        </div>
      </section>

      <footer className="mt-8 border-t border-[#E5DBCC] pt-3 text-center text-[12px] text-mute">
        Thank you for shopping with {BUSINESS.name}! 💛
      </footer>

      <div className="no-print mt-6 text-center">
        <PrintButton />
      </div>
    </main>
  );
}
