import { ImageResponse } from "next/og";
import { BUSINESS } from "@/lib/constants";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || BUSINESS.name;
    const price = searchParams.get("price") || "";
    const emoji = searchParams.get("emoji") || "👶";
    const bg = searchParams.get("bg") || "#FFE1A8";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: bg,
            backgroundImage: "radial-gradient(circle at 25px 25px, rgba(43, 33, 64, 0.08) 2%, transparent 0%)",
            backgroundSize: "40px 40px",
            padding: "60px",
            fontFamily: "sans-serif",
            border: "12px solid #2B2140",
            boxSizing: "border-box",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              backgroundColor: "#2B2140",
              color: "#FFF",
              padding: "12px 24px",
              borderRadius: "20px",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            <span>{emoji}</span>
            <span>{BUSINESS.name}</span>
          </div>

          {/* Title & Price content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                color: "#2B2140",
                lineHeight: 1.1,
                maxWidth: "1000px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {title}
            </div>
            {price && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#FF6B8B",
                  color: "#FFF",
                  padding: "12px 28px",
                  borderRadius: "24px",
                  fontSize: 44,
                  fontWeight: 900,
                  border: "4px solid #2B2140",
                  width: "fit-content",
                }}
              >
                {price}
              </div>
            )}
          </div>

          {/* Footer badge */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              fontSize: 22,
              fontWeight: 700,
              color: "#5C4A78",
            }}
          >
            <span>{BUSINESS.city} · Mom & Baby Store</span>
            <span>{BUSINESS.phone || "Thoothukudi"}</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch {
    return new Response("Failed to generate image", { status: 500 });
  }
}
