import type { MetadataRoute } from "next"

/**
 * Makes the site installable. With display "standalone" the home-screen
 * shortcut opens without browser chrome, so it behaves like an app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PaisaTrack - Personal Finance Tracker",
    short_name: "PaisaTrack",
    description: "Track accounts, spending, loans, subscriptions and savings plans.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1c1917",
    theme_color: "#1c1917",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
