import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rasi Mom & Baby — Storefront",
    short_name: "Rasi Mom & Baby",
    description: "Production e-commerce storefront for Rasi Mom & Baby, Thoothukudi",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF9E6",
    theme_color: "#2B2140",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
