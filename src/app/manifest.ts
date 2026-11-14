import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fitness AI Tracker",
    short_name: "Fitness",
    description: "Log any workout and get a suggestion for every next set.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f2f2f7",
    theme_color: "#f2f2f7",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Start workout", url: "/workout", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
