import { Link } from "@tanstack/react-router";
import { Building2, MapPin, Maximize } from "lucide-react";
import { PropertyMedia } from "@/components/PropertyMedia";
import { Chip } from "@/components/Chips";
import { formatINR, formatNumber, titleCase } from "@/lib/format";
import type { Project } from "@/lib/types";

export function projectPriceRange(p: Project) {
  const min = p.price_min !== undefined && p.price_min !== null ? p.price_min * 1e7 : null;
  const max = p.price_max !== undefined && p.price_max !== null ? p.price_max * 1e7 : null;
  return { min, max, swapped: min !== null && max !== null && min > max };
}

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const { min, max, swapped } = projectPriceRange(project);
  const lo = swapped ? max : min;
  const hi = swapped ? min : max;

  return (
    <article
      className="stagger-in card-lift overflow-hidden rounded-2xl border border-border bg-card"
      style={{ animationDelay: `${Math.min(index, 11) * 45}ms` }}
    >
      <Link to="/projects/$id" params={{ id: project.project_id }} className="block">
        <PropertyMedia seed={project.project_id} className="h-40 w-full">
          <div className="absolute bottom-4 left-4 right-4">
            <p className="font-display text-xl font-semibold text-white drop-shadow">
              {lo !== null ? formatINR(lo) : "—"}
              {hi !== null ? ` – ${formatINR(hi)}` : ""}
            </p>
          </div>
        </PropertyMedia>
        <div className="p-5">
          <h3 className="truncate text-base font-semibold tracking-tight">
            {titleCase(project.apartment_name)}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">by {project.developer_name ?? "—"}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" strokeWidth={1.8} />
            {titleCase(project.locality)}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip tone="primary">{titleCase(project.project_status)}</Chip>
            {project.total_units ? (
              <Chip>
                <Building2 className="size-3.5" strokeWidth={2} />
                {formatNumber(project.total_units)} units
              </Chip>
            ) : null}
            {project.min_area_sqft ? (
              <Chip>
                <Maximize className="size-3.5" strokeWidth={2} />
                {formatNumber(project.min_area_sqft)}–{formatNumber(project.max_area_sqft)} sqft
              </Chip>
            ) : null}
            {swapped ? <Chip tone="warning">Price range reversed in source</Chip> : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
