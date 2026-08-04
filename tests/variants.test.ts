import { describe, expect, it } from "vitest";
import { placeOrder } from "@/lib/data/orders";
import { demoDB } from "@/lib/data/demo-store";
import type { PlaceOrderInput } from "@/lib/data/orders";

describe("variant stock enforcement", () => {
  const baseAddress = {
    name: "Test Customer",
    phone: "9876543210",
    line: "123 Main St",
    city: "Thoothukudi",
    pin: "628001",
  };

  it("successfully places an order when variant stock is sufficient in demo mode", async () => {
    const db = demoDB();
    // find a product with variants
    const product = db.products.find((p) => p.variants && p.variants.length > 0);
    if (!product || !product.variants?.[0]) return;

    const variant = product.variants[0];
    const initialStock = variant.stock;
    const initialProductStock = product.stock;

    const input: PlaceOrderInput = {
      items: [{ itemId: product.id, variantId: variant.id, qty: 1 }],
      address: baseAddress,
      payment_method: "cod",
      language: "en",
    };

    const res = await placeOrder(input);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(variant.stock).toBe(initialStock - 1);
      expect(product.stock).toBe(initialProductStock - 1);
    }
  });

  it("rejects an order when requested variant stock exceeds available variant stock", async () => {
    const db = demoDB();
    const product = db.products.find((p) => p.variants && p.variants.length > 0);
    if (!product || !product.variants?.[0]) return;

    const variant = product.variants[0];
    variant.stock = 0; // set variant stock to 0

    const input: PlaceOrderInput = {
      items: [{ itemId: product.id, variantId: variant.id, qty: 1 }],
      address: baseAddress,
      payment_method: "cod",
      language: "en",
    };

    const res = await placeOrder(input);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("out_of_stock");
    }
  });
});
