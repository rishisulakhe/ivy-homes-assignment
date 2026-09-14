import { Link } from "@tanstack/react-router";
import { BedDouble, MapPin, Maximize, Wallet } from "lucide-react";
import { PropertyMedia } from "@/components/PropertyMedia";
import { Chip, LiveChip } from "@/components/Chips";
import { formatINR, formatINRFull, formatNumber, relativeDate, titleCase } from "@/lib/format";
import type { Rental } from "@/lib/types";

export function RentalCard({ rental, index = 0 }: { rental: Rental; index?: number }) {
  return (
    <article
      className="stagger-in card-lift overflow-hidden rounded-2xl border border-border bg-card"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      <Link to="/rentals/$id" params={{ id: rental.listing_id }} className="block">
        <PropertyMedia seed={rental.listing_id} className="h-44 w-full">
          <div className="absolute left-4 top-4">
            <LiveChip live={rental.is_live} />
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <p className="font-display text-2xl font-semibold text-white drop-shadow">
              {formatINRFull(rental.price)}
              <span className="ml-1 text-sm font-medium text-white/85">/month</span>
            </p>
          </div>
        </PropertyMedia>

        <div className="p-5">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {rental.title ? rental.title : titleCase(rental.apartment_name)}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" strokeWidth={1.8} />
            {titleCase(rental.locality)}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="size-4" strokeWidth={1.8} />
              {rental.bedroom} BHK
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Maximize className="size-4" strokeWidth={1.8} />
              {formatNumber(rental.carpet_area)} sqft
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-4" strokeWidth={1.8} />
              {formatINR(rental.deposit)} deposit
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip>{titleCase(rental.furnishing)}</Chip>
            {rental.maintenance ? (
              <Chip tone="brass">+{formatINRFull(rental.maintenance)} upkeep</Chip>
            ) : null}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Listed {relativeDate(rental.posted_at)}
          </p>
        </div>
      </Link>
    </article>
  );
}
