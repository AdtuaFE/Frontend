import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Words that should stay all-caps when a snake_case enum value is title-cased for display,
// e.g. "digital_led" → "Digital LED" instead of "Digital Led".
const FMT_ACRONYMS = new Set(["LED", "TV", "CPM", "US"]);

/** Formats a snake_case DB enum value for display: "digital_led" → "Digital LED". */
export function fmt(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split("_")
    .map(word => {
      const upper = word.toUpperCase();
      return FMT_ACRONYMS.has(upper) ? upper : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
