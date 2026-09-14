import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { titleCase } from "@/lib/format";
import type { Locality } from "@/lib/types";
import { cn } from "@/lib/utils";

export type FilterState = {
  locality: string;
  bhk: number | null;
  property_type: string;
  furnishing: string;
  min_price: string;
  max_price: string;
};

export const EMPTY_FILTERS: FilterState = {
  locality: "",
  bhk: null,
  property_type: "",
  furnishing: "",
  min_price: "",
  max_price: "",
};

export const SORTS = [
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "area_desc", label: "Largest area" },
  { value: "area_asc", label: "Smallest area" },
  { value: "newest", label: "Newest first" },
  { value: "bedroom_desc", label: "Most bedrooms" },
] as const;

const PRICE_QUICK = [
  { label: "₹1 Cr", value: 10000000 },
  { label: "₹2 Cr", value: 20000000 },
  { label: "₹3.5 Cr", value: 35000000 },
  { label: "₹5 Cr", value: 50000000 },
];

export function FilterPanel({
  value,
  onChange,
  onReset,
  localities,
  showPropertyType = true,
  priceLabel = "Price range (₹)",
  quickPrices = PRICE_QUICK,
  priceNote,
  sort,
  onSortChange,
  resultLabel,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  localities: Locality[];
  showPropertyType?: boolean;
  priceLabel?: string;
  quickPrices?: { label: string; value: number }[];
  priceNote?: string | undefined;
  sort: string;
  onSortChange: (s: string) => void;
  resultLabel: string;
}) {
  const set = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const active =
    !!value.locality ||
    value.bhk !== null ||
    !!value.property_type ||
    !!value.furnishing ||
    !!value.min_price ||
    !!value.max_price;

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="grid gap-5 lg:grid-cols-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Locality</Label>
          <Select
            value={value.locality || "all"}
            onValueChange={(v) => set({ locality: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All localities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All localities</SelectItem>
              {localities.map((l) => (
                <SelectItem key={l.locality} value={l.locality}>
                  {titleCase(l.locality)} ({l.listing_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Configuration
          </Label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((b) => (
              <button
                key={b}
                onClick={() => set({ bhk: value.bhk === b ? null : b })}
                className={cn(
                  "h-9 min-w-11 rounded-full border px-3 text-sm font-medium transition-colors",
                  value.bhk === b
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-secondary",
                )}
              >
                {b} BHK
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Furnishing
          </Label>
          <Select
            value={value.furnishing || "all"}
            onValueChange={(v) => set({ furnishing: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any furnishing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any furnishing</SelectItem>
              <SelectItem value="unfurnished">Unfurnished</SelectItem>
              <SelectItem value="semi-furnished">Semi-furnished</SelectItem>
              <SelectItem value="fully-furnished">Fully furnished</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showPropertyType ? (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Property type
            </Label>
            <Select
              value={value.property_type || "all"}
              onValueChange={(v) => set({ property_type: v === "all" ? "" : v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any type</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="villa">Villa</SelectItem>
                <SelectItem value="independent house">Independent house</SelectItem>
                <SelectItem value="builder floor">Builder floor</SelectItem>
                <SelectItem value="plot">Plot</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sort</Label>
            <Select value={sort} onValueChange={onSortChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5 border-t border-border pt-5 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {priceLabel}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              placeholder="Min"
              value={value.min_price}
              onChange={(e) => set({ min_price: e.target.value.replace(/\D/g, "") })}
            />
            <span className="text-muted-foreground">—</span>
            <Input
              inputMode="numeric"
              placeholder="Max"
              value={value.max_price}
              onChange={(e) => set({ max_price: e.target.value.replace(/\D/g, "") })}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {quickPrices.map((q) => (
              <button
                key={q.label}
                onClick={() => set({ max_price: String(q.value) })}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Under {q.label}
              </button>
            ))}
          </div>
          {priceNote && (value.min_price || value.max_price) ? (
            <p className="text-xs text-muted-foreground">{priceNote}</p>
          ) : null}
        </div>

        {showPropertyType ? (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sort by</Label>
            <Select value={sort} onValueChange={onSortChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="size-4" strokeWidth={1.8} />
            {resultLabel}
          </p>
          {active && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <X className="size-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <SlidersHorizontal className="size-3.5" />
        Sorting and refinements beyond the API's abilities are computed on loaded results.
      </p>
    </div>
  );
}

export function sortItems<
  T extends { price: number; carpet_area: number; bedroom: number; posted_at?: string | undefined },
>(items: T[], sort: string, areaOf: (t: T) => number = (t) => t.carpet_area): T[] {
  const arr = [...items];
  switch (sort) {
    case "price_asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price_desc":
      return arr.sort((a, b) => b.price - a.price);
    case "area_desc":
      return arr.sort((a, b) => areaOf(b) - areaOf(a));
    case "area_asc":
      return arr.sort((a, b) => areaOf(a) - areaOf(b));
    case "bedroom_desc":
      return arr.sort((a, b) => b.bedroom - a.bedroom);
    case "newest":
      return arr.sort(
        (a, b) => new Date(b.posted_at ?? 0).getTime() - new Date(a.posted_at ?? 0).getTime(),
      );
    default:
      return arr;
  }
}
