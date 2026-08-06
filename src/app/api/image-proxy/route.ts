import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url || !/^https:\/\//i.test(url)) {
    return new NextResponse("Bad Request: Invalid URL", { status: 400 });
  }

  try {
    const res = await fetch(url, {
      // Prevent fetching massive files
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch image", { status: res.status });
    }

    const contentType = res.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      return new NextResponse("Requested URL is not an image", { status: 400 });
    }

    // Limit proxy size to 5MB
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return new NextResponse("Image too large", { status: 413 });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable", // Cache heavily
      },
    });
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
