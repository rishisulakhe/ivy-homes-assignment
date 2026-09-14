import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, LogOut, Menu, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSaved } from "@/lib/saved";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/listings", label: "Buy" },
  { to: "/rentals", label: "Rent" },
  { to: "/projects", label: "Projects" },
  { to: "/insights", label: "Insights" },
] as const;

export function Header() {
  const { email, me, signOut } = useAuth();
  const { ids } = useSaved();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-border/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/listings" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4.5" strokeWidth={1.8} />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tracking-tight">
              Ivy Homes
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {me?.city ? me.city : "Mumbai"}
            </span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/saved"
            className="relative hidden items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-secondary sm:inline-flex"
            activeProps={{ className: "bg-secondary" }}
          >
            <Heart className="size-4" strokeWidth={1.8} />
            Saved
            {ids.size > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                {ids.size}
              </span>
            )}
          </Link>

          {email ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="max-w-[150px] truncate text-sm text-muted-foreground">{email}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                onClick={() => {
                  signOut();
                  void navigate({ to: "/login" });
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid overflow-hidden border-t border-border/70 transition-all duration-300 md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr] border-transparent",
        )}
      >
        <div className="min-h-0">
          <nav className="flex flex-col p-3">
            {[...NAV, { to: "/saved", label: "Saved" } as const].map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            {email ? (
              <button
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-secondary"
                onClick={() => {
                  setOpen(false);
                  signOut();
                  void navigate({ to: "/login" });
                }}
              >
                Sign out ({email})
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
