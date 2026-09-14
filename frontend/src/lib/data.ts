import { api, qs } from "./api";
import type { Listing, Locality, Page, Project, Rental } from "./types";

export const PAGE_SIZE = 50;

export type ListingFilters = {
  locality?: string | undefined;
  bhk?: number | undefined;
  property_type?: string | undefined;
  min_price?: number | undefined;
  max_price?: number | undefined;
  furnishing?: string | undefined;
};

/** Filters the rentals endpoint actually honours server-side. */
export type RentalFilters = {
  locality?: string | undefined;
  bhk?: number | undefined;
  furnishing?: string | undefined;
};

export function fetchListings(offset: number, filters: ListingFilters = {}, limit = PAGE_SIZE) {
  return api<Page<Listing>>(
    `/v1/listings${qs({
      limit,
      offset,
      locality: filters.locality,
      bhk: filters.bhk,
      property_type: filters.property_type,
      min_price: filters.min_price,
      max_price: filters.max_price,
      furnishing: filters.furnishing,
    })}`,
  );
}

export function fetchListing(id: string) {
  return api<Listing>(`/v1/listings/${encodeURIComponent(id)}`);
}

/**
 * Rentals: locality/bhk/furnishing filter server-side; price bounds are
 * silently ignored by the API, so the page filters price client-side.
 */
export function fetchRentals(offset: number, filters: RentalFilters = {}, limit = PAGE_SIZE) {
  return api<Page<Rental>>(
    `/v1/rentals${qs({
      limit,
      offset,
      locality: filters.locality,
      bhk: filters.bhk,
      furnishing: filters.furnishing,
    })}`,
  );
}

export function fetchRental(id: string) {
  return api<Rental>(`/v1/rentals/${encodeURIComponent(id)}`);
}

export function fetchProjects(offset: number, limit = PAGE_SIZE) {
  return api<Page<Project>>(`/v1/projects${qs({ limit, offset })}`);
}

export function fetchProject(id: string) {
  return api<Project>(`/v1/projects/${encodeURIComponent(id)}`);
}

export function fetchLocalities() {
  return api<{ city: string; count: number; results: Locality[] }>("/v1/localities");
}

/** Page until has_more === false. `total` is unreliable and never used. */
export async function fetchAllListings(onProgress?: (loaded: number) => void): Promise<Listing[]> {
  const all: Listing[] = [];
  let offset = 0;
  for (let guard = 0; guard < 400; guard++) {
    const page = await fetchListings(offset, {}, PAGE_SIZE);
    all.push(...page.results);
    onProgress?.(all.length);
    if (!page.has_more || page.results.length === 0) break;
    offset += page.results.length;
  }
  return all;
}

export async function fetchAllProjects(): Promise<Project[]> {
  const all: Project[] = [];
  let offset = 0;
  for (let guard = 0; guard < 100; guard++) {
    const page = await fetchProjects(offset, PAGE_SIZE);
    all.push(...page.results);
    if (!page.has_more || page.results.length === 0) break;
    offset += page.results.length;
  }
  return all;
}

/** Fetch every rental using parallel offset windows (price filters need all records). */
export async function fetchAllRentals(onProgress?: (loaded: number) => void): Promise<Rental[]> {
  const first = await fetchRentals(0);
  if (!first.has_more || first.results.length === 0) return first.results;

  const chunks: Rental[][] = [first.results];
  const countLoaded = () => chunks.reduce((n, c) => n + c.length, 0);
  onProgress?.(countLoaded());

  // `total` under-reports, so page forward in parallel batches until a window
  // comes back empty or has_more flips false.
  let offset = first.results.length;
  let more = true;
  for (let guard = 0; guard < 100 && more; guard++) {
    const batch: Promise<Page<Rental>>[] = [];
    for (let i = 0; i < 6; i++) {
      batch.push(fetchRentals(offset));
      offset += PAGE_SIZE;
    }
    const pages = await Promise.all(batch);
    for (const p of pages) {
      chunks.push(p.results);
      if (p.results.length === 0 || !p.has_more) more = false;
    }
    onProgress?.(countLoaded());
  }

  const seen = new Set<string>();
  return chunks.flat().filter((r) => (seen.has(r.listing_id) ? false : seen.add(r.listing_id)));
}

const CACHE_KEY = "ivy.dataset.v1";
const CACHE_TTL = 1000 * 60 * 60 * 6;

type CachedDataset = { at: number; listings: Listing[]; projects: Project[] };

export function readCachedDataset(): CachedDataset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDataset;
    if (!parsed?.listings?.length) return null;
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedDataset(listings: Listing[], projects: Project[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), listings, projects }));
  } catch {
    /* quota — fine, insights just refetch next time */
  }
}

export function clearCachedDataset() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}
