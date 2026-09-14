import type { Listing } from "./types";
import { SQM_TO_SQFT } from "./format";

export const BAIT_NUMBERS = new Set([
  "+912007133812",
  "+912007145137",
  "+912000039837",
  "+912007219058",
  "+912003561453",
]);

export function isBait(l: Listing): boolean {
  return !!l.posted_by_contact && BAIT_NUMBERS.has(l.posted_by_contact.trim());
}

/** magichomes listings under 300 "sqft" are really square metres. */
export function isSqmMislabeled(l: Listing): boolean {
  return l.website === "magichomes" && (l.carpet_area ?? 0) < 300;
}

export function effectiveAreaSqft(l: Listing): number {
  return isSqmMislabeled(l) ? l.carpet_area * SQM_TO_SQFT : l.carpet_area;
}

export function pricePerSqft(l: Listing): number | null {
  const a = effectiveAreaSqft(l);
  if (!a || a <= 0 || !l.price || l.price <= 0) return null;
  return l.price / a;
}

export function corruptionReasons(l: Listing): string[] {
  const r: string[] = [];
  if (l.price <= 0) r.push("Non-positive price");
  else if (l.price < 100000) r.push("Implausible whole-home price");
  if (l.carpet_area <= 0) r.push("Non-positive carpet area");
  if (l.floor !== undefined && l.total_floors !== undefined && l.floor > l.total_floors)
    r.push("Floor above building height");
  if (
    l.super_built_up_area !== undefined &&
    l.carpet_area > 0 &&
    l.super_built_up_area > 0 &&
    l.super_built_up_area < l.carpet_area
  )
    r.push("Super built-up smaller than carpet");
  if (l.posted_at && new Date(l.posted_at).getTime() > Date.now()) r.push("Future-dated listing");
  if (l.bathroom === 0) r.push("Zero bathrooms");
  if (
    l.latitude !== undefined &&
    l.longitude !== undefined &&
    (l.latitude > 40 || l.longitude < 40)
  )
    r.push("Swapped latitude/longitude");
  return r;
}

export function isCorrupt(l: Listing): boolean {
  return corruptionReasons(l).length > 0;
}

export function duplicateKey(l: Listing): string {
  const lat = l.latitude !== undefined ? Math.round(l.latitude / 0.0005) : "x";
  const lng = l.longitude !== undefined ? Math.round(l.longitude / 0.0005) : "x";
  return [
    (l.apartment_name ?? "").toLowerCase().trim(),
    (l.locality ?? "").toLowerCase().trim(),
    l.bedroom,
    l.floor,
    l.bathroom,
    lat,
    lng,
  ].join("|");
}

export function uniqueHomeCount(listings: Listing[]): number {
  return new Set(listings.map(duplicateKey)).size;
}

export type Flags = {
  bait: boolean;
  sqm: boolean;
  corrupt: boolean;
  reasons: string[];
};

export function flagsFor(l: Listing): Flags {
  const reasons = corruptionReasons(l);
  return { bait: isBait(l), sqm: isSqmMislabeled(l), corrupt: reasons.length > 0, reasons };
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}
