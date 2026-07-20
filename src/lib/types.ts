import type { Category, Milestone } from "./constants";

export interface Product {
  id: string;
  name_en: string;
  name_ta: string;
  slug: string;
  brand: string;
  milestone: Milestone;
  categories: Category[];
  price: number;
  mrp: number;
  gst_rate: number;
  stock: number;
  low_stock_threshold: number;
  status: "active" | "archived";
  tile_color: string;
  emoji: string;
  images: string[];
  description_en: string;
  description_ta: string;
  ingredients: string | null;
}

export interface Bundle {
  id: string;
  name_en: string;
  name_ta: string;
  slug: string;
  product_ids: string[];
  bundle_price: number;
  mrp: number;
  status: "active" | "archived";
  emoji: string;
  tile_color: string;
  items_en: string[]; // display names of contents
}

export type OrderStatus =
  | "new"
  | "confirmed"
  | "packed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "razorpay" | "cod";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "cod_pending"
  | "cod_collected";

export interface OrderItem {
  product_id: string;
  name_snapshot: string;
  price_snapshot: number;
  qty: number;
}

export interface AddressSnapshot {
  name: string;
  phone: string;
  line: string;
  city: string;
  pin: string;
}

export interface Order {
  id: string;
  order_no: string;
  customer_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  coupon_code: string | null;
  total: number;
  address_snapshot: AddressSnapshot;
  items: OrderItem[];
  placed_at: string;
  language: "en" | "ta";
}

export interface Coupon {
  code: string;
  type: "percent" | "flat";
  value: number;
  min_order: number;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number;
}

export interface Review {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  language: "en" | "ta";
  whatsapp_opt_in: boolean;
  baby_dob: string | null;
  notes: string;
  created_at: string;
}

export interface StoreSettings {
  same_day_enabled: boolean;
  serviceable_pins: string[];
  free_delivery_threshold: number;
  cod_limit: number;
}

export interface CartLine {
  /** product or bundle id, prefixed "b:" for bundles */
  itemId: string;
  qty: number;
}
