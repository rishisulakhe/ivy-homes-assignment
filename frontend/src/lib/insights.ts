/**
 * Insights computations — all client-side, because /v1/analytics/summary
 * does not exist. Every number here is derived from the full dataset with
 * the unit and quality corrections this project documented.
 */
import { BAIT_NUMBERS, effectiveAreaSqft, isSqmMislabeled, corruptionReasons, duplicateKey } from "./quality";
import type { Listing, Project } from "./types";
import { median } from "./quality";

export type NamedCount = { name: string; count: number };

export function countBy<T>(items: T[], keyOf: (t: T) => string): NamedCount[] {
  const m = new Map<string, number>();
  for (const item of items) {
    const k = keyOf(item);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export type LocalityStat = {
  locality: string;
  count: number;
  medianPrice: number;
  medianPsf: number;
};

export function localityStats(listings: Listing[]): LocalityStat[] {
  const groups = new Map<string, Listing[]>();
  for (const l of listings) {
    const arr = groups.get(l.locality) ?? [];
    arr.push(l);
    groups.set(l.locality, arr);
  }
  return Array.from(groups.entries())
    .map(([locality, rows]) => {
      const honest = rows.filter(
        (r) => r.price > 0 && !isSqmMislabeled(r) && r.carpet_area > 0,
      );
      return {
        locality,
        count: rows.length,
        medianPrice: median(rows.map((r) => r.price).filter((p) => p > 0)),
        medianPsf: honest.length
          ? median(honest.map((r) => r.price / effectiveAreaSqft(r)))
          : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export type PsfBucket = { bucket: string; count: number };

/** Price/sqft histogram over sane records, with sqm areas corrected. */
export function psfHistogram(listings: Listing[], bucketSize = 5000): PsfBucket[] {
  const values = listings
    .filter((l) => l.price > 0 && l.carpet_area > 0)
    .map((l) => l.price / effectiveAreaSqft(l))
    .filter((v) => v > 2000 && v < 80000); // drop corrupt tails so bins stay readable
  const buckets = new Map<number, number>();
  for (const v of values) {
    const b = Math.floor(v / bucketSize) * bucketSize;
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([b, count]) => ({
      bucket: `${Math.round(b / 1000)}k`,
      count,
    }));
}

export type QualitySummary = {
  records: number;
  uniqueHomes: number;
  duplicateRecords: number;
  liveCount: number;
  offlineCount: number;
  corruptCount: number;
  corruptByReason: NamedCount[];
  corruptSamples: { id: string; reasons: string[] }[];
  baitCount: number;
  baitNumbers: { number: string; count: number }[];
  sqmCount: number;
  sqmMedianPsfRaw: number;
  sqmMedianPsfCorrected: number;
  wrongCountProjects: number;
  totalProjects: number;
  reversedPriceProjects: string[];
};

export function qualitySummary(listings: Listing[], projects: Project[]): QualitySummary {
  const keys = new Set<string>();
  let liveCount = 0;
  let sqmCount = 0;
  const corruptSamples: { id: string; reasons: string[] }[] = [];
  const reasonCounts = new Map<string, number>();
  const baitCounts = new Map<string, number>();
  const sqmRaw: number[] = [];
  const sqmCorrected: number[] = [];

  for (const l of listings) {
    keys.add(duplicateKey(l));
    if (l.is_live) liveCount++;
    if (isSqmMislabeled(l)) {
      sqmCount++;
      if (l.price > 0 && l.carpet_area > 0) {
        sqmRaw.push(l.price / l.carpet_area);
        sqmCorrected.push(l.price / effectiveAreaSqft(l));
      }
    }
    const reasons = corruptionReasons(l);
    if (reasons.length > 0) {
      corruptSamples.push({ id: l.listing_id, reasons });
      for (const r of reasons) reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
    }
    if (l.posted_by_contact && BAIT_NUMBERS.has(l.posted_by_contact.trim())) {
      baitCounts.set(l.posted_by_contact.trim(), (baitCounts.get(l.posted_by_contact.trim()) ?? 0) + 1);
    }
  }

  // A project's advertised total_listings tracks live listings; flag every
  // project where even that doesn't hold.
  const byProject = new Map<string, number>();
  for (const l of listings) {
    if (!l.project_id) continue;
    byProject.set(l.project_id, (byProject.get(l.project_id) ?? 0) + 1);
  }
  let wrongCountProjects = 0;
  for (const p of projects) {
    const actual = byProject.get(p.project_id) ?? 0;
    if ((p.total_listings ?? 0) !== actual) wrongCountProjects++;
  }

  const reversedPriceProjects = projects
    .filter(
      (p) =>
        p.price_min !== undefined &&
        p.price_max !== undefined &&
        p.price_min !== null &&
        p.price_max !== null &&
        p.price_min > p.price_max,
    )
    .map((p) => p.project_id);

  return {
    records: listings.length,
    uniqueHomes: keys.size,
    duplicateRecords: listings.length - keys.size,
    liveCount,
    offlineCount: listings.length - liveCount,
    corruptCount: corruptSamples.length,
    corruptByReason: Array.from(reasonCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    corruptSamples: corruptSamples.slice(0, 12),
    baitCount: Array.from(baitCounts.values()).reduce((a, b) => a + b, 0),
    baitNumbers: Array.from(baitCounts.entries())
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count),
    sqmCount,
    sqmMedianPsfRaw: median(sqmRaw),
    sqmMedianPsfCorrected: median(sqmCorrected),
    wrongCountProjects,
    totalProjects: projects.length,
    reversedPriceProjects,
  };
}

export function medianPriceByBhk(listings: Listing[]): NamedCount[] {
  const groups = new Map<number, number[]>();
  for (const l of listings) {
    if (l.price <= 0) continue;
    const arr = groups.get(l.bedroom) ?? [];
    arr.push(l.price);
    groups.set(l.bedroom, arr);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bhk, prices]) => ({
      name: bhk === 0 ? "Plot" : `${bhk} BHK`,
      count: Math.round(median(prices)),
    }));
}
