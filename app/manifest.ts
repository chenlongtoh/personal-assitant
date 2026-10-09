import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Morning Brief",
    short_name: "Brief",
    description:
      "Five stories each morning across AI, Southeast Asia, and the world.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#1c1915",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
