/**
 * Accent palettes. The colours themselves live in app/globals.css under
 * [data-accent="..."]; this list only names them and gives the picker a
 * swatch to show. The mode (light, dark, system) is handled by next-themes.
 */
export const ACCENTS = [
  { value: "indigo", label: "Indigo", swatch: "oklch(0.58 0.2 275)" },
  { value: "jade", label: "Jade", swatch: "oklch(0.62 0.14 165)" },
  { value: "saffron", label: "Saffron", swatch: "oklch(0.7 0.18 50)" },
  { value: "ocean", label: "Ocean", swatch: "oklch(0.62 0.13 235)" },
  { value: "violet", label: "Violet", swatch: "oklch(0.6 0.2 300)" },
  { value: "rose", label: "Rose", swatch: "oklch(0.63 0.2 5)" },
] as const

export type Accent = (typeof ACCENTS)[number]["value"]

export const DEFAULT_ACCENT: Accent = "indigo"
export const ACCENT_STORAGE_KEY = "paisatrack-accent"

export function isAccent(value: unknown): value is Accent {
  return ACCENTS.some((accent) => accent.value === value)
}

/**
 * Runs in <head> before first paint, so a saved accent never flashes the
 * default one. Kept dependency-free because it is inlined as a string.
 */
export const accentScript = `(function(){try{var a=localStorage.getItem("${ACCENT_STORAGE_KEY}");if(a)document.documentElement.setAttribute("data-accent",a)}catch(e){}})()`
