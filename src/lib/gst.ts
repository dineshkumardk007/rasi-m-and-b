/**
 * GST arithmetic for the tax invoice.
 *
 * Displayed prices are GST-inclusive, so the invoice has to work backwards
 * from the amount charged to the taxable value and the tax inside it. This
 * lived inline in the invoice page, where it could not be tested — and a
 * rounding mistake here is a mistake on a document the shop is legally
 * required to get right.
 *
 * Rounding is applied to the taxable value and the tax is taken as the
 * remainder, so taxable + tax always equals the amount actually charged. The
 * alternative (rounding both independently) can leave the invoice a rupee
 * short of the payment.
 */

export interface GstSplit {
  /** Amount charged to the customer, GST included. */
  gross: number;
  /** Value excluding GST. */
  taxable: number;
  /** GST contained in `gross`. */
  tax: number;
  /** Rate applied, as a percentage. */
  rate: number;
}

export function splitGstInclusive(gross: number, rate: number): GstSplit {
  const taxable = Math.round((gross * 100) / (100 + rate));
  return { gross, taxable, tax: gross - taxable, rate };
}

export interface InvoiceLineInput {
  product_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  qty: number;
}

export interface InvoiceLine extends InvoiceLineInput, GstSplit {}

/** Per-line GST split for an order, using each product's own rate. */
export function invoiceLines(
  items: InvoiceLineInput[],
  rateFor: (productId: string | null) => number,
): InvoiceLine[] {
  return items.map((item) => ({
    ...item,
    ...splitGstInclusive(item.price_snapshot * item.qty, rateFor(item.product_id)),
  }));
}

export function totalTax(lines: InvoiceLine[]): number {
  return lines.reduce((sum, l) => sum + l.tax, 0);
}

export function totalTaxable(lines: InvoiceLine[]): number {
  return lines.reduce((sum, l) => sum + l.taxable, 0);
}
