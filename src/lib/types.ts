import type { Category, Milestone } from "./constants";

export interface ProductVariant {
  id: string;
  name_en: string;
  name_ta: string;
  price?: number;
  mrp?: number;
  stock: number;
  sku?: string;
}

export interface Product {
  id: string;
  name_en: string;
  name_ta: string;
  slug: string;
  brand: string;
  /** Optional link to a brands row, which is what carries the logo and page. */
  brand_id?: string | null;
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
  variants?: ProductVariant[];
  size_chart_type?: "diaper" | "clothing" | "shoes" | "none";
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
  variant_id?: string | null;
  variant_name?: string | null;
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

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  name: string;
  phone: string;
  line: string;
  city: string;
  pin: string;
  is_default: boolean;
  created_at?: string;
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
  /** Gift orders hide prices on the invoice and carry a message. */
  is_gift?: boolean;
  gift_message?: string | null;
  gift_wrap_fee?: number;
  delivery_mode?: "standard" | "express_3hr" | "store_pickup";
}

export interface Coupon {
  code: string;
  type: "percent" | "flat";
  value: number;
  min_order: number;
  valid_until: string | null;
  usage_limit: number | null;
  used_count: number;
  /** Advertised in the offer strip. Separate from being valid. */
  featured?: boolean;
}

/** Fixed home-page positions a banner can occupy. */
export type BannerSlot = "hero" | "mid";

export interface Banner {
  id: string;
  slot: BannerSlot;
  image_url: string;
  alt: string;
  /** Internal path or absolute URL. Null makes the banner decorative. */
  link_url: string | null;
  sort: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  sort: number;
  active: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  photo_url?: string | null;
  verified_buyer?: boolean;
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
  password?: string | null;
  last_login_at?: string | null;
  login_count?: number;
  created_at: string;
  addresses?: CustomerAddress[];
}

export interface DeliverySlab {
  min_amount: number;
  max_amount: number | null;
  fee: number;
}

export interface StoreSettings {
  same_day_enabled: boolean;
  serviceable_pins: string[];
  unserviceable_pins?: string[];
  free_delivery_threshold: number;
  base_delivery_fee?: number;
  universal_free_delivery?: boolean;
  delivery_slabs?: DeliverySlab[];
  cod_limit: number;
  gift_wrap_enabled?: boolean;
  gift_wrap_fee?: number;
  enable_language_switch?: boolean;
  announcement_enabled?: boolean;
  announcement_text_en?: string;
  announcement_text_ta?: string;
  announcement_bg?: string;
  announcement_color?: string;
  announcement_link?: string;
  /** Admin-added categories beyond the 8 built-in ones. */
  custom_categories?: Array<{ slug: string; en: string; ta: string; emoji: string; bg: string; pop: string }>;
}

export interface CartLine {
  /** product or bundle id, prefixed "b:" for bundles */
  itemId: string;
  variantId?: string;
  qty: number;
}

export interface RegistryItem {
  product_id: string;
  desired_qty: number;
  purchased_qty: number;
}

export interface BabyRegistry {
  id: string;
  customer_id: string;
  title: string;
  parent_name: string;
  baby_name_or_title: string;
  event_date: string;
  slug: string;
  items: RegistryItem[];
  created_at: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  product_id: string;
  variant_id?: string | null;
  qty: number;
  frequency_days: number; // e.g. 30 or 45
  status: "active" | "paused" | "cancelled";
  discount_percent: number; // e.g. 10
  next_delivery_date: string;
  created_at: string;
}

export interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  dailySales: Array<{ date: string; amount: number; count: number }>;
  topProducts: Array<{ id: string; name: string; qtySold: number; revenue: number }>;
  categorySales: Array<{ category: string; amount: number }>;
}
