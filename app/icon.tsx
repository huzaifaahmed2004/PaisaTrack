import { ImageResponse } from "next/og"

/**
 * Square app icon, generated so the home-screen shortcut gets a crisp mark
 * rather than a stretched copy of the wide logo.
 */
export const size = { width: 512, height: 512 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1917",
          color: "#f97316",
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        ₨
      </div>
    ),
    size,
  )
}
