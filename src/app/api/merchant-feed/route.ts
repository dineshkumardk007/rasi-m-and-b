import { getActiveProducts } from "@/lib/data/catalog";

/**
 * Google Merchant Center product feed (RSS 2.0 / g: namespace).
 * Register this URL in Merchant Center once the site is live.
 */
export const dynamic = "force-dynamic";

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );

export async function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const products = await getActiveProducts();
  const items = products
    .map(
      (p) => `  <item>
    <g:id>${p.slug}</g:id>
    <g:title>${escapeXml(p.name_en)}</g:title>
    <g:description>${escapeXml(p.description_en)}</g:description>
    <g:link>${base}/p/${p.slug}</g:link>
    ${p.images[0] ? `<g:image_link>${escapeXml(p.images[0])}</g:image_link>` : ""}
    <g:availability>${p.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
    <g:price>${p.price}.00 INR</g:price>
    <g:brand>${escapeXml(p.brand || "Rasi Mom & Baby")}</g:brand>
    <g:condition>new</g:condition>
  </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Rasi Mom &amp; Baby</title>
  <link>${base}</link>
  <description>Baby products, toys and mom care — Thoothukudi</description>
${items}
</channel>
</rss>`;

  return new Response(xml, { headers: { "content-type": "application/xml" } });
}
